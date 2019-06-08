/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2019            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */

var columns = [
    {fact:"project", link:true},
    "alertEarliestDeadlineName",
    {fact:"alertEarliestDeadline", type: "date-with-age-warning",
        determineCellStyle: function(row) {
            var deadline = new XDate(row[this.fact]);
            var today = new XDate().clearTime();
            return today.diffDays(deadline) > 0 ?
                    "warn" :
                    "error";
        }
    }
];

var makeFilterForWarning = function(colour) {
    return function(select) {
        select.where("alertWarningType", "=", colour);
    };
};

/*
    Spec fields:
        collectionName: name of the collection (eg. doctoral_researchers)
        collectionDisplayName: name of the objects of the collection, suitable for display in the header of a dashboard column
        getProject: a function that takes the collection object and returns the associated project
        canViewDashboard: an action controlling access to these dashboards
        missedUrl: the URL for the missed deadlines dashboard
        upcomingUrl: the URL for the upcoming deadlines dashboard
        navigationOption: name of used navigation (e.g. academic_year)
 */

P.provideFeature("hres:simple_alerts_reporting", function(plugin) {
    plugin.simpleAlertsReporting = function(spec) {
        plugin.implementService("std:reporting:collection:"+spec.collectionName+":setup", function(collection) {
            collection.
                fact("alertWarningType",            "text",     "Reminder warning").
                fact("alertEarliestDeadline",       "date",     "Deadline date").
                fact("alertEarliestDeadlineName",   "text",     "Deadline").
                statistic({
                    name: "usersOverdueAlerts", description: "Have overdue deadlines",
                    filter: makeFilterForWarning("red"),
                    aggregate: "COUNT"
                }).
                statistic({
                    name: "usersUpcomingAlerts", description: "Have upcoming deadlines",
                    filter: makeFilterForWarning("amber"),
                    aggregate: "COUNT"
                });
        });

        plugin.implementService("std:reporting:collection:"+spec.collectionName+":get_facts_for_object", function(object, row) {
            var project;
            if(spec.navigationOption === "academic_year") {
                project = O.serviceMaybe("hres:academic_year:get_object_version", spec.getProject(object), row.academicYear);
            } else {
                project = spec.getProject(object);
            }
            if(project) {
                var warning = P.getProjectReminderWarning(project.ref);
                var warningDate = warning.date ? warning.date.toDate() : null;
                if(spec.navigationOption === "academic_year") {
                    var warningYear = warningDate ? O.serviceMaybe("hres:academic_year:for_date", warningDate) : null;
                    if(warningYear && warningYear.ref == row.academicYear) {
                        row.alertWarningType = warning.level || null;
                        row.alertEarliestDeadline = warningDate;
                        row.alertEarliestDeadlineName = warning.name || null;
                    }
                } else {
                    row.alertWarningType = warning.level || null;
                    row.alertEarliestDeadline = warningDate;
                    row.alertEarliestDeadlineName = warning.name || null;
                }
            }
        });

        plugin.respond("GET,POST", spec.missedUrl, [
            {parameter: "year", as: "ref", optional: true}
        ], function(E, year) {
            spec.canViewDashboard.enforce();
            var dashboard = plugin.reporting.dashboard(E, {
                kind: "list",
                collection: spec.collectionName,
                name: spec.collectionName+"_alerts_missed_deadlines",
                title: "Missed deadlines"
            });
            if(spec.navigationOption === "academic_year") {
                dashboard.
                    use("hres:schema:academic_year_navigation_for_ref", year, "academicYear");
            }
            dashboard.
                filter(makeFilterForWarning("red")).
                use("hres:person_name_column", {heading:NAME(spec.collectionDisplayName)}). 
                summaryStatistic(0, "count").
                columns(200, columns).
                respond();
        });

        plugin.respond("GET,POST", spec.upcomingUrl, [
        ], function(E) {        
            spec.canViewDashboard.enforce();
            plugin.reporting.dashboard(E, {
                kind: "list",
                collection: spec.collectionName,
                name: spec.collectionName+"_alerts_upcoming_deadlines",
                title: "Upcoming deadlines"
            }).
                filter(makeFilterForWarning("amber")).
                use("hres:person_name_column", {heading:NAME(spec.collectionDisplayName)}).
                summaryStatistic(0, "count").
                columns(200, columns).
                respond();
        });
    };
});