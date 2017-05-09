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
        order("datetime",true).
        where("project","=",specification.project);
    if("kind" in specification) {
        if(specification.kind === "PDATE") {
            // Special case because project dates are encoded using the kind,
            // but there's only ever one implementation.
            select.where("implementation","=","PDATE");
        } else {
            select.where("kind","=",specification.kind);
        }
    }
    if("academicYear" in specification && specification.academicYear) {
        select.where("academicYear","=",specification.academicYear);
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
        if(O.serviceImplemented(serviceName)) {
            impl = implementations[implementation] = O.service(serviceName);
        }
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
});

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
        if(row.ref) { object = row.ref.load(); }
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

// --------------------------------------------------------
// TODO: Delete this Leeds-specific import fix code!

P.respond("GET,POST", "/do/hres-project-journal/fix-imported-nulls", [
    {parameter:"count", as:"int", optional:true}
], function(E, count) {
    if(!O.currentUser.isMemberOf(GROUP["std:group:administrators"])) { O.stop("Not permitted."); }
    
    if(E.request.method === "POST") {
        count = 0;
        P.db.journal.select().or(function(sq) {
            sq.where("implementation", "=", "leeds_import:legacy_meeting").
                where("implementation", "=", "leeds_import:legacy_monthly_report");
        }).each(function(row, i) {
            // Check row.data
            var document = {};
            var nullsFound = false;
            _.each(row.data, function(value, key) {
                if(value === null) {
                    nullsFound = true;
                } else {
                    document[key] = value;
                }
            });
            if(nullsFound) {
                count++;
                row.data = document;
                row.save();
            }                
        });
        E.response.redirect("/do/hres-project-journal/fix-imported-nulls?count="+count);
    }
    E.render({
        pageTitle: "Fix nulls imported into project journal data?",
        backLink: "/",
        text: count ? "Fixed "+count+" journals" : "",
        options: [
            {label:"Fix"}
        ]
    }, "std:ui:confirm");
});
