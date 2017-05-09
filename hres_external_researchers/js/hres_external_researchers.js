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

P.implementService("std:action_panel:external_researcher", function(display, builder) {
    if(O.currentUser.allowed(P.canRequestAccess)) {
        var user = O.user(display.object.ref);
        if(user && user.isActive) {
            if(user.isMemberOf(Group.ExternalResearcherAccount)) {
                builder.link("default", "/do/hres-external-researchers/revoke-access/"+
                    display.object.ref.toString(), "Revoke access");
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
    if(user && user.isActive) { O.stop(NAME("External Researcher")+" already has access"); }
    else if(user) {
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
    if(E.request.method === "POST") {
        if(O.user(userDetails.email)) { O.stop("An account with this email address already exists"); }
        userDetails.ref = researcher.ref;
        userDetails.groups = [Group.ExternalResearcherAccount];
        user = O.setup.createUser(userDetails);
        if(user) {
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
            options: [{label: "Confirm"}]
        });
    }
});

P.respond("GET,POST", "/do/hres-external-researchers/reactivate-user", [
    {pathElement:0, as:"object"}
], function(E, researcher) {
    P.canRequestAccess.enforce();
    var user = O.user(researcher.ref);
    if(!user) { O.stop(NAME("External Researcher")+" does not have existing account"); }
    if(user.isActive) { O.stop("User is already active"); }
    if(!user.isMemberOf(Group.ExternalResearcherAccount)) { O.stop("Not an "+NAME("External Researcher")); }
    if(E.request.method === "POST") {
        user.setIsActive(true);
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
        options:[{label:"Confirm"}]
    }, "std:ui:confirm");
});

P.respond("GET,POST", "/do/hres-external-researchers/revoke-access", [
    {pathElement:0, as:"object"}
], function(E, researcher) {
    P.canRequestAccess.enforce();
    var user = O.user(researcher.ref);
    if(!user) { O.stop("Researcher does not have access"); }
    if(!user.isActive) { O.stop("User is already blocked"); }
    if(!user.isMemberOf(Group.ExternalResearcherAccount)) { O.stop("Not an "+NAME("External Researcher")); }
    if(E.request.method === "POST") {
        user.setIsActive(false);
        return E.response.redirect(researcher.url());
    }
    E.render({
        pageTitle: "Revoke access",
        backLink: researcher.url(),
        text: "Confirm revocation of "+researcher.title+"'s external access",
        options: [{label: "Confirm"}]
    }, "std:ui:confirm");
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
