/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */

/*HaploDoc
node: /hres_workflow_confirmation_steps/confirm_roles
title: Confirm roles
sort: 1
--
h3(feature). hres:confirm_roles

Add people to attributes on the workflow object. Begin with:

<pre>language=javascript
EgWorkflow.use("hres:confirm_roles", {
    ...
});
</pre>

and set the following:

h3(property). path

**DEPRECATED**: wasn't needed.

h3(property). pageTitle

A string used to describe the process. Defaults to @"Confirm roles"@.

h3(property). states

A list of Confirm Roles State objects (see below).

to define the behaviour.

h2. Confirm Roles State

A JavaScript object which you can set options:

h3(property). state

**REQUIRED**: string name of the state where roles can be confirmed.

h3(function). redirect(M)

Return a URL to a page to go to after confirmation.

Default is transition UI or if no transitions available workflow object page.

h3(property). roles

A list of Confirm Role objects (see below).

h2. Confirm Role

A JavaScript object which you can set options:

h3(property). role

**REQUIRED**: A string  specifying the Form element path.

h3(property). descQual

**REQUIRED**: Schema API codes in the form of @[attribute, qualifier]@ (qualifier is optional).

h3(property). roleTitle

**REQUIRED**: string name of the label of the form element to be used to enter the role.

h3(property). transitionsToBlock

A list of transition name strings to filter if workflow object has no values under required @descQual@.

h3(function). defaultPerson(M)

**DEPRECATED**: wrong API name. See @initialPerson@.

h3(function). initialPerson(M)

Return a person @Ref@ object to pre-fill form element before roles are confirmed. When confirmed, editing will be on the confirmed roles found on the workflow object.

Accepted types are annotated with @hres:annotation:confirm-roles:eligible-person@.

Use @initialPeople@ instead if the role is composed of a list of people.

h3(property). minimumCount

The minimum number of people to confirm for the role.

h3(property). maximumCount

The maximum number of people to confirm for the role.

h3(function). initialPeople(M)

If options @minimumCount@ or @maximumCount@ are used return a list of person @Ref@ objects to pre-fill form element before roles are confirmed. See @initialPerson@ for more information.

h3(property). required

Boolean specifying if this role must be confirmed.

Defaults to @true@ if @minimumCount@ is specified.
*/

P.dataSource("people", "object-lookup", SCHEMA.getTypesWithAnnotation("hres:annotation:confirm-roles:eligible-person"));

var multiplePeopleInRole = function(roleInfo) {
    return "minimumCount" in roleInfo || "maximumCount" in roleInfo;
};

var appendRefStrToMutableObject = function(mutableCopy, value, descQual) {
    mutableCopy.append.apply(mutableCopy, [O.ref(value)].concat(descQual));
};

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

var SPECIFICATIONS = {};
var FORMS = {};

P.workflow.registerWorkflowFeature("hres:confirm_roles", 
    function(workflow, spec) {
        SPECIFICATIONS[workflow.fullName] = spec;
        FORMS[workflow.fullName] = {};

        _.each(spec.states, function(stateInfo) {
            var state = stateInfo.state;

            FORMS[workflow.fullName][state] = P.form({
                specificationVersion: 0,
                formId: "confirmRole"+state,
                pageTitle: spec.pageTitle || "Confirm roles",
                elements: _.map(stateInfo.roles, function(roleInfo) {
                    var lookupElement = {
                        type: "lookup",
                        path: roleInfo.role,
                        explanation: roleInfo.explanation,
                        label: "Confirm "+roleInfo.roleTitle,
                        dataSource: "people",
                        required: roleInfo.required || false
                    };
                    if(!multiplePeopleInRole(roleInfo)) {
                        return lookupElement;
                    }
                    return _.chain(lookupElement).
                        omit("dataSource", "required").
                        extend({
                            type: "repeating-section",
                            elements: [
                                _.chain(lookupElement).
                                    omit("label", "required", "explanation").
                                    extend({ path: "." }).value()
                            ]
                        }, _.pick(roleInfo, "minimumCount", "maximumCount")).value();
                })
            });

            workflow.actionPanel({state:state}, function(M, builder) {
                if(M.workUnit.isActionableBy(O.currentUser)) {
                    var confirmed = rolesConfirmed(stateInfo.roles, M.entities.object);
                    builder.link("default", "/do/hres-workflow-confirmation-steps/confirm-roles/"+
                        M.workUnit.id, (spec.pageTitle || "Confirm roles"),
                        confirmed ? "standard" : "primary");
                }
            });

            workflow.filterTransition({state:state}, function(M, name) {
                // Not using entities as it will be an outdated version
                var object = M.workUnit.ref.load();
                var requiredRoles = _.filter(stateInfo.roles, function(role) {
                    return role.required || "minimumCount" in role;
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
    }
);

P.respond("GET,POST", "/do/hres-workflow-confirmation-steps/confirm-roles", [
    {pathElement:0, as:"workUnit"}
], function(E, workUnit) {
    var M = O.service("std:workflow:for_ref", workUnit.workType, workUnit.ref);
    if(!FORMS[workUnit.workType][M.state]) { O.stop("Invalid state"); }
    var object = M.entities.object;
    var document = {};
    var stateInfo = _.find(SPECIFICATIONS[workUnit.workType].states, function(stateInfo) {
        return (stateInfo.state === M.state);
    });
    _.each(stateInfo.roles, function(roleInfo) {
        if(!multiplePeopleInRole(roleInfo)) {
            document[roleInfo.role] = object.first.apply(object, roleInfo.descQual) ||
                (roleInfo.initialPerson ? roleInfo.initialPerson(M) : undefined) ||
                (roleInfo.defaultPerson ? roleInfo.defaultPerson(M) : undefined) || // Deprecated.
                undefined;
        } else {
            document[roleInfo.role] = object.every.apply(object, roleInfo.descQual);
            if(!document[roleInfo.role].length && roleInfo.defaultPerson) {
                document[roleInfo.role] = roleInfo.initialPeople(M) || [];
            }
        }
    });
    var form = FORMS[workUnit.workType][M.state].handle(document, E.request);
    if(form.complete) {
        var mObject = object.mutableCopy();
        _.each(_.pluck(stateInfo.roles, 'descQual'), function(descQual) {
            mObject.remove.apply(mObject, [descQual[0], Q.Null]);
            mObject.remove.apply(mObject, descQual);
        });
        _.each(stateInfo.roles, function(roleInfo) {
            if(!multiplePeopleInRole(roleInfo)) {
                var refStr = document[roleInfo.role];
                if(refStr) {
                    appendRefStrToMutableObject(mObject, refStr, roleInfo.descQual);
                }
            } else {
                _.each(document[roleInfo.role], function(refStr) {
                    appendRefStrToMutableObject(mObject, refStr, roleInfo.descQual);
                });
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
        pageTitle: (SPECIFICATIONS[workUnit.workType].pageTitle || "Confirm roles"),
        backLink: object.url(),
        form: form
    });
});
