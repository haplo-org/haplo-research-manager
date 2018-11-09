/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2018            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


if(O.featureImplemented("std:web-publisher")) {
    P.use("std:web-publisher");

/*HaploDoc
node: /hres_file_mediated_access
sort: 40
--

h3(feature). .use("hres:file_mediated_access")

Web Publisher feature, only available in systems using std_web_publisher.

Provides file releases through the web publisher publication.
*/
    P.webPublication.feature("hres:file_mediated_access", function(publication) {

        publication.respondToDirectory("/plugin/file-mediated-access/view",
            function(E, context) {
                E.setResponsiblePlugin(P);
                let identifier = E.request.extraPathElements[0];
                let view = P.getReleaseView(identifier, true /* external */);
                view.staticDirectoryUrl = P.staticDirectoryUrl;
                E.render(view, "web-publisher/view");
            }
        );

        publication.respondToDirectory("/plugin/file-mediated-access/download",
            function(E, context) {
                E.setResponsiblePlugin(P);
                let identifier = E.request.extraPathElements[0];
                let digest = E.request.extraPathElements[1];
                P.downloadReleasedFile(E, digest, identifier, true /* external */);
            }
        );
    });

}
