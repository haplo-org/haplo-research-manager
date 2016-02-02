/* Haplo Research Manager                             http://haplo.org
 * (c) Haplo Services Ltd 2006 - 2016    http://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


// Adds links to the reporting and guides area
P.implementService("std:action_panel:activity:menu:research_data", function(display, builder) {
    if(O.currentUser.isMemberOf(Group.ResearchDataManagers)) {
        builder.panel(100).link(102, "/do/ingest-approval/states-dashboard",
                "Ingest approval progress");
    }
});

// Creates a dashboard of the progress through the states listed of all workflows of this type
// Workflow states dashboard: http://docs.haplo.org/dev/standard-plugin/workflow/definition/std-features/states-dashboard
P.IngestWorkflow.use("std:dashboard:states", {
    title: "Ingest approval progress",
    path: "/do/ingest-approval/states-dashboard",
    canViewDashboard: function(dashboard, user) {
        return user.isMemberOf(Group.ResearchDataManagers);
    },
    states: [
        "wait_submit",
        "wait_rdm_team",
        "returned",
        "approved"
    ]
});
