/* Haplo Research Manager                             http://haplo.org
 * (c) Haplo Services Ltd 2006 - 2016    http://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


// Creates a new workflow definition
// Workflow: http://docs.haplo.org/dev/standard-plugin/workflow/overview
var IngestWorkflow = P.IngestWorkflow = P.workflow.implement("ia", "Data ingest approval").
    objectElementActionPanelName("ingest");

// Creates entities for this workflow, informing each workflow instance of the useful objects that 
// relate to the workflow process
// Entities: http://docs.haplo.org/dev/standard-plugin/workflow/definition/std-features/entities
IngestWorkflow.use("std:entities", {
    "author": ['object', A.Author]
});

// Adding the roles workflow feature, which identifies users by their associated refs, and 
// matches them to the entities defined for this workflow. This allows you to use entities in
// fields such as actionableBy, in the states definition.
IngestWorkflow.use("std:entities:roles");

// Users can add notes to the workflow object, for conducting a conversation about the process
// Workflow notes: http://docs.haplo.org/dev/standard-plugin/workflow/definition/std-features/notes
IngestWorkflow.use("std:notes", {
    canSeePrivateNotes: function(M, user) {
        return user.isMemberOf(Group.ResearchDataManagers);
    }
});

// Releases the dataset as visible to all users on approval by the Research Data Management team.
// Labels and permissions: http://docs.haplo.org/setup/permissions
IngestWorkflow.observeEnter({state:"approved"}, function(M) {
    M.workUnit.ref.load().relabel(O.labelChanges([Label.AcceptedIntoRepository]));
});

// Defines the starting state and properties of the workflow
IngestWorkflow.start(function(M, initial, properties) {
    initial.state = "wait_submit";
});

// Defines the workflow finite state machine
// Workflow states definition: http://docs.haplo.org/dev/standard-plugin/workflow/definition/states
IngestWorkflow.states({
    "wait_submit": {
        actionableBy: "object:creator",
        transitions: [
            ["submit", "wait_rdm_team"]
        ],
        flags: ["editForm"]
    },
    "wait_rdm_team": {
        actionableBy: "hres:group:research-data-managers",
        transitions: [
            ["approve", "approved"],
            ["return", "returned"]
        ]
    },
    "returned": {
        actionableBy: "author",
        transitions: [
            ["submit", "wait_rdm_team"]
        ],
        flags: ["editForm"]
    },
    "approved": {
        finish: true
    }
});
