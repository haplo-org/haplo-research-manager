/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2018            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


// Only currently projects
// recalc without saving
// compare to saved dates (include things that aren't in output dates)
// report on:  Project -- dateName -- Field -- from -- to

var CanForceDatesUpdate = P.CanForceDatesUpdate = O.action("hres:project_journal:force_manual_dates_recalculation").
    title("Can force manual project dates calculation");

var CanSeeProjectDatesHistory = P.CanSeeProjectDatesHistory = O.action("hres:project_journal:project_dates_history_access").
    title("Can see project dates history");

var CanManuallyForceDatesUpdate = P.CanManuallyForceDatesUpdate = O.action("hres:project_journal:force_manual_update_dates_access").
    title("Can force manual project dates calculation as admin").
    allow("group", Group.Administrators);

P.respond("GET,POST", "/do/hres-project-journal/dates/force-update", [
    {pathElement:0, as:"object"},
    {parameter:"deleteState", as:"int", optional:true}
], function(E, project, deleteState) {
    // Should only be visible to Haplo
    P.CanManuallyForceDatesUpdate.enforce();

    if(E.request.method === "POST") {
        var list = O.service("hres:project_journal:dates", project.ref);
        var service = !!deleteState ? 
            "hres:project_journal:dates:request_update_ignoring_state" :
            "hres:project_journal:dates:request_update";
        O.serviceMaybe(service, project.ref, list);
        list._commit({
            action: !!deleteState ? "ADMIN-FORCE-UPDATE-DELETE-STATE" : "ADMIN-FORCE-UPDATE"
        });
        return E.response.redirect("/do/phd-doctoral-supervision/project-dates/"+project.ref.toString());
    }
    var i = P.locale().text("template");
    E.render({
        pageTitle: i["Recalculate dates for:"] +" "+project.title,
        backLink: project.url(),
        text: i["Recalculate project dates for this project. This should only be required in exceptional circumstances."]+
            "\n"+i["Deleting the state for the dates will reset any errors that have been persisted in 'periodEndRules'. Use with caution."],
        options: [
            {label:i["Confirm"]},
            {label:i["Confirm and delete previous state"], parameters: {deleteState:1} }
        ]
    }, "std:ui:confirm");
});

P.respond("GET", "/do/hres-project-journal/dates/state-table", [
    {pathElement:0, as:"object"}
], function(E, object) {
    // Should only be visible to Haplo
    if(!O.currentUser.isSuperUser) { O.stop("Not permitted"); }
    let projectRef = object.ref;
    let stateTableRows = O.serviceMaybe("haplo:date_rule_engine:get_project_state_table", projectRef);
    let dates = [];
    stateTableRows = _.without(_.map(stateTableRows, (r)=> { if(!_.isEmpty(r.state)) { return r.state; } }), undefined); //array of *defined* rulesets
    _.each(stateTableRows, (r) => {
        _.each(r, (v, k) => {
            dates.push(_.extend(_.pick(v, "periodLastUpdated"), { name: k }));
        });
    });
    var i = P.locale().text("template");
    E.render({
        pageTitle: i["State table for:"] +" "+projectRef.load().title,
        backLink: object.url(),
        stateTableRows: dates
    }, "state-table");
});

// ---------------------------------------------------------------------

P.respond("GET", "/do/hres-project-journal/dates/history", [
    {pathElement:0, as:"object"},
    {parameter:"version", as:"int", optional:true}
], function(E, project, version) {
    CanSeeProjectDatesHistory.enforce();
    
    var q = P.db.dates.select().
        where("project", "=", project.ref).
        order("updated", false);
    // version can be 0
    if(!version && (version !== 0) && q.length) { version = q.length-1; }
    var serializableEmptyDates = {version:0,dates:[]};
    var entry = q.length ? q[version] : undefined;
    var table = P.datesTableDeferredRender(project.ref, {
        datesList: new P.ProjectDateList(project.ref, entry ? entry.dates : serializableEmptyDates),
        displayAdminOptions: true
    }, 'full');
    E.render({
        backLink: project.url(),
        project: project,
        version: version,
        previous: (version > 0) ? version-1 : null,
        next: (version < q.length-1) ? version+1 : null,
        entry: entry,
        table: table,
    }, "dates/history");
});

