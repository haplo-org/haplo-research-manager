/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */

/*

    Project dates are integrated into the project journal because they're closely related,
    and need to be displayed in the same UI.

    Look at comments next to the code for details.

    ProjectDateList, obtained by "hres:project_journal:dates" service for a project,
    contains zero or more named ProjectDate objects.

    Update the list entries, then call requestUpdatesThenCommitIfChanged() to commit,
    which will ask other plugins to recalculate other dates.

    Use the hresProjectDates feture to register a date, eg:

        P.hresProjectDates.register({
            date({
                name: "start",
                sort: 0,
                displayName: "Start of project",
                categories: [
                    "hres_projects:ALL"
                ]
            });
        });

    See code for additional properties this might take.

    Use "hres:project_journal:dates:ui:overview" to for displaying dates UI.

    When making a prediction for a date, it may be useful to gather additional data.
    The journal helps! "hres:project_journal:dates:scheduled_data:set" and
    "hres:project_journal:dates:scheduled_data:get" provide a convenient place to
    store this data, and you can implement "hres:project_journal:dates:get_form_instance_for_scheduled_date_extra_data:NAME"
    to add an additional form to the scheduled date editor to gather this info.

*/

// --------------------------------------------------------------------------

P.db.table("dates", {
    project:        {type:"ref", indexed:true, indexedWith:["updated"]},
    updated:        {type:"datetime"},
    user:           {type:"user"},          // which user caused the update
    reason:         {type:"json"},          // why change was made, "action" property says why.
                                            //    Action strings should be namespaced.
    dates:          {type:"json"}           // encoded dates
});

// Generic dumping ground for additional data stored for scheduled dates
P.db.table("datesScheduledData", {
    project:        {type:"ref", indexed:true},
    name:           {type:"text"},
    data:           {type:"json"}
});

// --------------------------------------------------------------------------

// date definition has properties:
//   name - URL compatible internal identifier for the date
//   sort - sort order for display, lowest displayed first
//   displayName - for UI
//   categories - Array of strings describing which projects the date applies to (by default)
//                use an empty array for dates that should only be displayed in the UI if they are not undefined
//   editRequired - function(action) - passes in Action for editing required date (optional)
//   editScheduledActual - function(action) - passes in Action for editing scheduled and actual dates (optional)

var dateDefinitions;
var dateDefinitionsSorted;
var registerDateDefinition = P.registerDateDefinition = function(defn) {
    var d = P.dateDefinitions || {},
        dKind = P.dateDefinitionsKind || {};
    if(!("name" in defn)) { throw new Error("Project date definition must have a name"); }
    if(!defn.categories) { throw new Error("Project date definition must have categories array"); }
    if(defn.name in d) { throw new Error("Project date "+defn.name+" has already been defined"); }
    d[defn.name] = defn;
    dKind['PDATE:'+defn.name] = defn; // for PDATE:name lookups
    dateDefinitionsSorted = _.sortBy(_.values(d), "sort");
    dateDefinitions = P.dateDefinitions = d;
    P.dateDefinitionsKind = dKind;
    
    ['editRequired', 'editScheduledActual'].forEach(function(editProperty) {
        var action = O.action(getEditActionApiCode(editProperty, defn.name)).
            title('Can edit the '+defn.displayName+' project date - '+editProperty+' property').
            allow('hres:project_journal:action', "hres_project_journal:dates:edit_all_dates");
        if(!!defn[editProperty]) {
            defn[editProperty](action);
        }
    });
};

P.provideFeature("hres_project_journal:dates", function(plugin) {
    
    plugin.hresProjectDates = {
        register: registerDateDefinition
    };

});

P.validateDateName = function(name) {
    return decodeURIComponent(name) in dateDefinitions;
};

P.dateDefinition = function(name) {
    return dateDefinitions[name];
};

var jsDateIsEqual = function(date1, date2) {
    return date1.getTime() === date2.getTime();
};

// --------------------------------------------------------------------------
// Edit actions can be added to via the action argument passed to editScheduledActual and editRequired
// in the date definition, or can be managed pluggably using the action directly

var getEditActionApiCode = P.getEditActionApiCode = function(editProperty, name) {
    return "hres:project_journal:dates:"+editProperty+":"+name;
};

var makeEditableGetter = function(editProperty) {
    return function() {
        var action = getEditActionApiCode(editProperty, this.name);
        return O.currentUser.allowed(O.action(action)); 
    };
};

var canAdministerAllDates = P.canAdministerAllDates = O.action("hres_project_journal:dates:edit_all_dates").
        title("Can edit all project dates");

