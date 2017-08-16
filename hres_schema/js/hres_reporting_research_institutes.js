/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


P.implementService("std:reporting:discover_collections", function(discover) {
    discover("research_institutes", "Research Institutes", ["hierarchical"]);
});

// TODO: This should have a std solution
// So plugins adding facts don't need to worry about hierarchy
P.implementService("std:reporting:collection_category:hierarchical:get_facts_for_object", function(object, row, collection) {
    O.service("std:reporting:update_required", "research_institutes", object.every(A.Parent));
});

P.implementService("std:reporting:collection:research_institutes:setup", function(collection) {
    collection.
        currentObjectsOfType(T.ResearchInstitute).
        fact("type",            "ref",      "Type").
        fact("parent",          "ref",      "Parent Institute").
        fact("researchers",     "int",      "Researchers").
        fact("staff",           "int",      "Admin staff");
});

P.implementService("std:reporting:collection:research_institutes:get_facts_for_object", function(object, row) {
    row.type = object.firstType();
    row.parent = object.first(A.Parent);
    row.researchers = O.query().link(T.Researcher, A.Type).link(object.ref, A.ResearchInstitute).execute().length;
    row.staff = O.query().link(T.Staff, A.Type).link(object.ref, A.ResearchInstitute).execute().length;    
});