// ---------------------------------------------------------------------

P.hook("hGetReportsList", function(response) {
    if(O.currentUser.allowed(CanForceDatesUpdate)) {
        response.reports.push(["/do/hres-project-journal/dates/admin-page", "Project dates administration"], ["/do/hres-project-journal/dates/alerts", "Alerts administration"]);
    }
});

var getFormattedDifference = function(date1, date2) {
    if(!(date1 && date2)) { return ""; }
    var formatStr;
    ["Years", "Months", "Days"].forEach(function(units) {
        if(formatStr) { return; }
        var a = new XDate(date1),
            b = new XDate(date2);
        var diff = Math.abs(a["diff"+units](b));
        if(diff >= 1) {
            formatStr = diff.toFixed(1)+" "+units;
        }
    });
    return formatStr || "< 1 day";
};

var getProjectsWithStoredDates = P.getProjectsWithStoredDates = function() {
    var aggregates = P.db.dates.select().aggregate("COUNT", "id", "project");
    return _.pluck(aggregates, "group");
};

/*HaploDoc
node: /hres_project_journal/dates
sort: 84
--

h2. Services

h3(service). "hres:project_journal:get_projects_with_stored_dates"

Takes no argument, returns an array of refs of projects that have stored project dates

h3(service). "hres:project_journal:get_current_dates"

Takes the ref of a project and returns an object with keys:
* current: a ProjectDateList object with the current stored dates of this project
* startOnly: a ProjectDateList object with only the start date of this project (used for recalculating completely. You almost certainly don't want to use this)

*/
P.implementService("hres:project_journal:get_projects_with_stored_dates",  getProjectsWithStoredDates);

P.implementService("hres:project_journal:get_current_dates", function(ref) {
    var d = P.db.dates.select().
            where("project","=",ref).
            order("updated",true).
            limit(1);
    if(d.length) {
        var projectStart = _.chain(d[0].dates.dates).filter((date) => {
            return date[0] === "project-start";
        }).value();
        var newDateObject = {version:0, dates:projectStart};
        return {
            startOnly: new P.ProjectDateList(ref, newDateObject),
            current: new P.ProjectDateList(ref, d[0].dates)
        };
    }
});

P.db.table("inconsistentRecords", {
    ref: {type:"ref", indexed:true, indexedwith:["name", "field"]},
    name: {type:"text", indexed:true},
    field: {type:"text", indexed:true},
    original: {type:"datetime", nullable:true},
    recalculated: {type:"datetime", nullable:true},
    difference: {type:"text", nullable:true}
});

P.respond("GET,POST", "/do/hres-project-journal/dates/calculate-inconsistencies", [
    {parameter:"ignorestate", as:"int", optional:true}
], function(E, ignorestate) {
    CanForceDatesUpdate.enforce();
    if(E.request.method === "POST") {
        P.data.inconsistenciesStatus = "Not yet started, likely in a queue";
        O.background.run("hres_project_journal:update_inconsistencies", { ignorestate: ignorestate });
        E.response.redirect("/do/hres-project-journal/dates/display-inconsistencies");
    }
    var i = P.locale().text("template");
    E.render({
        pageTitle: i["Update inconsistencies table"],
        backLink: "/do/hres-project-journal/dates/admin-page",
        text: i["Update inconsistencies table in the background?"],
        options: [{label: i["Confirm"]}]
    }, "std:ui:confirm");
});

