/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


// --------------------------------------------------------------------------
// Update profile object with ORCID

P.implementService("hres:orcid:integration:obtained_orcid", function(user, orcid) {
    var profileRef = user.ref;
    if(profileRef) {
        var shouldUpdateUserProfile = true;
        if(O.serviceImplemented("hres:orcid:profile:should_update_profile")) {
            shouldUpdateUserProfile = O.service("hres:orcid:profile:should_update_profile", user, profileRef, orcid);
        }
        if(shouldUpdateUserProfile) {
            O.impersonating(O.SYSTEM, function() {
                var profile = profileRef.load();
                var p = profile.mutableCopy();
                p.remove(A.ORCID);
                p.append(orcid, A.ORCID);
                if(!(p.valuesEqual(profile))) {
                    p.save();
                }
            });
        }
    }
});

// --------------------------------------------------------------------------
// Reporting integration

P.implementService("std:reporting:collection_category:hres:people:setup", function(collection) {
    collection.fact("orcid", "text", "ORCID");
});

P.implementService("std:reporting:collection_category:hres:people:get_facts_for_object", function(object, row) {
    var orcid = object.first(A.ORCID);
    if(orcid) {
        row.orcid = P.ORCID.asString(orcid);
    }
});

// --------------------------------------------------------------------------

P.implementService("hres:orcid:match-to-existing-record-in-list", function(object, list) {
    let orcid = object.first(A.ORCID);
    if(orcid) {
        return _.find(list, (listObject) => {
            return listObject.has(orcid, A.ORCID);
        });
    }
});

// Change an ORCID iD to ref
P.implementService("haplo:data-import-framework:filter:hres:orcid-to-ref", function() {
    return function(value) {
        if(typeof(value) === "string") {
            value = P.ORCID.create(value);
        }
        if(O.isPluginTextValue(value, "hres:orcid")) {
            var personQuery = O.query().link(T.Person, A.Type).identifier(value, A.ORCID).limit(1).execute();
            return !!personQuery.length ? personQuery[0].ref : undefined;
        }
    };
});