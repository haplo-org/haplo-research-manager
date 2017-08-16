/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */

/*
*   Feature for confirming roles within a workflow. Adds those people to attributes on the workflow
*   object.
*
*   Specification:
*    path: consuming plugin's respond path
*    pageTitle: specify custom page title
*    states: array of objects containing keys:
*      state: state in which roles are confirmed
*      redirect: optional function to redirect after confirmation
*      roles: array of objects specifiying roles to be confirmed
*        role: path to role information in form document
*        descQual: [attribute, qualifier] for the role to be saved onto the workflow object
*        roleTitle: Display name of the role
*        transitionsToBlock: array of transitions prevented until this role is confirmed
*        defaultPerson: optional function
*        required: optional bool, defaults to false
*/

P.dataSource("people", "object-lookup", [T.DoctoralResearcher, T.Researcher, T.Staff]);

var rolesConfirmed = function(roles, object) {
    var confirmed = true;
    _.find(roles, function(roleInfo) {
        if(!object.first.apply(object, roleInfo.descQual)) {
            confirmed = false;
            return true;
        }
    });
    return confirmed;
};

P.workflow.registerWorkflowFeature("hres:confirm_roles", 
    function(workflow, spec) {
        var plugin = workflow.plugin;
        var forms = {};

        _.each(spec.states, function(stateInfo) {
            var state = stateInfo.state;

            forms[state] = P.form({
                specificationVersion: 0,
                formId: "confirmRole"+state,
                pageTitle: spec.pageTitle || "Confirm roles",
                elements: _.map(stateInfo.roles, function(roleInfo) {
                    return {
                        type: "lookup",
                        path: roleInfo.role,
                        label: "Confirm "+roleInfo.roleTitle,
                        dataSource: "people",
                        required: roleInfo.required || false
                    };
                })
            });

            workflow.actionPanel({state:state}, function(M, builder) {
                if(M.workUnit.isActionableBy(O.currentUser)) {
                    var confirmed = rolesConfirmed(stateInfo.roles, M.entities.object);
                    builder.link("default", spec.path+"/confirm-roles/"+M.workUnit.id,
                        (spec.pageTitle || "Confirm roles"), confirmed ? "standard" : "primary");
                }
            });

            workflow.filterTransition({state:state}, function(M, name) {
                // Not using entities as it will be an outdated version
                var object = M.workUnit.ref.load();
                var requiredRoles = _.filter(stateInfo.roles, function(role) {
                    return role.required;
                });
                for(var i = 0; i < requiredRoles.length; i++) {
                    var roleInfo = requiredRoles[i];
                    var confirmed = object.first.apply(object, roleInfo.descQual);
                    if(!confirmed && roleInfo.transitionsToBlock && (roleInfo.transitionsToBlock.indexOf(name) !== -1)) {
                        return false;
                    }
                }
            });
        });

        plugin.respond("GET,POST", spec.path+"/confirm-roles", [
            {pathElement:0, as:"workUnit", workType:workflow.fullName}
        ], function(E, workUnit) {
            E.setResponsiblePlugin(P);
            var M = workflow.instance(workUnit);
            if(!forms[M.state]) { O.stop("Invalid state"); }
            var object = M.entities.object;
            var document = {};
            var stateInfo = _.find(spec.states, function(stateInfo) {
                return (stateInfo.state === M.state);
            });
            _.each(stateInfo.roles, function(roleInfo) {
                document[roleInfo.role] = object.first.apply(object, roleInfo.descQual) ||
                    (roleInfo.defaultPerson ? roleInfo.defaultPerson(M) : undefined);
            });
            var form = forms[M.state].handle(document, E.request);
            if(form.complete) {
                var mObject = object.mutableCopy();
                _.each(stateInfo.roles, function(roleInfo) {
                    var refStr = document[roleInfo.role];
                        mObject.remove.apply(mObject, [roleInfo.descQual[0], Q.Null]);
                        mObject.remove.apply(mObject, roleInfo.descQual);
                    if(refStr) {
                        mObject.append.apply(mObject, [O.ref(refStr)].concat(roleInfo.descQual));
                    }
                });
                O.withoutPermissionEnforcement(function() {
                    if(!object.valuesEqual(mObject)) {
                        mObject.save();
                    }
                });
                if(stateInfo.redirect) {
                    return E.response.redirect(stateInfo.redirect(M));
                }
                if(!M.transitions.empty) {
                    return E.response.redirect("/do/workflow/transition/"+M.workUnit.id);
                }
                return E.response.redirect(object.url());
            }
            E.render({
                pageTitle: (spec.pageTitle || "Confirm roles"),
                backLink: object.url(),
                form: form
            });
        });
    }
);
