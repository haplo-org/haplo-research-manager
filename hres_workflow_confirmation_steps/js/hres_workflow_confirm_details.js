/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */

// 
// Adds a state into workflows for confirming relevant details about a project are correct,
// or requesting changes if incorrect
//
// Specification includes:
//  exitStates: array of possible status to transition to. Consuming plugin should resolve if necessary
//  path: the consuming plugin's respond path
//  actionableBy: who is doing the confirming
//  notifyChangeRequested: role to send notification if detail changes are requested
//  details: an array of objects containing:
//       entity: a workflow entity to query
//       attrs: and array of attributes of the above entity that should be confirmed
//  redirect:  optional function giving an alternative url to redirect to after this state
//

var TEXT = {
    "status:wait_confirm_details": "Waiting for details to be confirmed",
    "status-list:wait_confirm_details": "Please confirm details",

    "timeline-entry:_project_details_confirmed": "confirmed details",
    "timeline-entry:_changes_requested": "requested changes"
};

P.workflow.registerWorkflowFeature("hres:confirm_details",
    function(workflow, spec) {
        var plugin = workflow.plugin;

        workflow.states({
            wait_confirm_details: {
                actionableBy: spec.actionableBy,
                transitions: [
                    ["_project_details_confirmed"].concat(spec.exitStates),
                    ["_changes_requested"].concat(spec.exitStates)
                ]
            }
        });

        workflow.text(TEXT);

        workflow.actionPanelTransitionUI({state:"wait_confirm_details"}, function(M, builder) {
            if(M.workUnit.isActionableBy(O.currentUser)) {
                builder.link("default", spec.path+"/confirm-project-details/"+M.workUnit.id,
                    "Confirm project details", "primary");
            }
            return true;
        });

        plugin.respond("GET,POST", spec.path+"/confirm-project-details", [
            {pathElement:0, as:"workUnit", workType:workflow.fullName}
        ], function(E, workUnit) {
            E.setResponsiblePlugin(P);
            var M = workflow.instance(workUnit);
            if(M.state !== "wait_confirm_details") {
                O.stop("Invalid action");
            }
            if(E.request.method === "POST") {
                M.transition("_project_details_confirmed");
                var redirect = spec.redirect ? spec.redirect(M) : null;
                return E.response.redirect(redirect || M.entities.object.url());
            }
            var displayObject = O.object();
            displayObject.appendType(M.entities.object.firstType());
            _.each(spec.details, function(detail) {
                var o = M.entities[detail.entity];
                _.each(detail.attrs, function(attr) {
                    o.every(attr, function(v,d,q) {
                        displayObject.append(v,d,q);
                    });
                });
            });
            E.render({
                pageTitle: "Confirm project details",
                backLink: M.entities.object.url(),
                displayObject: displayObject,
                deferredDates: !spec.disableDatesRender ? 
                    O.serviceMaybe("hres:project_journal:dates:ui:render_overview", 
                        "confirm_details", M.entities.project_refMaybe, {}) : undefined,
                confirmDetails: {
                    text: "Please confirm the details, as shown below, are correct.",
                    backLink: spec.path+"/request-project-detail-change/"+M.workUnit.id,
                    backLinkText: "Request changes",
                    options: [
                        {label: "The project details are correct"}
                    ]
                }
            });
        });

        plugin.respond("GET,POST", spec.path+"/request-project-detail-change", [
            {pathElement:0, as:"workUnit", workType:workflow.fullName},
            {parameter:"changes", as:"string", optional:true}
        ], function(E, workUnit, changes) {
            E.setResponsiblePlugin(P);
            var M = workflow.instance(workUnit);
            if(M.state !== "wait_confirm_details") {
                O.stop("Invalid action");
            }
            if(E.request.method === "POST") {
                O.service("haplo:simple_notification:create", {
                    kind: "hres:project_details_change",
                    recipient: M.getActionableBy(spec.notifyChangeRequested),
                    ref: M.entities.project_ref,
                    data: {
                        changes: changes,
                        researcher: M.entities.researcher_ref.toString()
                    },
                    workflow: M
                });
                M.transition("_changes_requested");
                // TODO replace with service once available
                M.addTimelineEntry("NOTE", {text:changes});
                var redirect = spec.redirect ? spec.redirect(M) : null;
                return E.response.redirect(redirect || M.entities.object.url());
            }
            E.render({
                pageTitle: "Request changes",
                backLink: spec.path+"/confirm-project-details/"+M.workUnit.id
            });
        });

    }
);

P.implementService("haplo:simple_notification:details:hres:project_details_change", function(workUnit) {
    var researcher = O.ref(workUnit.data.researcher).load();
    return {
        text: "Changes to project requested:\n"+workUnit.data.changes,
        taskNote: "Please update this project",
        title: "Change to project details requested - "+researcher.title
    };
});
