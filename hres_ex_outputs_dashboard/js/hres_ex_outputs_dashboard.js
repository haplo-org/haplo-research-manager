/* Haplo Research Manager                             http://haplo.org
 * (c) Haplo Services Ltd 2006 - 2016    http://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


P.implementService("std:reporting:collection:researchers:setup", function(collection) {
    collection.
        fact("outputs",     "int",      "Publications").
        fact("datasets",    "int",      "Datasets");
});

P.implementService("std:reporting:gather_collection_update_rules", function(rule) {
    O.service("hres:outputs:each_output_type", function(type) {
        rule("researchers", type, A.Author);
    });
});

P.implementService("std:reporting:collection:researchers:get_facts_for_object", function(object, row) {
    var outputCount = 0;
    var datasetCount = 0;
    var q = O.service("hres:outputs:store_query");
    q.link(object.ref, A.Author);
    _.each(q.execute(), function(output) {
        if(output.isKindOf(T.Dataset)) {
            datasetCount++;
        } else {
            outputCount++;
        }
    });
    row.datasets = datasetCount;
    row.outputs = outputCount;
});

// --------------------------------------------------------------------------

P.implementService("std:action_panel:activity:menu:outputs", function(display, builder) {
    if(O.currentUser.isMemberOf(Group.ResearchDataManagers)) {
        builder.panel(100).link(100, "/do/ex-outputs-dashboard/researcher-outputs",
                "Researcher outputs");
    }
});

// --------------------------------------------------------------------------

P.respond("GET,POST", "/do/ex-outputs-dashboard/researcher-outputs", [
    {parameter:"year", as:"ref", optional:true}
], function(E, year) {
    P.reporting.dashboard(E, {
        name: "researcher_outputs_dashboard",
        kind: "list",
        collection: "researchers",
        title: "Outputs counts by researcher"
    }).
    use("hres:person_name_column", {heading:"Researcher"}).
    columns(10, [
        {fact:"outputs"},
        {fact:"datasets"}
    ]).
    respond();
});
