/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2020            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


var CanViewDMPDashboards = O.action("hres:action:can_view_dmp_dashboards").
    title("Can view data management plan dashboards");

if("RepositoryEditors" in Group) {
    CanViewDMPDashboards.allow("group", Group.RepositoryEditors);
}

// Dataset in T will also have FileAccessLevel in A
if("Dataset" in T) {
    P.hook("hPostObjectChange", function(response, object, operation, previous) {
        // Hook just for fact collecting projects on file access level changes, collecting on adding to DMP is implemented elsewhere
        if(!previous) { return; }
        if(object.isKindOf(T.Dataset)) {
            let projects = object.every(A.Project);
            if(!object.valuesEqual(previous, A.FileAccessLevel)) {
                _.each(projects, (project) => {
                    if(!project.load().isKindOf(T.Project)) { return; }
                    O.service("std:reporting:update_required", "projects", [project]);
                });
            }
        }
    });
}

P.implementService("std:action_panel:activity:menu:repository", function(display, builder) {
    if(O.currentUser.allowed(CanViewDMPDashboards)) {
        let panel = builder.panel(1600).title("Data management plans");
        panel.link(100, "/do/hres-data-management-plans/view-dmp-by-project", "DMP reports by project");
    }
});

P.implementService("std:reporting:collection:projects:setup", function(collection) {
    collection.fact("hasDMP",               "boolean",      "Has data management plan").
        fact("sensitiveDataExpected",       "boolean",      "Sensitive data expected").
        fact("sensitiveDataSecured",        "boolean",      "Sensitive data secured").
        fact("largeFilesExpected",          "boolean",      "Large files expected").
        fact("numberOfDatasetsExpected",    "int",          "Datasets expected").
        fact("numberOfDatasetsLinkedToDMP", "int",          "Datasets linked to DMP").
        fact("dmpCreated",                  "date",         "DMP created").
        fact("dmpModified",                 "date",         "DMP last modified").
        filter("hasDMP", (select) => {
            select.where("hasDMP", "=", true);
        }).
        statistic({
            name: "datasetsLinkedToDMPs",
            description: "Total datasets deposited",
            filter: (select) => {
                select.where("hasDMP", "=", true);
            },
            aggregate: "SUM",
            fact: "numberOfDatasetsLinkedToDMP"
        }).
        statistic({
            name: "datasetsExpectedInDMPs",
            description: "Total datasets expected",
            filter: (select) => {
                select.where("hasDMP", "=", true);
            },
            aggregate: "SUM",
            fact: "numberOfDatasetsExpected"
        });
});

P.implementService("std:reporting:collection:projects:get_facts_for_object", function(object, row) {
    let dmp = P.getDMPForProject(object.ref),
        sensitiveDataExpected = false,
        sensitiveDataSecured = true,
        largeFilesExpected = false;

    if(_.isEmpty(dmp)) {
        row.hasDMP = false;
        return;
    }
    _.each(dmp.datasets, (dataset) => {
        _.each(["personal_data", "sensitive_data"], (field) => {
            if(dataset[field] === "yes" || dataset[field] === "unknown") {
                sensitiveDataExpected = true;
                if(dataset.dataset_id) {
                    let datasetRef = O.ref(dataset.dataset_id.identifier);
                    if(!datasetRef) { return; }
                    
                    let datasetObj = datasetRef.load();
                    let accessLevel = "FileAccessLevel" in A ? datasetObj.first(A.FileAccessLevel) : undefined;
                    if(!accessLevel || accessLevel.behaviour === "hres:list:file-access-level:open") { sensitiveDataSecured = false; }
                }
            }
        });

        if(P.isLargeFile(dataset.expected_size)) {
            largeFilesExpected = true;
        }
    });
    row.hasDMP = true;
    row.sensitiveDataExpected = sensitiveDataExpected;
    row.sensitiveDataSecured = sensitiveDataSecured;
    row.largeFilesExpected = largeFilesExpected;
    row.numberOfDatasetsExpected = dmp.datasets ? dmp.datasets.length : 0;
    row.numberOfDatasetsLinkedToDMP = _.chain(dmp.datasets).
        pluck("dataset_id").
        compact().
        size().
        value();

    row.dmpCreated = new Date(dmp.created);
    row.dmpModified = new Date(dmp.modified);
});

P.implementService("hres:data_management_plans:on_dmp_commit", function(instance) {
    if(instance.key.load().isKindOf(T.Project)) {
        O.service("std:reporting:update_required", "projects", [instance.key]);
    }
});

// --------------------------------------------------------------------------
// Dashboards
// --------------------------------------------------------------------------

P.respond("GET,POST", "/do/hres-data-management-plans/view-dmp-by-project", [
], function(E) {
    CanViewDMPDashboards.enforce();
    P.reporting.dashboard(E, {
            kind: "list",
            collection: "projects",
            name: "dmp_by_project",
            title: "Data management plans by project",
            filter: "hasDMP"
        }).
        columns(10, [
            {type:"linked", style:"wide", column:{fact:"ref", heading:"Project"}}
        ]).summaryStatistic(0, "datasetsLinkedToDMPs").
        summaryStatistic(0, "datasetsExpectedInDMPs").
        columns(100, [
            {fact: "dmpCreated", heading: "Created"},
            {fact: "dmpModified", heading: "Last modified"},
            "largeFilesExpected",
            "sensitiveDataExpected",
            "sensitiveDataSecured",
            "numberOfDatasetsExpected",
            "numberOfDatasetsLinkedToDMP"
        ]).
        respond();
});