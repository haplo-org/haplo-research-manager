/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


P.implementService("std:reporting:discover_collections", function(discover) {
    discover("ref_unit_of_assessment", "REF Unit of Assessment");
});

P.implementService("std:reporting:collection:ref_unit_of_assessment:setup", function(collection) {
    collection.currentObjectsOfType(T.REFUnitOfAssessment);
});

P.implementService("std:reporting:collection:researchers:setup", function(collection) {
    collection.
        fact("refUnitOfAssessment",     "ref",      "Unit of Assessment");
});

P.implementService("std:reporting:collection:researchers:get_facts_for_object", function(object, row) {
    row.refUnitOfAssessment = object.first(A.REFUnitOfAssessment) || null;
});

// ------ Aggregate dimensions -----------------------

P.implementService("hres:reporting-aggregate-dimension:ref-unit-of-assessments", function() {
    return _.map(O.query().link(T.REFUnitOfAssessment, A.Type).sortByTitle().execute(), function(uoa) {
        var ref = uoa.ref;
        return {
            title: uoa.shortestTitle,
            value: ref,
            groupByFact: "refUnitOfAssessment",
            filter: function(select) {
                select.where("refUnitOfAssessment", "=", ref);
            }
        };
    });
});

// ------ Dashboards ----------------------------------
// These will display in REF activity area, if included in this application

var CanViewREFSchemaDashboards = O.action("hres_ref_schema:view_dashboards").
    title("View REF schema dasboards").
    allow("group", Group.REFManagers);

P.implementService("std:action_panel:activity:menu:ref", function(display, builder) {
    if(O.currentUser.allowed(CanViewREFSchemaDashboards)) {
        builder.panel(10).
            link(750, "/do/hres-ref/researchers-missing-uoa", "Researchers missing Unit of Assessment");
    }
});

P.implementService("std:reporting:dashboard:ref_confirm_progress:setup", function(dashboard) {
    dashboard.columns(70, ["refUnitOfAssessment"]);
});

P.respond("GET,POST", "/do/hres-ref/researchers-missing-uoa", [
], function(E) {
    CanViewREFSchemaDashboards.enforce();
    P.reporting.dashboard(E, {
        name: "researcher_ref_uoa",
        kind: "list",
        collection: "researchers",
        title: "Researchers missing Unit of Assessment"
    }).
        filter((select) => {
            select.where("refUnitOfAssessment", "=", null);
        }).
        summaryStatistic(0, "count").
        use("hres:person_name_column", {heading: "Researcher"}).
        respond();
});
