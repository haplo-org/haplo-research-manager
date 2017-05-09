/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


// The name of the keychain entry we use
var KEYCHAIN_ENTRY = O.application.config["hres_orcid:credential_name"] || "ORCID Service";
var REQUESTED_SCOPE = '/authenticate'; // Full access with member API would use '/read-limited /orcid-bio/update /activities/update'

// How many seconds to refresh before we seem to need to, to allow for
// network delays in the previous token getting to us, and grace for
// our request using it to get to the server.
var REFRESH_MARGIN = 60;

P.db.table("orcids", {
    userId:       { type:"int", indexed:true },
    orcid:        { type:"text", indexed:true },
    obtained:     { type:"datetime" },
    accessToken:  { type:"text" },
    scope:        { type:"text" },
    refreshToken: { type:"text" },
    renewal:      { type:"datetime" }
});

// --------------------------------------------------------------------------

// Will only return an ORCID if there's a valid access token
P.implementService("hres:orcid:integration:for_user", function(user) {
    var q = P.db.orcids.select().where("userId","=",user.id);
    return q.length ? P.ORCID.create(q[0].orcid) : null;
});

// --------------------------------------------------------------------------

P.implementService("hres:orcid:integration:redirect_to_start_obtain", function() {
    return O.remote.authentication.urlToStartOAuth(
        false,
        KEYCHAIN_ENTRY,
        {scope:REQUESTED_SCOPE}
    );
});

P.hook("hOAuthSuccess", function(response, verifiedUser) {
    try {
        console.log("ORCID response", verifiedUser);
        var auth = JSON.parse(verifiedUser);

        if(!(auth.token && auth.token.orcid && O.currentUser.isMemberOf(GROUP["std:group:everyone"]))) {
            O.stop("Invalid ORCID association");
        }

        var record = P.db.orcids.create({
            userId: O.currentUser.id,
            obtained: new Date(),
            orcid: auth.token.orcid,
            accessToken: auth.token.access_token,
            scope: auth.token.scope,
            refreshToken: auth.token.refresh_token,
            renewal: new XDate().addSeconds(auth.token.expires_in - REFRESH_MARGIN)
        }).save();
        P.db.orcids.select().where("userId","=",O.currentUser.id).where("id","!=",record.id).deleteAll();

        // Other plugins may want to do something with the ORCID.
        O.serviceMaybe("hres:orcid:integration:obtained_orcid", O.currentUser, P.ORCID.create(record.orcid));

        // Redirect to appropraite place.
        response.redirectPath = O.serviceMaybe("hres:orcid:integration:redirect_after_obtained_orcid") || "/";
    } catch (e) {
        console.log('ORCID ERROR ' + e.name + ': ' + e.message + ' at ' + e.fileName + ':' + e.lineNumber);
    }
});
