/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


if(O.featureImplemented("std:web-publisher")) {
    P.use("std:web-publisher");

    P.db.table("permitImages", {
        digest: {type:"text", indexed:true, uniqueIndex:true}
    });

    // Allow permitted images to be downloaded.
    // Publications must explicitly opt in.
    P.webPublication.feature("hres:researcher-profile:photo:permit-image-downloads", function(publication) {
        publication.addFileDownloadPermissionHandler(function(fileOrIdentifier, result) {
            if(P.db.permitImages.select().where("digest","=",fileOrIdentifier.digest).count() > 0) {
                result.allow = true;
            }
        });
    });

    P.webPublication.registerReplaceableTemplate(
        "hres:researcher-profile:photo",
        "web-publisher/photo"
    );

    var deferredRenderPhoto = function(publication, object, width, height) {
        var template = publication.getReplaceableTemplate("hres:researcher-profile:photo");

        var profile = O.service("hres_researcher_profile:profile_for_researcher", object);
        if(!(profile && profile.document && profile.document.photo)) { return template.deferredRender(); }
        var photo = profile.document.photo.photo;
        if(!photo) { return template.deferredRender(); }
        var file = O.file(photo);
        if(!file) { return template.deferredRender(); }

        // Ensure download is permitted
        try {
            P.db.permitImages.create({digest:file.digest}).save();
        } catch(e) {
            // Ignore, as the unique index has prevented a duplicate
        }

        return template.deferredRender({
            file: publication.deferredRenderImageFileTag(file, {
                maxWidth: width,
                maxHeight: height,
                hiDPI: true,
                alt: object.title
            })
        });
    };

    P.webPublication.pagePart({
        name: "hres:researcher-profile:photo",
        category: "hres:publication:person:photo-display", // category used for rendering to avoid a dependency
        deferredRender: function(E, context, options) {
            return deferredRenderPhoto(context.publication, context.object, 160, 100);
        }
    });

    P.implementService("hres:person:photo-display:listing", function(publication, width, height) {
        return function(object) {
            return deferredRenderPhoto(publication, object, width, height);
        };
    });

}
