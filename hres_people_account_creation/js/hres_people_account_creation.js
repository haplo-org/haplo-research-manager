/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2021            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


const DISABLE_AUTOMATIC_ACCOUNTS_CREATION = O.application.config["hres:disable_automatic_accounts_creation"] || false;

var workflows = {};
var workflowSpecs = {};

var canSelectNewUsers = function(M, spec) {
    return M.hasRole(O.currentUser, spec.approver) || (spec.approver in GROUP) && O.currentUser.isMemberOf(GROUP[spec.approver]);
};

var getNewPersonFromDocument = function(key, spec, document, currentIdentifier) {
    let picker = O.serviceMaybe("haplo:people-picker:get-picker-details", key, spec.pickerName);
    let kindAllowEntryNew = getKindAllowEntryNew(picker);
    let newPerson;
    _.some(kindAllowEntryNew, (kind) => {
        newPerson = _.find(document[picker.documentPropertyName][kind], (person) => {
            if(currentIdentifier) {
                return !person.ref && (person.identifier !== currentIdentifier);
            } else {
                return !person.ref;
            }
        });
        if(newPerson) { _.extend(newPerson, {kind: kind}); }
        return newPerson;
    });
    return newPerson;
};

var getKindSpec = function(picker, kindName) {
    return _.find(picker.kinds, (kindSpec) => {
        return kindSpec.kind === kindName;
    });
};

var getKindAllowEntryNew = function(picker) {
    let kinds = [];
    _.each(picker.kinds, (kindSpec) => {
        if(kindSpec.allowEnterNew) { kinds.push(kindSpec.kind); }
    });
    return kinds;
};

var findObjectWithIdentifier = function(types, identifier, desc) {
    let results = O.query().link(types, A.Type).
        identifier(identifier, desc).
        execute();
    return results.length ? results[0] : null;
};

var createNewUsersAndObjectsMaybe = function(key, pickerName, instance, nominationDocument, workflow) {
    let picker = O.serviceMaybe("haplo:people-picker:get-picker-details", key, pickerName);
    let kindAllowEntryNew = getKindAllowEntryNew(picker);
    _.each(kindAllowEntryNew, (kind) => {
        let kindSpec = getKindSpec(picker, kind);
        // Service could attempt to create for forms not yet filled in
        if(!(picker.documentPropertyName in nominationDocument)) { return; }
        _.each(nominationDocument[picker.documentPropertyName][kind], (details) => {
            if(details.ref) { return; }
            let email = O.text(O.T_IDENTIFIER_EMAIL_ADDRESS, details.newPerson.email);
            let existingUser = findObjectWithIdentifier(kindSpec.types, email, A.Email);
            if(existingUser) { return; }

            const type = O.ref(details.newPerson.type);
            if(SCHEMA.getTypeInfo(type).rootType == T.Person) {
                // Create a new object for the user.
                let mPerson = O.object();
                mPerson.append(type, A.Type);
                mPerson.append(email, A.Email);
                mPerson.appendTitle(O.text(O.T_TEXT_PERSON_NAME, {
                    title: details.newPerson.title || "",
                    first: details.newPerson.firstName,
                    last: details.newPerson.lastName
                }));
                O.withoutPermissionEnforcement(() => {
                    mPerson.save();
                });

                let user = O.serviceMaybe("hres_external_researchers:setup_account_for_user_object", mPerson);
                O.serviceMaybe("haplo:people-picker:replace-new-person-with-ref", key, instance, pickerName, kind, details.identifier, user.ref);
            }
        });
    });
};

P.implementService("hres_people_account_creation:create_accounts_for_picker", createNewUsersAndObjectsMaybe);

