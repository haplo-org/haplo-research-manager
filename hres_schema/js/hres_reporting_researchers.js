/* Haplo Research Manager                             http://haplo.org
 * (c) Haplo Services Ltd 2006 - 2016    http://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


P.implementService("std:reporting:discover_collections", function(discover) {
    discover("researchers", "Researchers", ["hres:people"]);
});

P.implementService("std:reporting:collection:researchers:setup", function(collection) {
    collection.
        currentObjectsOfType(T.Researcher, T.ExternalResearcher).
        property("hres:row_permissions:additional_labels",  [Label.ActivityIdentity]).
        fact("isExternal",  "boolean",  "Is an external researcher").
        filter(collection.FILTER_DEFAULT, function(select) { select.where("isExternal", "=", null); }).
        filter("includeExternal", function(select) { }).
        filter("excludeInternal", function(select) { select.where("isExternal", "=", true); });
        // TODO: Permissions for Researchers? Does it need different label lists for different purposes?
});

P.implementService("std:reporting:collection:researchers:get_facts_for_object", function(object, row, collection) {
    if(object.isKindOf(T.ExternalResearcher)) { row.isExternal = true; }
});