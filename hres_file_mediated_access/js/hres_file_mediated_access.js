/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


P.implementService("hres_repo_access_request:file_download_details", function(file) {
    var secret = O.security.random.identifier();
    return {
        url: "https:/"+O.application.hostname+"/do/hres-file-mediated-access/download/"+file.digest+
            "/"+file.fileSize+"/"+secret,
        secret: secret
    };
});

P.respond("GET", "/do/hres-file-mediated-access/download", [
    {pathElement:0, as:"string"},
    {pathElement:1, as:"int"},
    {pathElement:2, as:"string"}
], function(E, fileDigest, fileSize, secret) {
    var file = O.file(fileDigest);
    if(file.fileSize !== fileSize) {
        O.stop("Not permitted.");
    }
    var allow = false;
    allow = O.service("hres_file_mediated_access:release_file_for_download", fileDigest, secret);
    if(allow) {
        E.response.setExpiry(86400); // 24 hours
        E.response.body = file;
    } else {
        O.stop("Not permitted.");
    }
});