P.implementService("std:action:check:hres:project_journal:action", function(user, otherAction) {
    return user.allowed(O.action(otherAction));
});

// --------------------------------------------------------------------------

var ProjectDateList = P.ProjectDateList = function(ref, serialised) {
    var projectDateList = this;
    this.ref = ref;
    var list = this.list = [];
    var lookup = this.$lookup = {};
    if(serialised.version !== 0) { throw new Error("Unknown dates serialised version"); }
    serialised.dates.forEach(function(d) {
        var date = new ProjectDate(projectDateList, d);
        list.push(date);
        lookup[date.name] = date;
    });
};

// --------------------------------------------------------------------------

// Public API

// list property

ProjectDateList.prototype.date = function(name) {
    var date = this.$lookup[name];
    if(!date) {
        if(!(name in dateDefinitions)) { throw new Error("Project date "+name+" has not been declared by any plugin"); }
        date = ProjectDate.unassigned(this, name);
        this.list.push(date);
        this.$lookup[name] = date;
    }
    return date;
};

ProjectDateList.prototype.__defineGetter__("changed", function() {
    for(var i = this.list.length-1; i >= 0; --i) {
        if(this.list[i].changed) {
            return true;
        }
    }
    return false;
});

ProjectDateList.prototype.dateHasChanged = function(name) {
    var date = this.$lookup[name];
    return date && date.changed;
};

ProjectDateList.prototype.changedDates = function() {
    var changed = [];
    this.list.forEach(function(date) {
        if(date.changed) { changed.push(date.name); }
    });
    return changed;
};

// Return sorted dates
ProjectDateList.prototype.datesForDisplay = function() {
    var projectDateList = this;
    var display = [];
    var lookup = this.$lookup;
    var that = this;
    dateDefinitionsSorted.forEach(function(defn) {
        var d = lookup[defn.name];
        if(!d) {
            var pCat = O.serviceMaybe("hres:project_journal:categories_for_project", that.ref);
            if(_.intersection(pCat, defn.categories).length) {
                d = ProjectDate.unassigned(this, defn.name);
            }
        }
        if(d) {
            d.$displayName = defn.displayName; // might as well fill it in now
            display.push(d);
        }
    });
    return display;
};

// reason describes why this change was made in a structured manner, will be used for
// displaying history later.
ProjectDateList.prototype.requestUpdatesThenCommitIfChanged = function(reason) {
    this.requestUpdates();
    this._commit(reason, false);
    return this;
};

ProjectDateList.prototype.requestUpdates = function() {
    O.serviceMaybe("hres:project_journal:dates:request_update", this.ref, this);
    return this;
};

// For API consumers to keep state between request_update and commit services.
// Use namespaced keys.
ProjectDateList.prototype.property = function(key, value) {
    var properties = this.$properties;
    if(!properties) { properties = this.$properties = {}; }
    if(arguments.length === 1) {
        return properties[key];
    } else {
        properties[key] = value;
    }
};

// --------------------------------------------------------------------------

ProjectDateList.prototype._commit = function(reason, commitEvenIfUnchanged) {
    if(!(commitEvenIfUnchanged || this.changed || this.$journalUpdates)) { return; }

    if(!reason || !reason.action) { throw new Error("reason must include an action property"); }

    var dates = [];
    this.list.forEach(function(d) {
        var serialised = d._serialisedForm();
        if(serialised) { dates.push(serialised); }
    });

    P.db.dates.create({
        project: this.ref,
        updated: new Date(),
        user: O.currentUser,
        reason: reason,
        dates: {version:0, dates:dates}
    }).save();

    if(this.$commitFns) {
        this.$commitFns.forEach(function(fn) { fn(); });
        delete this.$commitFns;
    }

    // For information only, implementing plugins should not use it to make changes in Project Dates
    // or Journal entries
    O.serviceMaybe("hres:project_journal:dates:notify:commit", this.ref, this, reason);
    return this;
};

ProjectDateList.prototype._pushCommitFn = function(fn) {
    if(!this.$commitFns) { this.$commitFns = []; }
    this.$commitFns.push(fn);
};

// --------------------------------------------------------------------------

var dateFromSerialised = function(value) {
    return (value === null) ? null : new Date(value);
};
var dateToSerialised = function(date) {
    return (date === null) ? null : date.getTime();
};

// --------------------------------------------------------------------------

