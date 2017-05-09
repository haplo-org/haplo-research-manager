/* Haplo Research Manager                             http://haplo.org
 * (c) Haplo Services Ltd 2006 - 2016    http://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


// Label rows in every collection, and set a default filter which only allows users
// to see rows permitted by their permissions.
P.implementService("std:reporting:collection:*:setup", function(collection) {
    collection.
        fact("labels", "labelList", "Labels for permissions").
        filter(collection.FILTER_ALL, function(select, collection) {
            select.where("labels", "PERMIT READ", O.currentUser);
        });
});

// Label the rows with instructions from the properties on the object
P.implementService("std:reporting:collection:*:get_facts_for_object", function(object, row, collection) {
    var getLabelsForRow = collection.property("hres:row_permissions:get_labels");
    row.labels = getLabelsForRow ? getLabelsForRow(object, row, collection) : object.labels;
});

