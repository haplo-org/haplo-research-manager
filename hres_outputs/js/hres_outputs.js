/* Haplo Research Manager                             http://haplo.org
 * (c) Haplo Services Ltd 2006 - 2016    http://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


var OUTPUT_TYPES = P.OUTPUT_TYPES = SCHEMA.getTypesWithAnnotation('hres:annotation:output');

var OUTPUTS_TYPE_LOOKUP = O.refdictHierarchical();
OUTPUT_TYPES.forEach(function(type) { OUTPUTS_TYPE_LOOKUP.set(type, true); });

// --------------------------------------------------------------------------

// Creates link on the homepage action panel to a reporting and guides area
P.implementService("haplo_activity_navigation:discover", function(activity) {
    activity(40, "outputs", "Outputs", "E226,1,f",
        function(user) { user.isMemberOf(Group.OutputEditors); }
    );
});

// --------------------------------------------------------------------------

P.implementService("hres:outputs:store_query", function() {
    return O.query().link(OUTPUT_TYPES, A.Type);
});

P.implementService("hres:outputs:each_output_type", function(iterator) {
    OUTPUT_TYPES.forEach(iterator);
});

P.implementService("hres:outputs:is_output", function(object) {
    var isOutput = false;
    object.each(A.Type, function(t) {
        if(OUTPUTS_TYPE_LOOKUP.get(t)) { isOutput = true; }
    });
    return isOutput;
});
