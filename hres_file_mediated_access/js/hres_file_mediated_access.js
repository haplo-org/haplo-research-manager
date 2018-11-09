/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


/*HaploDoc
node: /hres_file_mediated_access
sort: 1
--

This plugin provides the utilities for generating a secure release of files to a user. Files are associated with a release, and dowload links are valid for 24 hours after first use.
*/

const DOWNLOAD_TIME_LIMIT_HOURS = 24;

P.db.table("releases", {
    identifier: {type: "text"},
    deadline: {type: "datetime", nullable:true},
    external: {type: "boolean"}
});

P.db.table("files", {
    file: {type:"file"},
    release: {type:"link", linkedTable:"releases"}
});

/*HaploDoc
node: /hres_file_mediated_access
sort: 5
--

h3(service). service("hres:file_mediated_access:create", files, options)

Creates a new release containing these files. Options is an object with keys:

| external | boolean | If set, will create a Web Publisher release |

The service returns a "Secure Identifier":https://docs.haplo.org/dev/plugin/o/security/random that is used to identify this release.

*/
P.implementService("hres:file_mediated_access:create", function(files, options) {
    const identifier = O.security.random.identifier();
    let release = P.db.releases.create({
        identifier: identifier,
        external: !!(options && options.external)
    }).save();
    _.each(files, function(file) {
        P.db.files.create({
            file: file,
            release: release
        }).save();
    });
    return identifier;
});

/*HaploDoc
node: /hres_file_mediated_access
title: File Mediated Access
sort: 20
--

h3(service). service("hres:file_mediated_access_access:release_url", identifier)

Returns the url of the release with this identifier.
*/
P.implementService("hres:file_mediated_access_access:release_url", function(identifier) {
    let release = P.db.releases.select().where("identifier", "=", identifier)[0];
    return P.template("release-url").render({
        path: getReleaseBaseUrl(release),
        identifier: identifier
    });
});

var getReleaseBaseUrl = function(release) {
    return (release.external ? "/plugin/file-mediated-access" : "/do/hres-file-mediated-access");
};

let getReleaseView = P.getReleaseView = function(identifier, external) {
    external = !!external;
    let release = P.db.releases.select().where("identifier", "=", identifier)[0];
    if(external !== release.external) { O.stop("Not permitted."); }
    if(release.deadline && (release.deadline < new Date())) {
        O.stop("The deadline for downloading these files has passed.");
    }

    let files = [];
    P.db.files.select().where("release", "=", release).each(function(row) {
        files.push({
            file: row.file,
            url: P.template("download-url").render({
                path: getReleaseBaseUrl(release),
                identifier: identifier,
                digest: row.file.digest
            })
        });
    });
    let deadline = release.deadline ? new XDate(release.deadline).toString("HH:mm, dd MMM yyyy") : null;
    let messageStart = "Please note this file download is time-limited for security reasons.\n"+
        "Please download the files below ";
    return {
        pageTitle: "Download files",
        identifier: identifier,
        files: files,
        hasDeadline: !!release.deadline,
        deferred: O.serviceMaybe("hres:file_mediated_access:view_section", identifier),
        notice: {
            message: deadline ?
                messageStart+" before "+deadline+"." :
                messageStart+" within "+DOWNLOAD_TIME_LIMIT_HOURS+" hours."
        }
    };
};

P.respond("GET", "/do/hres-file-mediated-access/view", [
    {pathElement:0, as:"string"}
], function(E, identifier) {
    if(O.currentUser.isAnonymous) {
        return E.response.redirect("/do/authentication/login?rdr="+
            encodeURIComponent("/do/hres-file-mediated-access/view/"+identifier));
    }
    E.render(getReleaseView(identifier));
});

let downloadReleasedFile = P.downloadReleasedFile = function(E, digest, identifier, external) {
    let file = O.file(digest);
    // Security - check file is included in this release
    let release = P.db.releases.select().where("identifier", "=", identifier)[0];
    external = !!external;
    if(external !== release.external) { O.stop("Not permitted."); }
    let fileQ = P.db.files.select().
        where("release", "=", release).
        where("file", "=", file);
    if(!fileQ.count()) { O.stop("File requested is not included in this release."); }

    // Check if release deadline has passed
    if(release.deadline && (release.deadline < new Date())) { O.stop("The deadline for downloading this file has passed"); }
    // Start deadline if none exists
    if(!release.deadline) {
        release.deadline = new XDate().addHours(DOWNLOAD_TIME_LIMIT_HOURS).toDate();
        release.save();
    }

    // Notify
/*HaploDoc
node: /hres_file_mediated_access
sort: 15
--

h3(service). service("hres:file_mediated_access:notify:file_downloaded", digest, identifier)

Notifies other plugins that a file has been downloaded. Consuming plugins should know if the download is relevant for them from the release identifier.
*/
    O.serviceMaybe("hres:file_mediated_access:notify:file_downloaded", digest, identifier);
    E.response.setExpiry(86400); // 24 hours
    E.response.body = file;
};

P.respond("GET", "/do/hres-file-mediated-access/download", [
    {pathElement:0, as:"string"},
    {pathElement:1, as:"string"}
], function(E, identifier, digest) {
    if(O.currentUser.isAnonymous) {
        return  E.response.redirect("/do/authentication/login?rdr="+
            encodeURIComponent("/do/hres-file-mediated-access/download/"+identifier+"/"+digest));
    }
    downloadReleasedFile(E, digest, identifier);
});
