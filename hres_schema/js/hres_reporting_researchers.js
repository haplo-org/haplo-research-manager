/* Haplo Research Manager                             http://haplo.org
 * (c) Haplo Services Ltd 2006 - 2016    http://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


/*HaploDoc
node: /hres_schema/researchers
title: Researchers collection
--

The researchers collection contains facts about Researchers and External Researchers. The default filter for \
the collection excludes External researchers. If a dashboard using this collection needs to include External Researchers\
 one of the filters to include them should be used. These are @includeExternal@, which will include both Researchers \
and External Researchers in the dashboard, and @excludeInternal@, which will make the dashboard show only External \
Researchers.

*/

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