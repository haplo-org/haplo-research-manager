/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2019            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */

P.implementService("std:action_panel:project", function(display, builder) {
    let panel = builder.panel(1).element(0, {title: "Data management plan"});
    let ref = display.object.ref;
    if(P.dmpDocstore.instance(ref).hasCommittedDocument) {
        panel.
            link("default", "/do/hres-data-management-plans/edit-dmp/"+ref, "Edit").
            link("default", "/do/hres-data-management-plans/view-dmp/"+ref, "View");
        if(P.DEFAULT_DMP_TEMPLATE) {
            panel.link("default", "/do/hres-data-management-plans/generate-download/"+ref, "Download");
        }
    } else {
        panel.title("Data management plan").
            link("default", "/do/hres-data-management-plans/edit-dmp/"+ref, "Add");
    }
});

P.implementService("std:action_panel:research_data", function(display, builder) {
    let project = display.object.first(A.Project);
    if(project && P.dmpDocstore.instance(project)) {
        let document = P.dmpDocstore.instance(project).lastCommittedDocument;
        let needsSecuring = false;
        _.each(["personal_data", "sensitive_data"], (field) => {
            // TODO: fix this assumption - depositer should choose which of the datasets
            // listed in the DMP the output record refers to at point as part of the deposit process
            if(document.datasets[0][field] === "yes" || document.datasets[0][field] === "unknown") {
                needsSecuring = true;
            }    
        });
        let accessLevel = display.object.first(A.AccessLevel);
        if(!accessLevel || accessLevel.behaviour === "hres:list:file-access-level:open") {
            builder.panel(1).style("special").element(1, {
                deferred: P.template("dataset-unrestricted-warning").deferredRender()
            });
        }
    }
});
