/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


var CanViewProfilePhotoOverview = O.action("hres_researcher_profile_photo:view-overview").
    title("View profile photo overview").
    allow("group", Group.ITSupport);

P.implementService("hres_researcher_profile_photo:overview_page_url", function(user) {
    if(user.allowed(CanViewProfilePhotoOverview)) {
        return "/do/hres-researcher-profile-photo/overview";
    }
});


P.implementService("std:reporting:collection:researchers:setup", function(collection) {
    collection.fact("profilePhoto",                  "boolean",  "Profile Photo");
    collection.fact("profilePhotoWidth",             "int",      "Profile Photo Width");
    collection.fact("profilePhotoHeight",            "int",      "Profile Photo Height");
    collection.statistic({
        name: "profilePhoto", description: "Photos uploaded",
        filter: function(select) { select.where("profilePhoto","=",true); },
        aggregate: "COUNT"
    });
});

P.implementService("std:reporting:collection:researchers:get_facts_for_object", function(object, row) {
    var profile = O.service("hres_researcher_profile:profile_for_researcher", object);
    if(!(profile && profile.document && profile.document.photo)) { return; }
    row.profilePhoto = true;
    var photo = O.file(profile.document.photo.photo);
    if(photo) {
        var dimensions = photo.properties.dimensions;
        if(dimensions && dimensions.units === "px") {
            row.profilePhotoWidth = dimensions.width;
            row.profilePhotoHeight = dimensions.height;
        }
    }
});

P.respond("GET", "/do/hres-researcher-profile-photo/overview", [
], function(E) {
    CanViewProfilePhotoOverview.enforce();
    P.reporting.dashboard(E, {
        kind: "list",
        collection: "researchers",
        name: "profile_photos",
        title: "Web profile photo overivew"
    }).
        use("hres:person_name_column", {heading:NAME("Researcher")}).
        summaryStatistic(0, "count").
        summaryStatistic(1, "profilePhoto").
        columns(100, [
            "profilePhoto",
            "profilePhotoWidth",
            "profilePhotoHeight"
        ]).
        respond();
});