P.respond("GET", "/do/hres-project-journal/dates/display-inconsistencies", [
    {parameter:"ignorestate", as:"int", optional:true},
    {parameter:"showAll", as:"string", optional:true},
    {parameter:"orderBy", as:"string", optional:true},
    {parameter:"descending", as:"string", optional:true}
], function(E, ignorestate, showAll, orderBy, descending) {
    CanForceDatesUpdate.enforce();
    let dates = orderBy ?  P.db.inconsistentRecords.select().order(orderBy, !!descending) : P.db.inconsistentRecords.select().order("ref", !!descending);
    let inconsistencies = orderBy ?  P.db.inconsistentRecords.select().where("difference", "<>", null).order(orderBy, !!descending) : P.db.inconsistentRecords.select().where("difference", "<>", null).order("ref", !!descending);
    E.render({
        showAll: showAll,
        orderBy: orderBy,
        descending: !!descending,
        tableDefined: (inconsistencies.length > 0),
        displayValues: showAll ? dates : inconsistencies,
        dates: dates.length,
        inconsistencies: inconsistencies.length,
        projects: P.data.totalStoredProjects || 0,
        ignorestate: ignorestate,
        status: P.data.inconsistenciesStatus ? "Status: "+P.data.inconsistenciesStatus : "Status: Never been run",
        errorLocation: P.data.inconsistenciesError ? "Error in "+P.data.inconsistenciesError.fileName+", at line "+P.data.inconsistenciesError.lineNumber : undefined,
        errorMessage: P.data.inconsistenciesError ? P.data.inconsistenciesError.message : undefined,
        backLink: "/do/hres-project-journal/dates/admin-page"
    }, "dates/inconsistencies");
});

P.backgroundCallback("update_inconsistencies", function(data) {
    var recordInconsistency = function(ref, name, field, original, recalculated, currentStoredProjects) {
        var record = {
            ref: ref,
            name: name,
            field: field,
            original: original,
            recalculated: recalculated
        };
        if(recalculated) {
            record.difference = getFormattedDifference(original, recalculated);
        }
        if(!record.difference) { record.difference = null; }
        if(!record.original) { record.original = null; }
        let recordCheck = P.db.inconsistentRecords.
            select().
            where("ref", "=", record.ref).
            where("name", "=", record.name).
            where("field", "=", record.field);
        recordCheck.update(_.pick(record, "original", "recalculated", "difference"));
        if(recordCheck.length === 0) {
           P.db.inconsistentRecords.create(record).save();
        }
        currentStoredProjects[ref.toString()] = "in table";
        P.data.totalStoredProjects = currentStoredProjects ? _.keys(currentStoredProjects).length : null;
    };
    try {
        P.data.inconsistenciesStatus = "Updating...";
        var currentStoredProjects = {};
        if(P.data.inconsistenciesError) { delete P.data.inconsistenciesError; }
        var projects = getProjectsWithStoredDates();
        _.each(projects, (ref) => {
            var d = P.db.dates.select().where("project","=",ref).order("updated",true).limit(1);
            var dates = new P.ProjectDateList(ref, d[0].dates);
            var recalculated = O.serviceMaybe("hres:project_journal:dates:recalculated_for_project", ref, dates, !!data.ignorestate);
            _.each(recalculated, (r) => {
                _.each(r.impl.calculationDates, function(name) {
                    var date = dates.date(name);
                    if(date.requiredIsFixed || date.actual) { return; }
                    var result = r.dates[name];
                    if(result) {
                        if(!date.requiredMin || !P.jsDateIsEqual(date.requiredMin, result[0])) {
                            recordInconsistency(ref, name, "requiredMin", date.requiredMin, result[0], currentStoredProjects);
                        }
                        if(!date.requiredMax || !P.jsDateIsEqual(date.requiredMax, result[1])) {
                            recordInconsistency(ref, name, "requiredMax", date.requiredMax, result[1], currentStoredProjects);
                        }
                    } else {
                        if(date.requiredMin) {
                            recordInconsistency(ref, name, "requiredMin", date.requiredMin, null, currentStoredProjects);
                        }
                    }
                });
            });
        });
        P.data.inconsistenciesStatus = "Last updated: "+new Date().toString();
        _.each(P.db.inconsistentRecords.select(), (record) => {
            if(!currentStoredProjects[record.ref.toString()]) {
                P.db.inconsistentRecords.deleteRow(record.id);
            }
        });
    }
    catch(e) {
            P.data.inconsistenciesStatus = "Failed";
            P.data.inconsistenciesError = e;
        }
});