P.workflow.registerWorkflowFeature("hres_people_account_creation:external_user_setup", function(workflow, spec) {

    workflowSpecs[spec.type] = spec;
    workflows[spec.type] = workflow;

    workflow.states({
        dispatch_account_creation: {
            dispatch: ["wait_account_creation", spec.finalState]
        },
        wait_account_creation: {
            actionableBy: spec.approver,
            transitions: [
                ["_complete", spec.finalState]
            ]
        }
    });

    workflow.resolveDispatchDestination({state:"dispatch_account_creation"}, function(M, transition) {
        return DISABLE_AUTOMATIC_ACCOUNTS_CREATION ? "wait_account_creation" : spec.finalState;
    });

    if(DISABLE_AUTOMATIC_ACCOUNTS_CREATION) {
        workflow.actionPanelTransitionUI({state:"wait_account_creation"},
            function(M, builder) {
                // override progress transition in UI
                return false;
            }
        );

        workflow.actionPanel({state:"wait_account_creation"}, function(M, builder) {
            if(canSelectNewUsers(M, spec)) {
                let nominationDocument = workflow.documentStore[spec.documentStoreName].instance(M).currentDocument;
                let newPerson = getNewPersonFromDocument(M, spec, nominationDocument);
                if(newPerson) {
                    builder.panel(100).link("default", "/do/hres-people-account-creation/select/"+spec.type+"/"+M.workUnit.id+"/"+newPerson.identifier+"?kind="+newPerson.kind, "Select user", "primary");
                }
            }
        });

        workflow.text({
            "status:wait_account_creation": "Waiting for user account creation"
        });
    } else {
        workflow.observeEnter({state:spec.finalState}, function(M, transition) {
            let instance = workflow.documentStore[spec.documentStoreName].instance(M);
            createNewUsersAndObjectsMaybe(M, spec.pickerName, instance, instance.lastCommittedDocument, workflow);
            O.serviceMaybe("hres_people_account_creation:notify:users_created", M);
        });
    }
});
P.respond("GET,POST", "/do/hres-people-account-creation/select", [
    {pathElement:0, as:"string"},
    {pathElement:1, as:"workUnit", allUsers:true},
    {pathElement:2, as:"string"},
    {parameter:"kind", as:"string"}
], function(E, type, workUnit, identifier, kindName) {
    let workflow = workflows[type];
    let spec = workflowSpecs[type];
    let M = workflow.instance(workUnit);
    if(!canSelectNewUsers(M, spec)) {
        O.stop("Not permitted");
    }
    let instance = workflow.documentStore[spec.documentStoreName].instance(M);
    let nominationDocument = instance.lastCommittedDocument;
    let picker = O.serviceMaybe("haplo:people-picker:get-picker-details", M, spec.pickerName);
    let details = _.find(nominationDocument[picker.documentPropertyName][kindName], (person) => {
        return person.identifier === identifier;
    });
    let name = details.newPerson.firstName + " " + details.newPerson.lastName;
    let noMatch = false;
    let kindSpec = getKindSpec(picker, kindName);

    let results = O.query().
        link(kindSpec.types, ATTR.Type).
        or(sq => {
            sq.identifier(O.text(O.T_IDENTIFIER_EMAIL_ADDRESS, details.newPerson.email), A.Email).
            freeText(name.split(/\s+/g).map(e => e+'*').join(' '), ATTR.Title);
        }).
        sortByTitle().
        execute();

    if(!results.length) {
        noMatch = true;
        results = O.query().
            link(kindSpec.types, ATTR.Type).
            sortByTitle().
            execute();
        results = _.filter(results, (r) => {
            let today = new XDate();
            let user = O.user(r.ref);
            // Only display active users created within last 2 weeks
            return (new XDate(r.creationDate).diffDays(today.addWeeks(-2)) <= 0 && user && user.isActive);
        });
    } else {
        // Filter out non-active users
        results = _.filter(results, (r) => {
            let user = O.user(r.ref);
            return user && user.isActive;
        });
    }

    if(E.request.method === "POST") {
        let redirectLink;
        let newPerson = getNewPersonFromDocument(M, spec, instance.currentDocument, identifier);

        if(!("__skip" in E.request.parameters)) {
            let personRef = O.ref(E.request.parameters.person);
            // Update nomination form
            let document = O.serviceMaybe("haplo:people-picker:replace-new-person-with-ref", M, instance, spec.pickerName, kindName, identifier, personRef);
            let userObject = O.ref(personRef).load();
            let externalDocument;
            newPerson = getNewPersonFromDocument(M, spec, document, identifier);
            if(!newPerson) {
                M.transition("_complete");
            }
        }
        if(newPerson) {
            redirectLink = "/do/hres-people-account-creation/select/"+spec.type+"/"+M.workUnit.id+"/"+newPerson.identifier+"?kind="+newPerson.kind;
        } else {
            redirectLink = M.workUnit.ref.load().url();
        }
        E.response.redirect(redirectLink);
    }

    E.render({
        id: workUnit.id,
        details: details.newPerson,
        noMatch: noMatch,
        results: _.map(results, (person) => {
            let infoBlocks = [];
            infoBlocks.push({
                email: person.first(A.Email)
            });
            return {
                person: person,
                infoBlocks: infoBlocks
            };
        }),
        backLink: M.workUnit.ref.load().url(),
        backLinkText: "Back"
    }, "person-select");
});
