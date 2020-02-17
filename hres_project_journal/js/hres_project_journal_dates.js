/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */

/*HaploDoc
node: /hres_project_journal/dates
title: Project dates integration
sort: 1
--

Project dates are integrated into the project journal because they're closely related, and need to be displayed in the same UI. \
This integration should be used only if the date in question is expected to happen for every project of the same type, or if the \
date has a deadline.

Look at comments next to the code for details.

@ProjectDateList@, obtained by @"hres:project_journal:dates"@ service for a project, contains zero or more named @ProjectDate@ objects.

Update the list entries, then call @requestUpdatesThenCommitIfChanged()@ to commit, which will ask other plugins to recalculate other dates.

Use the @hresProjectDates@ feature to register a date, eg:

<pre>
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
</pre>

See code for additional properties this might take.

Use @"hres:project_journal:dates:ui:overview"@ to for displaying dates UI.

When making a prediction for a date, it may be useful to gather additional data.
The journal helps! 
@"hres:project_journal:dates:scheduled_data:set"@ and @"hres:project_journal:dates:scheduled_data:get"@ provide a convenient place to store this data, and you can implement @"hres:project_journal:dates:get_form_instance_for_scheduled_date_extra_data:NAME"@ to add an additional form to the scheduled date editor to gather this info.

Alerts are project dates. They are related an existing project date. 
The first alerts for a project date should be given the name of the existing projecct date suffixed by @":alert"@
Subsequent alerts should have the suffixes @":alert:0"@, @":alert:1"@, @":alert:2"@ and so on 
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
//   notForDisplay - true or false. If true, will not be displayed on project dates page (optional)

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
    
    ['editRequired', 'editScheduledActual', 'editPreviousActual'].forEach(function(editProperty) {
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

var jsDateIsEqual = P.jsDateIsEqual = function(date1, date2) {
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

/*HaploDoc
node: /hres_project_journal/dates
sort: 25
--

h3. ProjectDateList public API

|date| function. Takes name of date, and returns a ProjectDate object (see below)|
|changed|set to true when any date in the list has changed|
|dateHasChanged|function. Takes name of date, and returns whether that date has changed|
|changedDates|function. Takes no argument and returns any dates that have been changed|
|datesForDisplay|function. Takes no argument, and returns a sorted list of ProjectDates options, with displayNames and alerts set. For displaying on projects|
|requestUpdatesThenCommitIfChanged|function. Takes one argument, a reason, with property "action" (set to a string explaining the action taken, such as "client-user-sync"). Updates project dates based on dates saved in the ProjectDatesList, and then saves if any changes have been made.|
|requestUpdate|function. Takes no argument. Requests updates to project dates based on dates saved in ProjectDateList object. Does not save the updated dates|

*/

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
        if(defn.notForDisplay) { return; } 
        var d = lookup[defn.name];
        if(!d) {
            var pCat = O.serviceMaybe("hres:project_journal:categories_for_project", that.ref);
            if(_.intersection(pCat, defn.categories).length) {
                d = ProjectDate.unassigned(this, defn.name);
            }
        }
        if(d) {
            d.$displayName = defn.displayName; // might as well fill it in now
            var alerts = [];
            if(lookup[defn.name+":alert"]) {
                alerts.push(lookup[defn.name+":alert"]);
                var i = 0;
                while(lookup[defn.name+":alert:"+i]) {
                    alerts.push(lookup[defn.name+":alert:"+i]);
                    i++;
                }
            }
            if(alerts.length) {
                d.alerts = alerts;
            }
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
/*HaploDoc
node: /hres_project_journal/dates
sort: 43
--

h3. ProjectDate public API

Properties of each project date: (ALL READ ONLY, use functions to mutate)

|name||
|changed|set to true when changed|
|displayName||
|requiredMin, requiredMax|calculated/edited dates, (may be null). Set with setRequiredCalculated() or setRequiredFixed(). Cleared with clearRequired()|
|requiredIsFixed|has been edited and therefore fixed? Choice of fn to set requiredMin&Max determines flag|
|scheduled|a scheduled date (may be null). Set with setScheduled(), clear with clearScheduled()|
|actual|the date when it actually happened (may be null). Set with setActual(), clear with clearActual()|
|actualIndex|index of actual for repeating events (initialised to 0 for first occurance). Use nextOccurrence() to increment and set for the next occurance. (noop if there isn't an actual date)|
|latestActual|most recent actual date (may be null)| 
|unfix|function. Takes no argument. Set requiredIsFixed to false. You probably don't want to use this|
|getDatesForCalculations|function. Takes no argument, returns an object suitable for an input to dates calculations, or undefined if there are no suitable input dates. Only fixed dates will be used as inputs|

*/
ProjectDate.prototype.setRequiredCalculated = function(min, max) {
    if(this.requiredIsFixed) {
        throw new Error("Can't set required dates when they've been fixed");
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

ProjectDate.prototype.unfix = function() {
    this.requiredIsFixed = false;
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
    this._clearPointInTime("actual");
    if(this.changed) {
        this.actualIndex = 0;
        var d = this;
        this.$list._pushCommitFn(function() {
            O.serviceMaybe("hres:project_journal:save_all_of_kind", {
                project: d.$list.ref,
                kind: 'PDATE:'+d.name,
                implementation: 'PDATE',
                entries: []
            });
        });
    }
    return this;
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

ProjectDate.prototype.unshiftActuals = function() {
    var dates = _.chain(arguments).
        compact().
        uniq(function(date) { return date.getTime(); }).
        sortBy(function(date) { return date.getTime(); }).
        value();
    if(dates.length < 1) { return this; } // noop
    this.changed = true;
    this.actualIndex += dates.length;
    this.previousActuals.unshift.apply(this.previousActuals,  dates);
    var d = this;
    this.$list._pushCommitFn(function() {
        _.each(P.db.journal.select().
            order("datetime").
            where("project","=",d.$list.ref).
            where("kind","=","PDATE:"+d.name), function(row) {
                var index = parseInt(row.identifier,10);
                if((index < 0) || (index > 1000)) { throw new Error("Unexpected index in implementation"); }
                row.identifier = ""+(index+dates.length);
                row.save();
        });
        _.each(dates, function(date, index) {
            O.service("hres:project_journal:save", {
                project: d.$list.ref,
                kind: 'PDATE:'+d.name,
                implementation: 'PDATE',
                datetime: date,
                user: O.currentUser,        // TODO: Should this really just use the current user?
                identifier: ""+index
            });
        });
    });
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
        d.previousActuals = this.previousActuals;
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
    if(this.$previousActuals) { return this.$previousActuals; }
    var previous = this.$previousActuals = [];
    if(this.actualIndex === 0) { return previous; }   // don't do a database lookup
    var date = this;
    _.each(P.db.journal.select().
        order("datetime").
        where("project","=",date.$list.ref).
        where("kind","=","PDATE:"+date.name), function(row) {
            var index = parseInt(row.identifier,10);
            if((index < 0) || (index > 1000)) { throw new Error("Unexpected index in implementation"); }
            previous[index] = row.datetime;
    });
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

ProjectDate.prototype.__defineGetter__("isPreviousActualEditableByCurrentUser", makeEditableGetter('editPreviousActual'));

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

/*HaploDoc
node: /hres_project_journal/project_dates_alerts
sort: 2
--
h3(service). hres:project_journal:dates:get_alerts_deployment_date

*REQUIRED:* Provide an @XDate@ of the date of using alerts in production.

With it, it is possible to select alerts that may affect users.

h3(service). hres:project_journal:dates:should_hide_deadline_warning

Implement this service to return a boolean if all standard warnings (e.g. project date page's traffic lights) for a deadline should be switched off.

The service is called with the deadline date's name as the only argument.

h3(service). hres:project_journal:dates:get_past_alerts_for_project

Returns a list of alerts from today and earlier whose deadline dates are not completed or if none found the empty array. 

h4. Usage

Call the service with:

* *REQUIRED:* @arg1@ being a project @Ref@

*/
P.implementService("hres:project_journal:dates:get_past_alerts_for_project", function(projectRef) {
    var d = P.db.dates.select().
        where("project","=",projectRef).
        order("updated",true).
        limit(1);
    var pastAlerts = [];
    var deployment = O.serviceMaybe("hres:project_journal:dates:get_alerts_deployment_date");
    if(d.length && deployment) {
        var alerts =  createAlertsFromRow(d[0]);
        var today = new XDate().clearTime();
        _.each(alerts, function(alert) {
            if(alert.date.requiredMin && alert.deadline && !alert.deadlineActual) {
                var alertDate = new XDate(alert.date.requiredMin).clearTime();
                var deadline = new XDate(alert.deadline);
                if(today.diffDays(alertDate) <= 0 && deployment.diffDays(deadline) > 0) {
                    pastAlerts.push(alert);
                }
            }
        });
    }
    return pastAlerts;
});

/*HaploDoc
node: /hres_project_journal/project_dates_alerts
sort: 3
--
h3(service). hres:project_journal:dates:get_alerts_for_today

Returns a list of alerts whose deadlines are today and their deadline dates are not completed or if none found the empty array.

h4. Usage

Call the service with no arguments.
*/
P.implementService("hres:project_journal:dates:get_alerts_for_today", function() {
    var projects = P.getProjectsWithStoredDates();
    var alertsForToday = [];
    var today = new XDate().clearTime();
    _.each(projects, (ref) => {
        var d = P.db.dates.select().
            where("project","=",ref).
            order("updated",true).
            limit(1);
        var row = d[0];
        var alerts = createAlertsFromRow(row);
        _.each(alerts, function(alert) {
            if(alert.date.requiredMin && !alert.deadlineActual) {
                var alertDate = new XDate(alert.date.requiredMin).clearTime();
                if(today.diffDays(alertDate) === 0) {
                    alertsForToday.push(alert);
                }
            }
        });
    });
    return alertsForToday;
});

/*HaploDoc
node: /hres_project_journal/project_dates_alerts
title: Project dates alerts
sort: 1
--
An alert is an object with the properties:

|_. Property |_. Value |
| project | @StoreObject@ the alert is defined on. |
| date | @ProjectDate@ of the alert. |
| deadlineName | The expected name of the alert's deadline date. |
| deadline | @requiredMax@ of the alert's deadline date if found or @null@. |
| deadlineActual | @actual@ of the alert's deadline date if found or @null@. |
| deadlineDisplayName | @displayName@ of the alert's deadline date if found or @null@. |

*/
var createAlertsFromRow = function(row) {
    var alerts = [];
    var dateList = new ProjectDateList(row.project, row.dates);
    _.each(dateList.list, function(date) {
        if(date.name.indexOf(":alert") !== -1) {
            var deadlineName = date.name.slice(0, date.name.indexOf(":alert"));
            var deadlineDate = dateList.date(deadlineName);
            alerts.push({
                project: row.project.load(),
                date: date,
                deadlineName: deadlineName,
                deadline: deadlineDate ? deadlineDate.requiredMax : null,
                deadlineActual: deadlineDate ? deadlineDate.actual : null,
                deadlineDisplayName: deadlineDate ? deadlineDate.displayName : null
            });
        }
    });
    return alerts;
};

// --------------------------------------------------------------------------

/*HaploDoc
node: /hres_project_journal/project_dates
sort: 50
--
h3(service). @hres:project_journal:dates@

*REQUIRED:* Provide the ref of the project you want to get dates for. 

Returns a ProjectDateList object for the most recent calculation of dates.

*/

P.implementService("hres:project_journal:dates", function(projectRef) {
    var d = P.db.dates.select().
        where("project","=",projectRef).
        order("updated",true).
        limit(1);
    return new ProjectDateList(projectRef, d.length ? d[0].dates : {version:0,dates:[]});
});

// --------------------------------------------------------------------------

/*HaploDoc
node: /hres_project_journal/project_dates
sort: 51
--
h3(service). @hres:project_journal:dates:get_date_updates_in_time_range@

Provide:
*REQUIRED:* @projectRef@ The ref of the project you want to get dates for. 
*REQUIRED:* @start@ The start of the period you want dates for
*REQUIRED:* @end@ The end of the period you want dates for 

Returns an array of objects containing properties:
@dates@ A ProjectDateList object for a given version of the project dates
@updated@ When the calculation for this set of project dates happened

*/

P.implementService("hres:project_journal:dates:get_date_updates_in_time_range", function(projectRef, start, end) {
    var d = P.db.dates.select().
        where("project","=",projectRef).
        where("updated",">=",start).
        where("updated","<=",end).
        order("updated");
    var dateLists = _.map(d, function(dates) {
        return {
            dates: new ProjectDateList(projectRef, dates.dates),
            updated: dates.updated
        };
    });
    return dateLists;

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

// --------------------------------------------------------------------------

P.implementService("hres_project_journal:dates:all_definitions", function() {
    return dateDefinitionsSorted;
});

P.implementService("haplo:qa-audit:gather-information", function(audit) {
    audit.addInformation("dateDefinitionsSorted", "All sorted project date definitions", dateDefinitionsSorted);
    var alertDefs = _.filter(dateDefinitionsSorted, function(def) {
        return def.name.indexOf(":alert") !== -1;
    });
    var alertDateDefinitionsSorted = _.map(alertDefs, function(def) {
        var deadlineName = def.name.slice(0, def.name.indexOf(":alert"));
        var deadlineDef = _.find(dateDefinitionsSorted, function(d) {
            return d.name === deadlineName;
        });
        if(deadlineDef) {
            def.deadlineDisplayName = deadlineDef.displayName;
        }
        return def;
    });
    audit.addInformation("alertDateDefinitionsSorted", "All sorted alert project date definitions", alertDateDefinitionsSorted);
});

P.implementService("haplo:qa-audit:identify-issues", function(audit) {
    var dateDefinitionsSorted = audit.getInformation("dateDefinitionsSorted");
    var alertDefinitionsSorted = audit.getInformation("alertDateDefinitionsSorted");
    var alertsWithoutDeadline = _.filter(alertDefinitionsSorted, function(def) {
        return !("deadlineDisplayName" in def);
    });
    _.each(alertsWithoutDeadline, function(def) {
        audit.issue(
            "hres-project-journal/dates/alert-missing-deadline-definition/"+def.name,
            "Alert is missing associated deadline definition",
            "For all alerts a date with the name of the alert without the alertXXX suffix must be defined."
        );
    });
});
