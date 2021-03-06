/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


P.hresSchemaNAME.addTypeNamesFromSchema(T, [
    ['External Researcher', 'ExternalResearcher']
]);

P.canRequestAccess = O.action("hres_external_researchers:can_request_external_access").
    title("Can request external access").
    allow("group", Group.Administrators);

// ------ Helper functions -------

var validateUserExistsIsActiveAndIsExternal = function(user) {
    if(!user) { O.stop("Researcher does not have access"); }
    if(!user.isActive) { O.stop("User is already blocked"); }
    if(!user.isMemberOf(Group.ExternalResearcherAccount)) {
        O.stop("Not an "+NAME("External Researcher"));
    }
};

var userHasAccess = function(user) {
    return (
        user &&
        user.isActive && 
        !O.serviceMaybe("hres_external_researchers:prevent_user_access", user)
    );
};

P.implementService("std:action_panel:external_researcher", function(display, builder) {
    if(O.currentUser.allowed(P.canRequestAccess)) {
        var user = O.user(display.object.ref);
        if(userHasAccess(user)) {
            if(user.isMemberOf(Group.ExternalResearcherAccount)) {
                builder.
                    link("default", "/do/hres-external-researchers/revoke-access/"+
                        display.object.ref.toString(), "Revoke access").
                    link("default", "/do/hres-external-researchers/resend-access/"+user.ref,
                        "Resend password setting link");
            }
        } else {
            builder.link("default", "/do/hres-external-researchers/request-external-access/"+
                display.object.ref.toString(), "Request external access");
        }
    }
});

P.implementService("hres_external_researchers:setup_account_for_user_object", function(userObject, document, workflowFullName) {
    var userDetails = {};
    var user;
    var names = userObject.firstTitle().toFields();
    userDetails.nameFirst = names.first;
    userDetails.nameLast = names.last;
    userDetails.email = userObject.first(A.EmailAddress).toString();
    userDetails.ref = userObject.ref;
    userDetails.groups = [Group.ExternalResearcherAccount];
    try {
        user = O.setup.createUser(userDetails);
    } catch (exception) {
        O.stop("Invalid email address");
    }

    if(user) {
        if(document) { O.serviceMaybe("hres_external_researchers:handle_details", user, document); }
        user.data["hres_external_researchers:activation_link_sent"] = new XDate();
        O.audit.write({
            auditEntryType: "hres_external_researchers:new_external_user",
            ref: userObject.ref
        });
        P.sendEmail(user, "new_user", {
            welcomeUrl: user.generateWelcomeURL()
        }, workflowFullName);
        return user;
    }
});

P.sendEmail = function(user, template, viewIn, workflowFullName) {
    var view;
    if(template === "new_user") {
        var spec = O.serviceMaybe("hres_external_researchers:customise_new_user_email", user, viewIn.welcomeUrl, workflowFullName);
        var specTemplateMaybe = (spec && spec.template) ? spec.template : P.template("email/"+template);
        var subject;
        var userName;
        if(spec) {
            userName = spec.toName ? spec.toName : user.name;
            if(spec.view) {
                view = spec.view;
                subject = spec.view.subject ? spec.view.subject : "Welcome to "+O.application.name;
            }
        }
        view = _.extend((view || {}), {
                toUser: user,
                applicationName: O.application.name,
                welcomeUrl: viewIn.welcomeUrl
            });
        O.email.template("hres:email-template:external-user-email").deliver(user.email, (userName || user.name), (subject || "Welcome to "+O.application.name), specTemplateMaybe.render(view));
    } else {
        view = _.extend({
            toUser: user,
            applicationName: O.application.name
        }, viewIn);
        O.email.template("hres:email-template:external-user-email").deliver(
            user.email, user.name, "Welcome to "+O.application.name,
            P.template("email/"+template).render(view));
    }
};

P.respond("GET,POST", "/do/hres-external-researchers/request-external-access", [
    {pathElement:0, as:"object"}
], function(E, researcher) {
    P.canRequestAccess.enforce();
    var user = O.user(researcher.ref);
    if(user) {
        E.response.redirect("/do/hres-external-researchers/reactivate-user/"+
            researcher.ref.toString());
    }
    var userDetails = {};
    var detailsMissing = false;
    var names = researcher.firstTitle().toFields();
    if(names.first) { userDetails.nameFirst = names.first; } else { detailsMissing = true; }
    if(names.last) { userDetails.nameLast = names.last; } else { detailsMissing = true; }
    var email = researcher.first(A.EmailAddress);
    if(email) { userDetails.email = email.s(); } else { detailsMissing = true; }
    
    // Add optional details form
    var form;
    var document = {};
    var formMaybe = O.serviceMaybe("hres_external_researchers:details_form");
    if(formMaybe) {
        form = formMaybe.handle(document, E.request);
    }
    
    if(E.request.method === "POST") {
        if(O.user(userDetails.email)) { O.stop("An account with this email address already exists"); }

        O.serviceMaybe("hres_external_researchers:setup_account_for_user_object", researcher, document);
        E.response.redirect(researcher.url());
    }
    var i = P.locale().text("template");
    if(detailsMissing) {
        E.render({
            pageTitle: i["Missing data"],
            backLink: researcher.url(),
            researcher: researcher,
            userDetails: userDetails
        }, "details-missing");
    } else {
        E.render({
            pageTitle: i["Request external access"],
            backLink: researcher.url(),
            researcher: researcher,
            userDetails: userDetails,
            text: i["Confirm external access for the NAME(External Researcher)"],
            form: form
        });
    }
});

