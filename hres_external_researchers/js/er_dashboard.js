/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


P.implementService("std:action_panel:activity:menu:graduate_school", function(display, builder) {
    if(O.currentUser.allowed(P.canRequestAccess)) {
        builder.panel("phd:graduate_school_menu:supervision").link("default",
            "/do/hres-external-researchers/external-researchers-dashboard",
            NAME('+External Researcher'));
    }
});

P.respond("GET", "/do/hres-external-researchers/external-researchers-dashboard", [
], function(E) {
    P.canRequestAccess.enforce();
    var researchers = [];
    _.each(O.query().link(T.ExternalResearcher, A.Type).execute(),
        function(researcher) {
            var linkSent, firstLogin;
            var user = O.user(researcher.ref);
            var title = researcher.firstTitle().toFields();
            if(user && !user.isMemberOf(Group.ExternalResearcherAccount)) { return; }
            if(user){
                linkSent = user.data["hres_external_researchers:activation_link_sent"];
                if(!linkSent) {
                    O.impersonating(O.SYSTEM, function() {
                        var aq = O.audit.query().auditEntryType('hres_external_researchers:new_external_user').ref(user.ref).latest();
                        if(aq) {
                            linkSent = aq.creationDate;
                            user.data["hres_external_researchers:activation_link_sent"] = linkSent;
                        }
                    });
                }
                firstLogin = user.data["hres_external_researchers:first_login"];
                if(!firstLogin) {
                    O.impersonating(O.SYSTEM, function() {
                        var auditQuery = O.audit.query().userId(user.id).auditEntryType('USER-LOGIN').sortBy("creationDate_asc").first();
                        if(auditQuery) {
                            firstLogin = auditQuery.creationDate;
                            user.data["hres_external_researchers:first_login"] = firstLogin;
                        }
                    }); 
                }
            }
            researchers.push({
                name: researcher.title,
                url: researcher.url(),
                ref: researcher.ref.toString(),
                externalAccess: (user && user.isActive),
                sort: title.last+title.first,
                linkSent: linkSent ? new XDate(linkSent).toString("dd MMM yyyy") : "",
                firstLogin: firstLogin ? new XDate(firstLogin).toString("dd MMM yyyy") : ""
            });
        }
    );
    E.render({
        pageTitle: NAME('+External Researcher'),
        researchers: researchers
    });
});
