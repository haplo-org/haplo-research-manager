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

P.respond("GET,POST", "/do/hres-project-journal/dates/force-update", [
    {pathElement:0, as:"object"},
    {parameter:"deleteState", as:"int", optional:true}
], function(E, project, deleteState) {
    // Should only be visible to Haplo
    if(!O.currentUser.isMemberOf(Group.Administrators)) { O.stop("Not permitted"); }
    
    if(E.request.method === "POST") {
        var list = O.service("hres:project_journal:dates", project.ref);
        var service = !!deleteState ? 
            "hres:project_journal:dates:request_update_ignoring_state" :
            "hres:project_journal:dates:request_update";
        O.serviceMaybe(service, project.ref, list);
        list._commit({
            action: !!deleteState ? "ADMIN-FORCE-UPDATE-DELETE-STATE" : "ADMIN-FORCE-UPDATE"
        });
        return E.response.redirect(project.url());
    }
    E.render({
        pageTitle: "Recalculate dates for: "+project.title,
        backLink: project.url(),
        text: "Recalculate project dates for this project. This should only be required in exceptional circumstances."+
            "\nDeleting the state for the dates will reset any errors that have been persisted in 'periodEndRules'. Use with caution.",
        options: [
            {label:"Confirm"},
            {label:"Confirm and delete previous state", parameters: {deleteState:1} }
        ]
    }, "std:ui:confirm");
});

// ---------------------------------------------------------------------

P.respond("GET", "/do/hres-project-journal/dates/history", [
    {pathElement:0, as:"object"},
    {parameter:"version", as:"int", optional:true}
], function(E, project, version) {
    CanForceDatesUpdate.enforce();
    
    var q = P.db.dates.select().
        where("project", "=", project.ref).
        order("updated", false);
    // version can be 0
    if(!version && (version !== 0)) { version = q.length-1; }
    var entry = q[version];
    var table = P.datesTableDeferredRender(project.ref, {
        datesList: new P.ProjectDateList(project.ref, entry.dates),
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
        response.reports.push(["/do/hres-project-journal/dates/check-calculated", "Project dates administration"]);
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

h3(service). "hres:project_journal:get_current-dates"

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

P.respond("GET", "/do/hres-project-journal/dates/check-calculated", [
    {parameter:"ignorestate", as:"int", optional:true}
], function(E, ignorestate) {
    CanForceDatesUpdate.enforce();
    
    var inconsistent = [];
    var inconsistentProjects = {};
    var recordInconsistent = function(ref, name, field, original, recalculated) {
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
        inconsistent.push(record);
        inconsistentProjects[ref.toString()] = true;
    };
    
    var projects = getProjectsWithStoredDates();
    projects.forEach(function(ref) {
        var d = P.db.dates.select().
            where("project","=",ref).
            order("updated",true).
            limit(1);
        var dates = new P.ProjectDateList(ref, d[0].dates);
        var recalculated = O.serviceMaybe("hres:project_journal:dates:recalculated_for_project", ref, dates, !!ignorestate);
        _.each(recalculated, function(r) {
            _.each(r.impl.calculationDates, function(name) {
                var date = dates.date(name);
                if(date.requiredIsFixed || date.actual) { return; }
                var result = r.dates[name];
                if(result) {
                    if(!date.requiredMin || !P.jsDateIsEqual(date.requiredMin, result[0])) {
                        recordInconsistent(ref, name, "requiredMin", date.requiredMin, result[0]);
                    }
                    if(!date.requiredMax || !P.jsDateIsEqual(date.requiredMax, result[1])) {
                        recordInconsistent(ref, name, "requiredMax", date.requiredMax, result[1]);
                    }
                } else {
                    if(date.requiredMin) {
                        recordInconsistent(ref, name, "requiredMin", date.requiredMin, null);
                    }
                }
            });
        });
    });
    
    E.render({
        inconsistent: inconsistent,
        inconsistencies: inconsistent.length,
        projects: _.keys(inconsistentProjects).length,
        ignorestate: ignorestate
    }, "dates/check-calculated");
});

P.respond("GET,POST", "/do/hres-project-journal/dates/recalculate-all", [
    {parameter:"count", as:"int"},
    {parameter:"ignorestate", as:"int", optional:true}
], function(E, count, ignorestate) {
    CanForceDatesUpdate.enforce();

    if(E.request.method === "POST") {
        var allProjects = getProjectsWithStoredDates();
        allProjects.forEach(function(ref) {
            var dates = O.service("hres:project_journal:dates", ref);
            var service = !!ignorestate ? 
                "hres:project_journal:dates:request_update_ignoring_state" :
                "hres:project_journal:dates:request_update";
            O.serviceMaybe(service, ref, dates);
            dates._commit({
                action: !!ignorestate ? "ADMIN-FORCE-UPDATE-DELETE-STATE" : "ADMIN-FORCE-UPDATE" 
            });
        });
        E.response.redirect("/do/hres-project-journal/dates/check-calculated");
    }
    
    var text = "Recalculate all project dates in this application.\n"+
        "This should only be used if you understand the causes behind all "+count+
        " entries in the 'inconsistencies' table, and agree with the corrected calculated dates";
    E.render({
        pageTitle: "Recalculate all dates",
        backLink: "/do/hres-project-journal/dates/check-calculated",
        text: !!ignorestate ?
            text+"\nYou will delete all saved state associated with the project dates in the system." : 
            text,
        options: [{label: "Confirm"}]
    }, "std:ui:confirm");
    
});
