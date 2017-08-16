/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


if(O.featureImplemented("std:web-publisher")) {
    P.use("std:web-publisher");

    P.webPublication.pagePart({
        name: "hres:researcher-profile:profile",
        category: "hres:repository:person:below",
        sort: 500,
        deferredRender: function(E, context, options) {
            if(context.object) {
                var profile = new P.Profile(context.object);
                var sections = profile.applicableSections();
                if(options.without) {
                    sections = _.compact(_.map(sections, function(section) {
                        if(-1 === options.without.indexOf(section.name)) {
                            return section;
                        }
                    }));
                }
                return P.template("web-publisher/profile").deferredRender({
                    sections: _.map(sections, function(section) {
                        return {
                            section: section,
                            display: section.deferredRenderPublished(profile)
                        };
                    })
                });
            }
        }
    });

}