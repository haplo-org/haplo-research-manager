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

P.sendEmail = function(user, template, viewIn) {
    var view = _.extend({
        toUser: user,
        applicationName: O.application.name
    }, viewIn);
    O.email.template("hres:email-template:external-user-email").deliver(
        user.email, user.name, "Welcome to "+O.application.name,
        P.template("email/"+template).render(view));
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
        userDetails.ref = researcher.ref;
        userDetails.groups = [Group.ExternalResearcherAccount];
        try {
            user = O.setup.createUser(userDetails);
        } catch (exception) {
            //TODO: Change regex in haplo/lib/common/kextend_rails_and_ruby.rb to a better one
            E.response.redirect("/do/hres-external-researchers/bad-email/" + userDetails.ref.toString());
            return;
        }

        if(user) {
            O.serviceMaybe("hres_external_researchers:handle_details", user, document);
            user.data["hres_external_researchers:activation_link_sent"] = new XDate();
            O.audit.write({
                auditEntryType: "hres_external_researchers:new_external_user",
                ref: researcher.ref
            });
            P.sendEmail(user, "new_user", {
                welcomeUrl: user.generateWelcomeURL()
            });
        }
        E.response.redirect(researcher.url());
    }

    if(detailsMissing) {
        E.render({
            pageTitle: "Missing data",
            backLink: researcher.url(),
            researcher: researcher,
            userDetails: userDetails
        }, "details-missing");
    } else {
        E.render({
            pageTitle: "Request external access",
            backLink: researcher.url(),
            researcher: researcher,
            userDetails: userDetails,
            text: "Confirm external access for the "+NAME("External Researcher"),
            form: form
        });
    }
});

P.respond("GET", "/do/hres-external-researchers/bad-email", [
    {pathElement:0, as: "object"}
], function(E, researcher) {
    E.render({
        pageTitle: "Invalid Email Address",
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
    E.render({
        pageTitle: "Reactivate user",
        backLink: researcher.url(),
        text: "The "+NAME("External Researcher")+" has a previously existing user account. Confirm to reactivate it.",
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
    E.render({
        pageTitle: "Revoke access",
        backLink: researcher.url(),
        text: "Confirm revocation of "+researcher.title+"'s external access",
        options: [{label: "Confirm"}]
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
    var view = {
        pageTitle: "Resend password setting email",
        backLink: researcher.url(),
        text: "Email "+researcher.title+" instructions for getting started on "+O.application.name,
        options: [{ label: "Confirm" }]
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
            user.setDetails({
                nameFirst: user.nameFirst,
                nameLast: user.nameLast,
                email: email.s()
            });
        }
    }
});

P.respond("GET", "/do/hres-external-researchers/email-address-in-use", [
    {pathElement:0, as:"object"}
], function(E, researcher) {
    E.render({
        pageTitle: "Email address already in use",
        backLink: researcher.url(),
        message: "The email address is already in use by another user. The record will "+
            "be updated however the user account for "+researcher.title+
            " will not be updated with this email address",
        dismissText: "OK",
        dismissLink: researcher.url()
    }, "std:ui:notice");
});
