/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2018            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


// ORCID doesn't obviously belong in any activity, so make it configurable defaulting to repository.
var orcidActivity = O.application.config["hres_orcid_obtain:activity"] || "repository";

// --------------------------------------------------------------------------

var HomePageNote        = P.guidanceNote(orcidActivity, "obtain-orcid-home",        "ORCID Home Page",      "guidance/home-page.xml");
var IntroductionNote    = P.guidanceNote(orcidActivity, "obtain-orcid-intro",       "ORCID Introduction",   "guidance/introduction.xml");
var ThankYouNote        = P.guidanceNote(orcidActivity, "obtain-orcid-complete",    "ORCID Complete",       "guidance/thank-you.xml");

// --------------------------------------------------------------------------

var userORCID = function(user) {
    var profileRef = user.ref;
    if(!profileRef) { return {}; }
    var profile = profileRef.load();
    var orcidOnProfile = profile.first(A.ORCID);
    var orcidWithAccessToken = O.service("hres:orcid:integration:for_user", user);
    return {
        onProfile: orcidOnProfile ? P.ORCID.deferredRender(orcidOnProfile) : null,
        withAccessToken: orcidWithAccessToken
    };
};

P.element("home", "ORCID Home Page",
    function(L) {
        if(!O.currentUser.ref) { return; }
        var orcid = userORCID(O.currentUser);
        if(!(orcid.onProfile && orcid.withAccessToken)) {
            L.render({
                staticDirectoryUrl: P.staticDirectoryUrl,
                note: HomePageNote.deferredRender(),
                orcid: orcid
            }, "home");
        }
    }
);

P.respond("GET,POST", "/do/obtain-orcid/obtain", [
], function(E) {
    if(!O.currentUser.ref) { O.stop("ORCID cannot be associated with your account."); }
    if(E.request.method === "POST") {
        return E.response.redirect(O.service("hres:orcid:integration:redirect_to_start_obtain"));
    }
    E.render({
        staticDirectoryUrl: P.staticDirectoryUrl,
        introduction: IntroductionNote.deferredRender(),
        orcid: userORCID(O.currentUser)
    });
});

P.implementService("hres:orcid:integration:redirect_after_obtained_orcid", function() {
    return "/do/obtain-orcid/thank-you";
});

P.respond("GET", "/do/obtain-orcid/thank-you", [
], function(E) {
    var orcid = userORCID(O.currentUser);
    if(!(orcid.onProfile && orcid.withAccessToken)) {
        return E.response.redirect("/do/obtain-orcid/obtain");
    }
    E.render({
        note: ThankYouNote.deferredRender(),
        orcid: orcid
    });
});

// --------------------------------------------------------------------------

P.implementService("std:reporting:collection_category:hres:people:setup", function(collection) {
    collection.
        fact("haveOrcidToken", "boolean", "Have ORCID Access Token?").
        statistic({
            name: "orcidComplete", description: "Have ORCID",
            filter: function(select) { select.where("haveOrcidToken","=",true); },
            aggregate: "COUNT"
        });
});

P.implementService("std:reporting:collection_category:hres:people:get_facts_for_object", function(object, row) {
    var user = O.user(object.ref);
    if(user) {
        row.haveOrcidToken = !!O.service("hres:orcid:integration:for_user", user);
    }
});

// --------------------------------------------------------------------------

var CanViewORCIDProgress = O.action("hres:action:can-view-orcid-progress").
    title("Can view ORCID Progress").
    allow("role", "Head");

P.implementService("std:action_panel:activity:menu:"+orcidActivity.replace(/-/g,'_'), function(display, builder) {
    if(O.currentUser.allowed(CanViewORCIDProgress)) {
        builder.panel(9999).
            title("ORCID").
            link("top", "/do/obtain-orcid/progress-dashboard", "ORCID Progress");
    }
});

P.respond("GET,POST", "/do/obtain-orcid/progress-dashboard", [
    {pathElement:0, as:"string", optional:true}
], function(E, all) {
    CanViewORCIDProgress.enforce();
    var dashboard = P.reporting.dashboard(E, {
        kind: "list",
        collection: "researchers",
        name: "orcid_progress",
        title: "ORCID Progress"
    }).
        use("hres:person_name_column", {heading:NAME("Researcher")}).
        summaryStatistic(0, "count").
        summaryStatistic(1, "orcidComplete").
        columns(100, [
            {
                type: "linked",
                column:{fact:"orcid"},
                link(row) {
                    var person = row.ref.load();
                    return P.ORCID.url(person.first(A.ORCID)); 
                }
            },
            "haveOrcidToken"
        ]).
        respond();
});
