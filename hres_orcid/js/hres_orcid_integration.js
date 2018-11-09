/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


/*HaploDoc
node: /hres_orcid/integration
title: Integration
sort: 1
--
Integration with the ORCID system is configured using an OAth2 Keychain Entry. By default the system \
uses "ORCID Service" as the name of the Keychain Entry to use, but this can be changed by setting a \
value in configuration data for the key @hres_orcid:credential_name@.
*/
var KEYCHAIN_ENTRY = O.application.config["hres_orcid:credential_name"] || "ORCID Service";
var API_PREFIX = O.application.config["hres_orcid:api_base_url"] || 'https://api.sandbox.orcid.org';
var REQUESTED_SCOPE = O.application.config["hres_orcid:requested_scope"] || '/authenticate'; // Full access with member API would use '/read-limited /orcid-bio/update /activities/update'

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

/*HaploDoc
node: /hres_orcid/integration
sort: 4
--

h3(service). "hres:orcid:integration:for_user"

Takes a user as an argument, and will return their ORCID, if and only if they have correctly \
authenticated it with ORCID and connected it to their Haplo profile.
*/
// Will only return an ORCID if there's a valid access token
P.implementService("hres:orcid:integration:for_user", function(user) {
    var q = P.db.orcids.select().where("userId","=",user.id);
    return q.length ? P.ORCID.create(q[0].orcid) : null;
});

// --------------------------------------------------------------------------

/*HaploDoc
node: /hres_orcid/integration
sort: 7
--

h3(service). "hres:orcid:integration:redirect_to_start_obtain"

Uses the ORCID Keychain entry to redirect the user to the correct external page to start the \
authentication process
*/
P.implementService("hres:orcid:integration:redirect_to_start_obtain", function() {
    return O.remote.authentication.urlToStartOAuth(
        false,
        KEYCHAIN_ENTRY,
        {scope: REQUESTED_SCOPE }
    );
});

P.hook("hOAuthSuccess", function(response, verifiedUser) {
    try {
        console.log("ORCID response", verifiedUser);
        var auth = JSON.parse(verifiedUser);
        if(auth.service !== KEYCHAIN_ENTRY) {
            return; // not this OAuth provider
        }

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


// ---------- Pushing updates to ORCID -------------------------------------

// Calling plugin's responsibility to ensure that the user/identifier/kind combination 
// makes a unique key into this database. The different endpoints all have different data
// sources, so can't always use a ref for the identifier
P.db.table("putCodes", {
    authedUserId: { type:"int", indexed:true },
    identifier: { type:"text" },
    kind: { type:"text" },
    putCode: { type:"text" }
});

P.implementService("hres:orcid:integration:delete", function(user, spec) {
    let authQuery = P.db.orcids.select().where("userId","=",user.id);
    if(!authQuery.length) { 
        console.log("No authenticated ORCID for user "+user.id);
        return;
    }
    let existingORCIDRecord = P.db.putCodes.select().
        where("authedUserId", "=", user.id).
        where("identifier", "=", spec.identifier).
        where("kind", "=", spec.kind);
    if(!existingORCIDRecord) {
        console.log("No existing ORCID record to delete for spec "+JSON.stringify(spec));
        return;
    }
    O.httpClient(P.template("data-update-url").render({
        prefix: API_PREFIX,
        orcid: authQuery[0].orcid,
        kind: spec.kind,
        putCode: existingORCIDRecord[0].putCode
    })).
        method("DELETE").
        // TODO: New Keychain credential type?
        header("Authorization", "Bearer "+authQuery[0].accessToken).
        request(Deleted, {
            user: user.id,
            kind: spec.kind,
            identifier: spec.identifier
        });
});

var Deleted = P.callback("deleted", function(data, client, response) {
    if(response.successful) {
        console.log("Deleted successfully");
    } else {
        console.log("Failed to delete record from ORCID: ", response.errorMessage);
        console.log("Response body:", response.body ? response.body.readAsString("UTF-8") : "No body returned");
        console.log(data);
    }
});

P.implementService("hres:orcid:integration:push_data", function(user, spec) {
    let authQuery = P.db.orcids.select().where("userId","=",user.id);
    if(!authQuery.length) { 
        console.log("No authenticated ORCID for user "+user.id);
        return;
    }
    let existingORCIDRecord = P.db.putCodes.select().
        where("authedUserId", "=", user.id).
        where("identifier", "=", spec.identifier).
        where("kind", "=", spec.kind);

    let xmlDocument = spec.xml;
    let putCode;
    if(existingORCIDRecord.length) {
        putCode = existingORCIDRecord[0].putCode;
        xmlDocument.cursor().
            firstChildElement(spec.kind).
            attribute("put-code", putCode);
    }
    O.httpClient(P.template("data-update-url").render({
        prefix: API_PREFIX,
        orcid: authQuery[0].orcid,
        kind: spec.kind,
        putCode: putCode
    })).
        method(!!putCode ? "PUT" : "POST").
        body("application/vnd.orcid+xml", xmlDocument.toString()).
        // TODO: New Keychain credential type?
        header("Authorization", "Bearer "+authQuery[0].accessToken).
        request(Pushed, {
            user: user.id,
            kind: spec.kind,
            identifier: spec.identifier
        });
});

var Pushed = P.callback("pushed", function(data, client, response) {
    if(response.successful) {
        console.log("Push to ORCID successful:", response.status);
        let savedPutCode = P.db.putCodes.select().
                where("authedUserId", "=", data.user).
                where("kind", "=", data.kind).
                where("identifier", "=", data.identifier);
        let location = response.singleValueHeader("Location");
        // Location header stores ORCID put code, for future updates
        if(location) {
            // Put code is returned as the final element of the url in the "Location" header
            let parts = location.split("/");
            let putCode = parts[parts.length-1];
            if(savedPutCode.length) {
                if(putCode !== savedPutCode[0].putCode) {
                    throw new Error("ORCID sync error - Put Code returned doesn't match stored data");
                }
            } else {
                P.db.putCodes.create({
                    authedUserId: data.user,
                    kind: data.kind,
                    identifier: data.identifier,
                    putCode: putCode
                }).save();
            }
        } else {
            if(!savedPutCode.count()) {
                throw new Error("ORCID sync error - no put code returned or stored for synced record");
            }
        }
    } else {
        console.log("Failed to push data to ORCID: ", response.errorMessage);
        console.log("Response body:", response.body ? response.body.readAsString("UTF-8") : "No body returned");
        console.log(data);
    }
});
