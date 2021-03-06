/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


P.db.table("journal", {
    datetime:       {type:"datetime"},              // when the event actual
    academicYear:   {type:"ref"},                   // which academic year the event was in
    kind:           {type:"text"},                  // what kind of event it is
    implementation: {type:"text"},                  // what is implementing this event
    project:        {type:"ref",                    // what project it's about
            indexed:true, indexedWith:["datetime"]},
    ref:            {type:"ref",    nullable:true}, // an (optional) object representing this event
    identifier:     {type:"text",   nullable:true}, // an identifier for deduplicating events (if object is null)
    user:           {type:"user",   nullable:true}, // which user caused the event to happen
    data:           {type:"json",   nullable:true}  // optional additional data:
                                                    //   plain word keys: should be well known and shared between
                                                    //       implementations for a given kind, things using them should
                                                    //       be careful to cope with them being absent.
                                                    //   keys containing ':' character: data specific to the
                                                    //       implementation, use implementation name as the namespace.
});

var UPDATE_FIELDS = ['datetime','ref','user','data'];

// --------------------------------------------------------------------------

var selectJournalEntries = function(specification) {
    var select = P.db.journal.select().
        order("datetime",true);
    if("project" in specification) {
        select.where("project", "=", specification.project);
    }
    if("academicYear" in specification && specification.academicYear) {
        select.where("academicYear","=",specification.academicYear);
    }
    if("kind" in specification) {
        if(specification.kind === "PDATE") {
            // Special case because project dates are encoded using the kind,
            // but there's only ever one implementation.
            select.where("implementation","=","PDATE");
        } else {
            select.where("kind","=",specification.kind);
        }
    }
    if("implementation" in specification) {
        select.where("implementation", "=", specification.implementation);
    }
    if("identifier" in specification) {
        select.where("identifier", "=", specification.identifier);
    }
    if("ref" in specification) {
        select.where("ref", "=", specification.ref);
    }
    if("modify" in specification && typeof specification.modify === 'function') {
        specification.modify(select);
    }
    return select;
};

// --------------------------------------------------------------------------

var implementations = {};

var getImplementation = function(implementation) {
    var impl = implementations[implementation];
    if(!impl) {
        var serviceName = 'hres:project_journal:get_implementation:'+implementation;
        impl = O.serviceMaybe(serviceName) ||
            // Fallback generic service; something may still provide the implementation.
            O.serviceMaybe("hres:project_journal:get_implementation", implementation);
        if(impl) { implementations[implementation] = impl; }
    }
    return impl;
};

// --------------------------------------------------------------------------

P.implementService("hres:project_journal:select", selectJournalEntries);

P.implementService("hres:project_journal:load", function(id) {
    return P.db.journal.load(id);
});

P.implementService("hres:project_journal:save", function(entry) {
    var row;
    // First, attempt deduplicated version
    if(entry.identifier || entry.ref) {
        var findDuplicate = P.db.journal.select().limit(1).stableOrder().
            where("project","=",entry.project).
            where("kind","=",entry.kind).
            where("implementation","=",entry.implementation);
        if(entry.identifier){ findDuplicate.where("identifier","=",entry.identifier); }
        if(entry.ref)       { findDuplicate.where("ref","=",entry.ref); }
        if(findDuplicate.length > 0) {
            if(entry.discardIfDuplicate) {
                return;
            }
            row = findDuplicate[0];
        }
    }
    if(entry.id) { row = P.db.journal.load(entry.id); }

    saveEntry(entry, row);
});

P.implementService("hres:project_journal:save_all_of_kind", function(specification) {

    var existingEntries = P.db.journal.select().
        where("project", "=", specification.project).
        where("kind", "=", specification.kind).
        where("implementation", "=", specification.implementation);
    var entriesMap = {};
    _.each(existingEntries, function(row) {
        entriesMap[row.id] = row;
    });
    var deleteMap = _.clone(entriesMap);

    _.each(specification.entries, function(entry) {
        entry.project = specification.project;
        entry.kind = specification.kind;
        entry.implementation = specification.implementation;
        var row;
        var existingRow = _.find(entriesMap, function(mappedEntry) {
            var isMatch = true;
            var mustMatchIfPresent = ["identifier", "ref", "id"];
            _.each(mustMatchIfPresent, function(key) {
                if(entry[key] && entry[key] !== mappedEntry[key]) {
                    isMatch = false;
                }
            });
            return isMatch;
        });

        if(existingRow) {
            delete deleteMap[existingRow.id];
        }

        saveEntry(entry, existingRow);
    });

    _.each(deleteMap, function(mappedEntry, id) {
            P.db.journal.select().
            where("id", "=", Number.parseInt(id)).
            deleteAll();
    });
});

