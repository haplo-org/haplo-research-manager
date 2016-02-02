/* Haplo Research Manager                             http://haplo.org
 * (c) Haplo Services Ltd 2006 - 2016    http://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


// Creates link on the homepage action panel to a reporting and guides area
P.implementService("haplo_activity_navigation:discover", function(activity) {
    activity(40, "research-data", "Research data", "E226,1,f", undefined /* All users can edit */);
});

// ------------------------------------------------------------------------

// Permissions for starting the workflow process
var canStartProcess = function(user, object) {
    var userRef = O.currentUser.ref;
    return (
        (userRef && object.has(userRef, A.Author)) ||
        (object.creationUid === O.currentUser.id)
    );
};

// Adding workflow creation link to object page
// Action panel: http://docs.haplo.org/dev/standard-plugin/action-panel
P.implementService("std:action_panel:ingest", function(display, builder) {
    var M = O.service("std:workflow:for_ref", "hres_ex_ingest_approval:ia", display.object.ref);
    if(M) { return; } // already started
    if(canStartProcess(O.currentUser, display.object)) {
        builder.panel(100).link(100,
            "/do/ingest-approval/start/"+display.object.ref, "Ingest approval", "primary");
    }
});

// Request handler for workflow creation confirmation
// Request handlers: http://docs.haplo.org/dev/plugin/request-handling
P.respond("GET,POST", "/do/ingest-approval/start", [
    {pathElement:0, as:"object"}
], function(E, dataset) {
    if(!canStartProcess(O.currentUser, dataset)) { O.stop("Not permitted."); }
    if(E.request.method === "POST") {
        var M = P.IngestWorkflow.create({object:dataset});
        E.response.redirect("/do/ingest-approval/submission/form/"+M.workUnit.id);
    }
    E.render({
        pageTitle: "Begin ingest",
        backLink: dataset.url(),
        text: "Submit dataset to the Research Data Management team for assesment of the metadata and ingest.",
        options: [{label:"Submit"}]
    }, "std:ui:confirm");
});
