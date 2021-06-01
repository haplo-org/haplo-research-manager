/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2018            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */

P.implementService("std:reporting:collection:repository_items:setup", function(collection) {
    collection.
        fact("doi",          "text",      "DOI");
});

P.implementService("std:reporting:collection:repository_items:get_facts_for_object", function(object, row) {
    if(object.first(A.DigitalObjectIdentifierDOI)){
        row.doi = P.DOI.asString(object.first(A.DigitalObjectIdentifierDOI));
    }
});

// ------ De-duplification of repository items -------------------

var matchOnDOI = function(dois) {
    return function(listObject) {
        return _.any(dois, (doi) => listObject.has(doi, A.DigitalObjectIdentifierDOI));
    };
};

P.implementService("hres:doi:match-to-existing-item-in-list", function(object, list) {
    let dois = object.every(A.DigitalObjectIdentifierDOI);
    if(dois.length) {
        return _.find(list, matchOnDOI(dois));
    }
});

P.implementService("hres:repository:find_matching_items_by_identifier", function(object, results) {
    let dois = object.every(A.DigitalObjectIdentifierDOI);
    if(dois.length) {
        O.query().
            link(SCHEMA.getTypesWithAnnotation("hres:annotation:repository-item"), A.Type).
            or((sq) => {
                _.each(dois, (doi) => sq.identifier(doi, A.DigitalObjectIdentifierDOI));
            }).
            execute().
            each((item) => results.push({object: item, matchingDesc: A.DigitalObjectIdentifierDOI}));
    }
});

// --------------------------------------------------------------------------
// Adding <meta> tags to public item pages

P.implementService("hres:repository:common:gather-meta-tags", function(specification) {
    let doi = specification.object.first(A.DigitalObjectIdentifierDOI);
    if(doi) {
        specification.tags.push({
            name: "DC.relation",
            content: P.DOI.asString(doi)
        });
        specification.tags.push({
            name: "DC.relation",
            content: P.DOI.url(doi)
        });
    }
});