P.respond("GET", "/do/hres-external-researchers/bad-email", [
    {pathElement:0, as: "object"}
], function(E, researcher) {
    var i = P.locale().text("template");
    E.render({
        pageTitle: i["Invalid Email Address"],
        backLink: researcher.url(),
        researcher: researcher
    }, "bad-email");
});

P.respond("GET,POST", "/do/hres-external-researchers/reactivate-user", [
    {pathElement:0, as:"object"}
], function(E, researcher) {
    P.canRequestAccess.enforce();
    var user = O.user(researcher.ref);
    if(!user) { O.stop(NAME("External Researcher")+" does not have existing account"); }
    if(!user.isMemberOf(Group.ExternalResearcherAccount)) { O.stop("Not an "+NAME("External Researcher")); }
    
    // Add optional details form
    var form;
    var document = {};
    var formMaybe = O.serviceMaybe("hres_external_researchers:details_form");
    if(formMaybe) {
        form = formMaybe.handle(document, E.request);
    }
    
    if(E.request.method === "POST") {
        user.setIsActive(true);
        O.serviceMaybe("hres_external_researchers:handle_details", user, document);
        var linkSent = user.data["hres_external_researchers:activation_link_sent"];
        if(!linkSent) {
            user.data["hres_external_researchers:activation_link_sent"] = new XDate();
        }
        E.response.redirect(researcher.url());
        P.sendEmail(user, "reactivated_user", {
            appUrl: O.application.url
        });
    }
    var i = P.locale().text("template");
    E.render({
        pageTitle: i["Reactivate user"],
        backLink: researcher.url(),
        text: i["The NAME(External Researcher) has a previously existing user account. Confirm to reactivate it."],
        form: form
    }, "request-external-access");
});

P.respond("GET,POST", "/do/hres-external-researchers/revoke-access", [
    {pathElement:0, as:"object"}
], function(E, researcher) {
    P.canRequestAccess.enforce();
    var user = O.user(researcher.ref);
    validateUserExistsIsActiveAndIsExternal(user);
    if(E.request.method === "POST") {
        user.setIsActive(false);
        return E.response.redirect(researcher.url());
    }
    var i = P.locale().text("template");
    E.render({
        pageTitle: i["Revoke access"],
        backLink: researcher.url(),
        text: O.interpolateString(i["Confirm revocation of {title}'s external access"], {title: researcher.title}),
        options: [{label: i["Confirm"]}]
    }, "request-external-access");
});

P.respond("GET,POST", "/do/hres-external-researchers/resend-access", [
    {pathElement:0, as:"object"}
], function(E, researcher) {
    P.canRequestAccess.enforce();
    var user = O.user(researcher.ref);
    validateUserExistsIsActiveAndIsExternal(user);
    if(E.request.method === "POST") {
        var emailView = { welcomeUrl: user.generateWelcomeURL() };
        P.sendEmail(user, "new_user", emailView);
        return E.response.redirect(researcher.url());
    }
    var i = P.locale().text("template");
    var view = {
        pageTitle: i["Resend password setting email"],
        backLink: researcher.url(),
        text: O.interpolateString(i["Email {title} instructions for getting started on {application}"], {
            title: researcher.title,
            application: O.application.name
        }),
        options: [{ label: i["Confirm"] }]
    };
    E.render(view, "std:ui:confirm");
});

P.hook("hPostObjectEdit", function(response, object, previous) {
    if(!object.isKindOf(T.ExternalResearcher)) { return; }
    var email = object.first(A.EmailAddress);
    var user = O.user(object.ref);
    if(email && user && (email.s() !== user.email) && user.isMemberOf(Group.ExternalResearcherAccount)) {
        var dupUser = O.user(email.s());
        if(dupUser) {
            response.redirectPath = "/do/hres-external-researchers/email-address-in-use/"+
                object.ref.toString();
        } else {
            try {
                user.setDetails({
                    nameFirst: user.nameFirst,
                    nameLast: user.nameLast,
                    email: email.s()
                });
            } catch (exception) {
                response.redirectPath = "/do/hres-external-researchers/bad-email/"+object.ref;
            }
        }
    }
});

P.respond("GET", "/do/hres-external-researchers/email-address-in-use", [
    {pathElement:0, as:"object"}
], function(E, researcher) {
    var i = P.locale().text("template");
    E.render({
        pageTitle: i["Email address already in use"],
        backLink: researcher.url(),
        message: O.interpolateString(i["The email address is already in use by another user. The record will be updated however the user account for {researcher} will not be updated with this email address"], {researcher: researcher.title}),
        dismissText: i["OK"],
        dismissLink: researcher.url()
    }, "std:ui:notice");
});