P.respond("GET", "/do/hres-project-journal/dates/admin-page", [
    {parameter:"ignorestate", as:"int", optional:true}
], function(E, ignorestate) {
    CanForceDatesUpdate.enforce();
    E.render({
        status: P.data.dateUpdateStatus,
        errorLocation: P.data.datesUpdateError ? "Error in "+P.data.datesUpdateError.fileName+", at line "+P.data.datesUpdateError.lineNumber : undefined,
        errorMessage: P.data.datesUpdateError ? P.data.datesUpdateError.message : undefined
    }, "dates/admin-page");
});

P.respond("GET,POST", "/do/hres-project-journal/dates/recalculate-all", [
    {parameter:"ignorestate", as:"int", optional:true}
], function(E, ignorestate) {
    CanForceDatesUpdate.enforce();
    if(E.request.method === "POST") {
        P.data.dateUpdateStatus = "    Not yet started, likely in a queue";
        O.background.run("hres_project_journal:recalculate_all_dates", { ignorestate: ignorestate });
        E.response.redirect("/do/hres-project-journal/dates/admin-page");
    }
    var i = P.locale().text("template");
    var text = O.interpolateString(i["Recalculate all project dates in this application. \n This should only be used if you understand the causes behind all entries in the 'inconsistencies' table, and agree with the corrected calculated dates"]);
    E.render({
        pageTitle: i["Recalculate all dates"],
        backLink: "/do/hres-project-journal/dates/admin-page",
        text: !!ignorestate ?
            text+"\n"+i["You will delete all saved state associated with the project dates in the system."] : 
            text,
        options: [{label: i["Confirm"]}]
    }, "std:ui:confirm");
    
});

P.backgroundCallback("recalculate_all_dates", function(data) {
    var currentRef;
    try {
        P.data.dateUpdateStatus = "Status: Updating...";
        if(P.data.datesUpdateError) { delete P.data.datesUpdateError; }
        var allProjects = getProjectsWithStoredDates();
        _.each(allProjects, (ref) => {
            currentRef = ref;
            var dates = O.service("hres:project_journal:dates", ref);
            var service = !!data.ignorestate ? 
                "hres:project_journal:dates:request_update_ignoring_state" :
                "hres:project_journal:dates:request_update";
            O.serviceMaybe(service, ref, dates);
            dates._commit({
                action: !!data.ignorestate ? "ADMIN-FORCE-UPDATE-DELETE-STATE" : "ADMIN-FORCE-UPDATE" 
            });
        });
        P.data.dateUpdateStatus = "Last updated: "+new Date().toString();
    }
    catch(e) {
        P.data.dateUpdateStatus = " Status: Failed on record "+currentRef;
        P.data.datesUpdateError = e;
    }
});

/*HaploDoc
node: /hres_project_journal/alerts
sort: 84
--

h2. Services

h3(service). "hres:project_journal:check_if_no_alert_behaviour"

Takes a specified behaviour and returns true if in noAlertBehaviours table. 
Note: The noAlertBehaviours table can be modified via 'Alerts administration'.
Any project with a behaviour in the noAlertBehaviours table will have alerts blocked, 
it might be useful, therefore, to include behaviours such as 'Completed', 'Graduated' or
'Withdrawn'.

h3(service). "hres:project_journal:get_default_no_alert_behaviours"

Takes in an array to add behaviours to. Returns common case behaviours to block alerts
 for via 'Alerts administration' and the noAlertBehaviours table.

e.g. in phd_schema, the following behaviours are added to the table like so: 

P.implementService("hres:project_journal:get_default_no_alert_behaviours", function(noAlertBehavioursArray) {
    noAlertBehavioursArray.push("phd:list:doctoral-research-project-status:complete",
                                "phd:list:doctoral-research-project-status:withdrawn",
                                "phd:list:doctoral-research-project-stage:graduated");
});

*/

