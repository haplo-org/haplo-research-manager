/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2020            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


var KEYCHAIN_ENTRY = O.application.config["hres_github:credential_name"] || "GitHub Service";
var REQUESTED_SCOPE = O.application.config["hres_github:requested_scope"] || 'repo';
var ENABLED_APPLICATION = O.application.config["hres_github:safety_application_hostname"];

P.db.table("githubLinks", {
    userId:      { type:"int", indexed:true },
    accessToken: { type:"text" },
    obtained:    { type:"datetime" },
    scope:       { type:"text" }
});

// --------------------------------------------------------------------------

var getUrlToObtain = function() {
    if(ENABLED_APPLICATION !== O.application.hostname) {
        console.log("Not starting GitHub sign-up as hres_github:safety_application_hostname is not "+
            "the current hostname. Is this a cloned live application?");
        return;
    }
    return O.remote.authentication.urlToStartOAuth(
        false,
        KEYCHAIN_ENTRY,
        {scope: REQUESTED_SCOPE }
    );    
};

P.implementService("hres:github:integration:url_to_start_obtain", getUrlToObtain);

P.hook("hOAuthSuccess", function(response, verifiedUser) {
    try {
        let auth = JSON.parse(verifiedUser);
        if(auth.service !== KEYCHAIN_ENTRY) { return; } // incorrect provider
        console.log("GitHub response ", verifiedUser);
        if(!(auth.token && auth.token.access_token && O.currentUser.isMemberOf(GROUP["std:group:everyone"]))) {
            O.stop("Invalid GitHub association");
        }
        let record = P.db.githubLinks.create({
            userId: O.currentUser.id,
            obtained: new Date(),
            accessToken: auth.token.access_token,
            scope: auth.token.scope,  
        }).save();
        P.db.githubLinks.select().where("userId","=",O.currentUser.id).where("id","!=",record.id).deleteAll();

        response.redirectPath = O.serviceMaybe("hres:github:integration:redirect_after_obtained_github") || "/"+O.currentUser.ref;
    } catch(e) {
        console.log('GitHub ERROR: ' + e.name + ': ' + e.message + ' at ' + e.fileName + ':' + e.lineNumber);
    }
});

var getTokenForUser = function(user) {
    let q = P.db.githubLinks.select().where("userId","=",user.id);
    return q.length ? q[0].accessToken : null;
};

// Will only return an access token if there's a valid access token
P.implementService("hres:github:integration:token_for_user", getTokenForUser);

P.implementService("hres:github:integration:redirect_to_access_review", function() {
    let clientId = O.keychain.credential(KEYCHAIN_ENTRY).account.client_id;
    return "https://github.com/settings/connections/applications/" + clientId;
});

// --------------------------------------------------------------------------
// Obtaining GitHub OAuth
// --------------------------------------------------------------------------


P.respond("GET,POST", "/do/github-integration/obtain", [
], function(E) {
    if(!O.currentUser.ref) { O.stop("GitHub cannot be associated with your account."); }
    if(E.request.method === "POST") {
        return E.response.redirect(getUrlToObtain());
    }
    E.render({
        pageTitle: "GitHub integration",
        text: "Would you like to link your GitHub and Haplo accounts?\nThis lets you import repositories from GitHub as software outputs.",
        options: [{label:"Confirm"}]
    }, "std:ui:confirm");
});


P.implementService("std:action_panel:category:hres:person", function(display, builder) {
    if(display.object.ref != O.currentUser.ref) { return; }
    
    let user = O.user(display.object.ref);
    if(!getTokenForUser(user) && !!getUrlToObtain()) {
        builder.panel(4000).link("default", "/do/github-integration/obtain", "Link GitHub account");
    }
});