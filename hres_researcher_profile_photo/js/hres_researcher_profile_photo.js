/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


var PhotoForm = P.form("photo", "form/profile-photo.json");

P.researcherProfile.formSection({
    name: "photo",
    title: "Photo",
    sort: 50,
    form: PhotoForm
});

P.implementService("std:action_panel:category:hres:person", function(display, builder) {
    var profile = O.service("hres_researcher_profile:profile_for_researcher", display.object);
    if(!(profile && profile.document && profile.document.photo)) { return; }
    var photo = profile.document.photo.photo;
    if(!photo) { return; }
    var file = O.file(photo);
    if(!file) { return; }
    builder.panel(0).style("special").element(1, {
        deferred: P.template("photo").deferredRender({
            file: file.url({
                transform: "w218/jpeg",
                authenticationSignature: true
            }),
            altName: display.object.title
        })
    });
});
