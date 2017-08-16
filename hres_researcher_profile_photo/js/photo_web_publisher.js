/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


 if(O.featureImplemented("std:web-publisher")) {
     P.use("std:web-publisher");

     P.webPublication.pagePart({
         name: "hres:researcher-profile:photo",
         deferredRender: function(E, context, options) {
             var profile = O.service("hres_researcher_profile:profile_for_researcher", context.object);
             if(!(profile && profile.document && profile.document.photo)) { return; }
             var photo = profile.document.photo.photo;
             if(!photo) { return; }
             var file = O.file(photo);
             if(!file) { return; }
             return P.template("web-publisher/photo").deferredRender({
                 file: file.url({
                     transform: "w160/jpeg",
                     authenticationSignatureValidForSeconds: 3600
                 }),
                 altName: context.object.title
             });
         }
    });

}