var saveEntry = function(entry, row) {
    if(row) {
        UPDATE_FIELDS.forEach(function(k) {
            row[k] = (k in entry) ? entry[k] : null;
        });
    } else {
        // Create a new entry if not dedupable, or nothing found
        row = P.db.journal.create(entry);
    }
    // Add/update academic year
    if(row.datetime) {
        row.academicYear = O.service("hres:academic_year:for_date", row.datetime).ref;
    }
    row.save();
    // Notify other plugins about changes to the journal
    [
        "hres:project_journal:notify:update",
        "hres:project_journal:notify:update:"+row.kind
    ].forEach(function(name) {
        // TODO: Should permissions be elevated for this service call for consistency?
        O.serviceMaybe(name, row);
    });
};

// Finds the last action by the researcher, given a specification.
// Uses user argument for fallback determination of whether a journal entry is by the user in question
P.implementService("hres:project_journal:get_last_action_by_researcher", function(specification, user) {
    var offset = 0;
    while(true) {
        var entries = selectJournalEntries(specification).
            offset(offset).
            limit(8).
            where("datetime","<",new Date());   // in the past
        var ll = entries.length;
        if(ll === 0) { return undefined; } // no more journal entries to try
        offset += ll;

        for(var i = 0; i < ll; ++i) {
            var row = entries[i];
            // See if the implementation can determine if it's an action by the researcher
            var impl = getImplementation(row.implementation);
            var isAction = (impl && impl.isEntryActionByResearcher) ?
                impl.isEntryActionByResearcher(row) :
                (row.user && (row.user.id === user.id));
            if(isAction) {
                return row.datetime;
            }
        }
    }
});

P.implementService("hres:project_journal:render", function(specification) {
    var select = selectJournalEntries(specification);
    var style = specification.style || 'table';
    var entries = [];
    var headers = [{sort:0, name:"Date"}, {sort:1, name:"Event"}];
    var columns = [];
    var ui = {
        addColumn: function(sort, renderer, name) {
            headers.push({
                sort: sort,
                name: name || ""
            });
            columns.push({
                sort: sort,
                renderer: renderer
            });
        }
    };
    if("columnService" in specification) {
        O.serviceMaybe(specification.columnService, ui);
    }
    headers = _.sortBy(headers, "sort");
    columns = _.sortBy(columns, "sort");

    // Pass information to the renderers, so they can make decisions based on context
    var renderingContext = {
        specification: specification
    };

    _.each(select, function(row) {
        var impl = getImplementation(row.implementation);
        if(!impl) { return; }
        var object, link, deferred;
        if(row.ref) {
            // if currentUser cannot read the row object, do not render it
            if(!O.currentUser.can("read", row.ref)) { return; }
            object = row.ref.load();
        }
        if("link" in impl) {
            link = impl.link(row);
        } else if(object) {
            link = object.url();
        }
        if("renderSmall" in impl) {
            // TODO: Other rendering types in implementation
            deferred = impl.renderSmall(row, renderingContext);
        }
        entries.push({
            row: row,
            link: link,
            deferred: deferred,
            columns: _.map(columns, function(column) {
                return column.renderer(row);
            })
        });
    });
    return P.template("render/"+style).deferredRender({
        entries:entries,
        withHeaders:specification.withHeaders,
        headers:headers
    });
});

P.implementService("hres:project_journal:entry_link", function(entry) {
    var impl = getImplementation(entry.implementation);
    if(!impl) { return; }
    var link;
    if("link" in impl) {
        link = impl.link(entry);
    } else if(entry.ref) {
        link = entry.ref.load().url();
    }
    return link;
});