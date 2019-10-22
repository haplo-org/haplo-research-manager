/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2019            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


var EMAILS_PATH = O.application.config["hres:login:adfs:oauth_emails_path"];

P.hook("hLoginUserInterface", function(response, destination, auth) {
    if(auth !== "haplo") {
        response.redirectPath = "/do/hresdemo-login/login";
        if(destination) {
            response.redirectPath += "?rdr="+encodeURIComponent(destination);
        }
    }
});

P.respond("GET", "/do/hresdemo-login/login", [
    {parameter:"rdr", as:"string", optional:true}
], function(E, rdr) {
    rdr = O.checkedSafeRedirectURLPath(rdr);
    let redirectPath = "/do/hresdemo-login/redirect-to-login";
    if(rdr) {
        redirectPath += "?rdr="+encodeURIComponent(rdr);
    }
    E.render({
        beginUrl: redirectPath
    });
});

P.respond("GET", "/do/hresdemo-login/redirect-to-login", [
    {parameter:"rdr", as:"string", optional:true}
], function(E, rdr) {
    rdr = O.checkedSafeRedirectURLPath(rdr);
    return E.response.redirect(O.remote.authentication.urlToStartOAuth(rdr, "login"));
});

P.hook("hOAuthSuccess", function(response, verifiedUser) {
    let authInfo = JSON.parse(verifiedUser);
    let token = authInfo.token;
    let usernames = token[EMAILS_PATH];
    let user;
    _.find(usernames, (username) => {
        // TODO add any custom logic for getting usernames
        user = O.service("haplo_user_sync:username_to_user", username); 
        return !!user;
    });
    if(user && user.isActive) {
        console.log("Found user:", usernames, user);
        user.setAsLoggedInUser("ADFS: "+usernames);
        if("data" in authInfo && authInfo.data !== "") {
            response.redirectPath = authInfo.data;
        }
        else {
            response.redirectPath = "/";
        }
    } else {
        console.log("Didn't recognise any returned usernames:", usernames);
        O.audit.write({
            auditEntryType: "hresdemo_login:fail",
            data: {
                reason: "Didn't recognise any returned usernames",
                usernames: usernames
            }
        });
        response.redirectPath = "/do/hresdemo-login/no-account";
    }
});

P.respond("GET", "/do/hresdemo-login/no-account", [
], function(E) {
    E.render();
});

