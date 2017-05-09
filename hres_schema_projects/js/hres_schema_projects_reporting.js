
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
