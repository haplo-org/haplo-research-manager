/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2019            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */

P.implementService("std:action_panel:project", function(display, builder) {
    if(P.canViewAndEditDMP(display.object.ref)) {
        let panel = builder.panel(2100).element(0, {title: "Data management plan"});
        let ref = display.object.ref;
        if(P.projectHasDMP(ref)) {
            panel.
                link("default", "/do/hres-data-management-plans/edit-dmp/"+ref, "Edit").
                link("default", "/do/hres-data-management-plans/view-dmp/"+ref, "View");
        } else {
            panel.title("Data management plan").
                link("default", "/do/hres-data-management-plans/edit-dmp/"+ref, "Add");
        }
    }
});

P.implementService("std:action_panel:research_data", function(display, builder) {
    let project = display.object.first(A.Project);
    if(project && P.dmpDocstore.instance(project)) {
        let document = P.dmpDocstore.instance(project).lastCommittedDocument;
        let needsSecuring = false;
        _.each(document.dataset, (dataset) => {
            if(!dataset.linkedDataset || dataset.linkedDataset !== display.object.ref.toString()) { return; }
            _.each(["personal_data", "sensitive_data"], (field) => {
                if(dataset[field] === "yes" || dataset[field] === "unknown") {
                    needsSecuring = true;
                }    
            });
        });
        let accessLevel = "FileAccessLevel" in A ? display.object.first(A.FileAccessLevel) : undefined;
        // If the object doesn't have any files they can't be insecure
        if(!display.object.first(A.File)) { return; }
        if(needsSecuring && (!accessLevel || accessLevel.behaviour === "hres:list:file-access-level:open")) {
            builder.panel(1).style("special").element(1, {
                deferred: P.template("dataset-unrestricted-warning").deferredRender()
            });
        }
    }
});

P.implementService("hres:repo_ingest:success_redirect_for_type", function(type) {
    if("Dataset" in T && type == T.Dataset) {
        return "/do/hres-data-management-plans/add-dataset-to-dmp";
    }
});

P.implementService("std:action_panel:dmp_dataset_panel", function(display, builder) {
    if("Dataset" in T) {
        let dataset = display.object;
        if(dataset.isKindOf(T.Dataset) && O.serviceMaybe("hres:repository:is_author", O.currentUser, dataset)) {
            let projectRef = dataset.first(A.Project);
            if(!(projectRef && P.projectHasDMP(projectRef) && P.canViewAndEditDMP(projectRef)) ||
                P.datasetLinkedToDMP(dataset.ref, projectRef)) { return; }
            builder.panel(400).
                link("default",
                    "/do/hres-data-management-plans/add-dataset-to-dmp?ref="+dataset.ref.toString(),
                    "Link dataset to project DMP"
                );
        }
    }
});

P.respond("GET", "/do/hres-data-management-plans/add-dataset-to-dmp", [
    {parameter: "ref", as: "ref"},
    {parameter: "datasetIndex", as: "int", optional: true}
], function(E, datasetRef, datasetIndex) {
    let projectRef = datasetRef.load().first(A.Project);
    if(projectRef && P.projectHasDMP(projectRef) && P.canViewAndEditDMP(projectRef)) {
        let datasets = P.getDMPForProject(projectRef).dataset;
        if(datasets && datasets.length > 0 && _.isNull(datasetIndex)) {
            let options = [{
                action:"?ref="+datasetRef.toString()+"&datasetIndex=-1",
                label:"None of these",
                notes:"This dataset wasn't listed in the DMP",
                indicator:"standard"
            }];
            _.each(datasets, (dataset, i) => {
                if(dataset.linkedDataset) { return; }
                options.push({
                    action:"?ref="+datasetRef.toString()+"&datasetIndex="+i,
                    label: dataset.title,
                    indicator: "primary",
                    notes: dataset.description || ""
                });
            });
            // List has more than "None of these" in it
            if(options.length > 1) {
                return E.render({
                    options: options
                });
            }
        } else if(datasetIndex > -1) {
            P.addRefToDMPDatasetWithIndex(projectRef, datasetIndex, datasetRef);
        }
    }
    return E.response.redirect("/"+datasetRef.toString());
});