// ----------------------------------------------------------------------

P.db.table("noAlertBehaviours", {
    title: {type:"text", nullable:true},
    behaviour: {type:"text", nullable:true}
});

var noAlertBehaviours;

var alreadyInTable = function(behaviour) {
    return P.db.noAlertBehaviours.select().where("behaviour", "=", behaviour).length > 0;
};

var addBehaviourToTable = function(behaviour) {
   P.db.noAlertBehaviours.create({
        title: O.behaviourRef(behaviour).load().title,
        behaviour: behaviour
    }).save();
};

P.respond("GET,POST", "/do/hres-project-journal/dates/alerts", [
    {parameter:"add", as:"string", optional:true},
    {parameter:"remove", as:"string", optional:true},
], function(E, add, remove) {
    CanForceDatesUpdate.enforce();
    let error;
    if(E.request.method === "POST" && (add || remove) ) {
        let addOrRemoveValue = add || remove;
        let behaviour = O.behaviourRefMaybe(addOrRemoveValue) ? addOrRemoveValue : undefined;
        let matchedBehaviourRowsMaybe = P.db.noAlertBehaviours.select().where("behaviour", "=", addOrRemoveValue).limit(1);
        if(behaviour) {
            if(!alreadyInTable(behaviour)){
                if(add){ addBehaviourToTable(addOrRemoveValue); }
                else if(remove) { error = "'"+addOrRemoveValue+"' behaviour is not in the table, so cannot be removed"; }
            } else {
                if(remove) { P.db.noAlertBehaviours.deleteRow(matchedBehaviourRowsMaybe[0].id); }
                else if(add) { error = "'"+addOrRemoveValue+"' is already in the table, so cannot be added"; }
            }
        } else { error = "'"+addOrRemoveValue+"' is not a valid behaviour, please check System Management"; }
    }
    let links = [];
    O.serviceMaybe("hres_project_journal:gather_alerts_admin_links", links);
    E.render({
        error: error,
        noAlertStatusOrStages: _.map(P.db.noAlertBehaviours.select(), function(noAlert) {
            return {
                noAlert: noAlert.behaviour, 
                noAlertTitle: noAlert.title
            };
        }),
        links: links
    }, "alerts");
});

P.implementService("hres:project_journal:check_if_no_alert_behaviour", function(behaviour) {
    return P.db.noAlertBehaviours.select().where("behaviour", "=", behaviour).length > 0; 
});

P.respond("GET,POST", "/do/hres-project-journal/dates/alerts/migrate-default-no-alert-behaviours", [
], function(E) {
    if(!O.currentUser.isSuperUser) { O.stop("Not permitted"); }
    if(!noAlertBehaviours) {
        noAlertBehaviours = [];
        O.serviceMaybe("hres:project_journal:get_default_no_alert_behaviours", noAlertBehaviours);
    }
    let behaviours = _.reject(noAlertBehaviours, (b) => { return alreadyInTable(b); });
    let text;
    if(behaviours.length > 0) {
        text = "Are you sure you would like to migrate the following "+behaviours.length+" behaviours?\n\n"+behaviours.join('\n');
        if(E.request.method === "POST") {
            _.each(noAlertBehaviours, function(b) {
                if(!alreadyInTable(b)) { addBehaviourToTable(b); }
            });
        }
    } else { 
        text = "The following behaviours have already been migrated by default and should also be visible in Alerts administration:\n"+noAlertBehaviours.join('\n')+
        "\nNOTE: If this is not what you were expecting please look at the hres:project_journal:get_default_no_alert_behaviours service.";
                }
    E.render({
        pageTitle: "Add default behaviours to block alerts for",
        backLink: "/",
        text: text,
        options: [{label:"Confirm"}]
    }, "std:ui:confirm");
});