var ProjectDate = function(list, d) {
    this.$list = list;
    this.name = d[0];
    this.requiredMin = dateFromSerialised(d[1]);
    this.requiredMax = dateFromSerialised(d[2]) || this.requiredMin; // always have a range even if zero length
    this.requiredIsFixed = d[3];
    this.scheduled = dateFromSerialised(d[4]);
    this.actual = dateFromSerialised(d[5]);
    this.actualIndex = d[6];
    this.changed = false;
};
// Serialised form is [name, requiredMin, requiredMax, requiredIsFixed, scheduled, actual, actualIndex]
ProjectDate.unassigned = function(list, name) {
    return new ProjectDate(list, [name, null, null, false, null, null, 0]);
};
ProjectDate.prototype._serialisedForm = function() {
    if(!(this.actual || this.scheduled || this.requiredMin || this.actualIndex)) { return; }
    var dmin = dateToSerialised(this.requiredMin),
        dmax = dateToSerialised(this.requiredMax);
    return [
        this.name,
        dmin,
        (dmax === dmin) ? null : dmax,
        this.requiredIsFixed,
        dateToSerialised(this.scheduled),
        dateToSerialised(this.actual),
        this.actualIndex
    ];
};

// --------------------------------------------------------------------------

// Public API

// Properties: (ALL READ ONLY, use functions to mutate)
//   name
//   changed - set to true when changed
//   displayName
//   requiredMin, requiredMax -- calculated/edited dates, (may be null)
//      set with setRequiredCalculated() or setRequiredFixed()
//      cleared with clearRequired()
//   requiredIsFixed -- has been edited and therefore fixed?
//      choice of fn to set requiredMin&Max determined determines flag
//   scheduled -- a scheduled date (may be null)
//      set with setScheduled(), clear with clearScheduled()
//   actual -- the date when it actual (may be null)
//      set with setActual(), clear with clearActual()
//   actualIndex -- index of actual for repeating events (initialised to 0 for first occurance)
//      use nextOccurrence() to increment and set for the next occurance
//      (noop if there isn't an actual date)
//   latestActual -- most recent actual date (may be null)

ProjectDate.prototype.setRequiredCalculated = function(min, max) {
    if(this.requiredIsFixed) {
        throw new Error("Can't required dates when they've been fixed");
    }
    return this._setRequired(min, max, false);
};

ProjectDate.prototype.setRequiredFixed = function(min, max) {
    return this._setRequired(min, max, true);
};

ProjectDate.prototype.clearRequired = function() {
    if(!this.requiredMin) { return this; }  // noop if there isn't a required date
    this.requiredMin = null;
    this.requiredMax = null;
    this.requiredIsFixed = false;
    this.changed = true;
    return this;
};

ProjectDate.prototype.setScheduled = function(date) {
    return this._setPointInTime("scheduled", date);
};

ProjectDate.prototype.clearScheduled = function() {
    return this._clearPointInTime("scheduled");
};

ProjectDate.prototype.setActual = function(date) {
    this._setPointInTime("actual", date);
    if(this.changed) {
        var d = this;
        // Use the current index, as nextOcurrence can update it before the commitFn is run
        var currentIndex = d.actualIndex;
        this.$list._pushCommitFn(function() {
            O.service("hres:project_journal:save", {
                project: d.$list.ref,
                kind: 'PDATE:'+d.name,
                implementation: 'PDATE',
                datetime: date,
                user: O.currentUser,        // TODO: Should this really just use the current user?
                identifier: ""+currentIndex
            });
        });
    }
    return this;
};

ProjectDate.prototype.clearActual = function() {
    return this._clearPointInTime("actual");
};

ProjectDate.prototype.nextOccurrence = function(date) {
    if(!this.actual) { return this; } // noop if there isn't an actual date
    this.requiredMin = null;
    this.requiredMax = null;
    this.requiredIsFixed = false;
    this.scheduled = null;
    this.$latestActual = this.actual;
    this.actual = null;
    this.actualIndex = this.actualIndex + 1;
    this.changed = true;
    var d = this;
    this.$list._pushCommitFn(function() {
        // Clean up any scheduled data when this is committed
        P.db.datesScheduledData.select().
            where("project","=",d.$list.ref).
            where("name","=",d.name).
            deleteAll();
    });
    return this;
};

// Input to date calculations, or undefined if none available
// Calculation engine only accepts fixed dates as inputs
ProjectDate.prototype.getDatesForCalculations = function() {
    var d = {};
    if(this.actual) {
        d = {
            min: this.actual,
            max: this.actual
        };
    } else if(this.requiredIsFixed) {
        d = {
            min: this.requiredMin,
            max: this.requiredMax || this.requiredMin
        };
    }
    if(this.actualIndex > 0) {
        // "previous" is clearer for use in calculations, as the
        // ProjectDateList may not be committed when this function is called
        d.previousActual = this.latestActual;
    }
    return d;
};

