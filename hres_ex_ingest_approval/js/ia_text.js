/* Haplo Research Manager                             http://haplo.org
 * (c) Haplo Services Ltd 2006 - 2016    http://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


// Adds text for UI surrounding the workflow process.
// Workflow text system: http://docs.haplo.org/dev/standard-plugin/workflow/definition/text
P.IngestWorkflow.text({
    "workflow-process-name": "Research data ingest approval",

    // Status
    "status:wait_submit": "Waiting to be submitted",
    "status:wait_rdm_team": "Waiting for approval",
    "status:returned": "Waiting for amendments",
    "status:approved": "Approved",

    // Notification emails
    "notification-status:wait_rdm_team": "Ingest approval pending",
    "notification-notes:returned": "Please make the ammendments requested by the Repository team.",

    // Task list
    "status-list:wait_submit": "Please submit the output and submission forms for approval",
    "status-list:wait_rdm_team": "Please review the output and metadata for ingestion",
    "status-list:wait_returned": "Please make the required amendments to the output and metadata",

    "action-label": "Proceed with ingest",

    // Transitions
    "transition:submit": "Submit",
    "transition-indicator:submit": "primary",
    "transition-notes:submit": "Confirm submission of output for approval.",
    
    "transition:approve": "Approve",
    "transition-indicator:approve": "primary",
    "transition-notes:approve": "Confirm approval of output for ingestion.",
    
    "transition:return": "Return",
    "transition-indicator:return": "secondary",
    "transition-notes:return": "Return the output to the researcher for amendments. Please add notes explaining "+
            "the changes required for approval.",

    // Timeline
    "timeline-entry:START": "uploaded the output",
    "timeline-entry:submit": "submitted the output for approval",
    "timeline-entry:return": "returned the output for amendments",
    "timeline-entry:approve": "approved the output"
});
