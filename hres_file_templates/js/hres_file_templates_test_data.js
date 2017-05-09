/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


P.implementService("hres:development:generate-test-data-end", function(action) {
    action(10, function(generator) {
        var letterhead = O.file(P.loadFile("testdata/example-university-letterhead.pdf"));
        P.db.fileTemplates.select().where("name","=","DEFAULT").deleteAll();
        P.db.fileTemplates.create({
            name: "DEFAULT",
            document: {
                templates: [
                    {
                        template: {
                            digest: letterhead.digest,
                            fileSize: letterhead.fileSize,
                            filename: letterhead.filename
                        },
                        margin: {
                            marginLeft: 60,
                            marginRight: 60,
                            marginTop: 100,
                            marginBottom: 60
                        }
                    }
                ]
            }
        }).save();
    });
});