ProjectDate.prototype.__defineGetter__("hasDate", function() {
    return !!(this.actual || this.scheduled || this.requiredMin);
});

ProjectDate.prototype.__defineGetter__("hasDateForCalculations", function() {
    // has dates if actual or required dates are set, or it's not the first occurance
    return !!(this.actual || this.requiredMin || (this.actualIndex > 0));
});

ProjectDate.prototype.__defineGetter__("previousActuals", function() {
    if(this.actualIndex === 0) { return []; }   // don't do a database lookup
    if(this.$previousActuals) { return this.$previousActuals; }
    var previous = [];
    var date = this;
    _.each(P.db.journal.select().
        order("datetime").
        where("project","=",date.$list.ref).
        where("kind","=","PDATE:"+date.name), function(row) {
            var index = parseInt(row.identifier,10);
            if((index < 0) || (index > 1000)) { throw new Error("Unexpected index in implementation"); }
            previous[index] = row.datetime;
    });
    this.$previousActuals = previous;
    return previous;
});

ProjectDate.prototype.__defineGetter__("latestActual", function() {
    // this.$latestActual is used so the getter returns the correct date when nextOccurrence() is called,
    // as this.actual is set to null, but this.previousActuals is only updated with a commit
    return this.actual || this.$latestActual ||
            ((this.actualIndex > 0) ?
                this.previousActuals[this.previousActuals.length-1] :
                null);
});

ProjectDate.prototype.__defineGetter__("isInstantaneous", function() {
    return !!(this.actual || this.scheduled || (this.requiredMin && jsDateIsEqual(this.requiredMin, this.requiredMax)));
});

ProjectDate.prototype.__defineGetter__("requiredIsInstantaneous", function() {
    return !!(this.requiredMin && jsDateIsEqual(this.requiredMin, this.requiredMax));
});

ProjectDate.prototype.__defineGetter__("isRequiredEditableByCurrentUser", makeEditableGetter('editRequired'));

ProjectDate.prototype.__defineGetter__("isScheduledActualEditableByCurrentUser", makeEditableGetter('editScheduledActual'));

ProjectDate.prototype.__defineGetter__("displayName", function() {
    var n = this.$displayName;
    if(!n) {
        var defn = dateDefinitions[this.name];
        this.$displayName = n = (defn ? defn.displayName : this.name);
    }
    return n;
});

// --------------------------------------------------------------------------

ProjectDate.prototype._setRequired = function(min, max, fixed) {
    if(!(min instanceof Date)) { throw new Error("min argument must be a Date"); }
    if(!max) { max = min; } // default to zero length range
    else if(!(max instanceof Date)) { throw new Error("max argument must be a Date, undefined or null"); }
    if(max < min) { var t = max; max = min; min = t; }

    var changed = this.changed ||
            !this.requiredMin ||    // min is required to be defined above
            (this.requiredMin && !jsDateIsEqual(this.requiredMin, min)) ||
            (this.requiredMax && !jsDateIsEqual(this.requiredMax, max)) ||
            (this.requiredIsFixed != fixed);

    this.requiredMin = min;
    this.requiredMax = max;
    this.requiredIsFixed = fixed;
    this.changed = changed;
    return this;
};

ProjectDate.prototype._setPointInTime = function(property, date) {
    if(!(date instanceof Date)) { throw new Error("argument must be a Date"); }
    var changed = this.changed || !this[property] || !jsDateIsEqual(this[property], date);
    this[property] = date;
    this.changed = changed;
    return this;
};

ProjectDate.prototype._clearPointInTime = function(property) {
    if(!this[property]) { return this; } // noop if property is not set
    this[property] = null;
    this.changed = true;
    return this;
};

// --------------------------------------------------------------------------

P.implementService("hres:project_journal:dates", function(projectRef) {
    var d = P.db.dates.select().
        where("project","=",projectRef).
        order("updated",true).
        limit(1);
    return new ProjectDateList(projectRef, d.length ? d[0].dates : {version:0,dates:[]});
});

P.implementService("hres:project_journal:dates:scheduled_data:get", function(projectRef, name) {
    var p = P.db.datesScheduledData.select().where("project","=",projectRef).where("name","=",name);
    return p.length ? p[0].data : undefined;
});

P.implementService("hres:project_journal:dates:scheduled_data:set", function(projectRef, name, data) {
    var row, p = P.db.datesScheduledData.select().where("project","=",projectRef).where("name","=",name);
    if(p.length) {
        row = p[0];
    } else {
        row = P.db.datesScheduledData.create({project:projectRef, name:name});
    }
    row.data = data;
    row.save();
});
