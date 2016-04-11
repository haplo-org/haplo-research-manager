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
    // All collections must set a property which describes which labels apply
    var institutePath = collection.property("hres:row_permissions:institute_path") || [A.ResearchInstitute]; // useful default
    var labels =        collection.property("hres:row_permissions:additional_labels"); // No default here to ensure configured
    if(!(institutePath && labels)) {
        var msg = "hres:labels_for_row_permissions property not set on collection "+collection.name;
        console.log(msg);
        throw new Error(msg);
    }
    // Start with fixed list of labels (specifies the 'type' for permissions)
    var changes = O.labelChanges(labels);
    // Follow the configured path to determine research institute labels
    var objects = [object];
    institutePath.forEach(function(desc) {
        var nextObjects = [];
        objects.forEach(function(o) {
            o.every(desc, function(v,d,q) {
                if(O.isRef(v)) {
                    nextObjects.push(v.load());
                }
            });
        });
        objects = nextObjects;
    });
    objects.forEach(function(o) {
        changes.add(o.ref, "with-parents");
    });
    // Apply to row
    row.labels = changes.change(O.labelList());
});

