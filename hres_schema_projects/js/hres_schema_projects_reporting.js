/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


P.implementService("std:reporting:discover_collections", function(discover) {
    discover("projects", "Projects");
});

P.implementService("std:reporting:collection:projects:setup", function(collection) {
    collection.
        currentObjectsOfType(T.Project).
        fact("principalInvestigator",       "ref",      "Principal Investigator");
});

P.implementService("std:reporting:gather_collection_update_rules", function(rule) {
    rule("projects", T.Project, A.Researcher);
});

P.implementService("std:reporting:collection:projects:get_facts_for_object", 
    function(object, row) {
        row.principalInvestigator = object.first(A.Researcher, Q.PrincipalInvestigator);
    });
