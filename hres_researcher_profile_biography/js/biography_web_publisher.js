/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2018            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


if(O.featureImplemented("std:web-publisher")) {
    P.use("std:web-publisher");

    P.webPublication.pagePart({
        name: "hres:researcher-profile:biography",
        deferredRender: function(E, context, options) {
            var profile = O.service("hres_researcher_profile:profile_for_researcher", context.object);
            if(!(profile && profile.document && 
                profile.document.biography &&
                profile.document.biography.biography)) {
                return;
            }
            return P.template("web-publisher/biography").deferredRender({
                biography: profile.document.biography.biography
            });
        }
    });
}
