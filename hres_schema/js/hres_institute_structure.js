/* Haplo Research Manager                             http://haplo.org
 * (c) Haplo Services Ltd 2006 - 2016    http://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


// Institutes can have variable depths, and various bits of functionality need to
// change depending on the depth.
// The depth is determined by finding the deepest research institute object, and
// caches in the plugin data. This can be overridden in application config.

P.INSTITUTE_DEPTH = O.application.config["hres:schema:institute_depth"] || P.data.instituteDepth;

// If depth not known, attempt to find objects of the various types.
if(!P.INSTITUTE_DEPTH) {
    var haveAny = function(type) {
        return 0 !== O.query().linkDirectly(type, A.Type).limit(1).execute().length;
    };
    var depth = 1;
    if(haveAny(T.School)) { depth = 3; }
    else if(haveAny(T.Department)) { depth = 2; }
    console.log("Schema: Determined that institution depth is", depth);
    P.data.instituteDepth = P.INSTITUTE_DEPTH = depth;
}

// A list of property names for the institutions
P.INSTITUTE_PROPERTIES_IN_ORDER = ["university", "faculty"];
if(P.INSTITUTE_DEPTH > 1) {
    P.INSTITUTE_PROPERTIES_IN_ORDER.push("department");
    if(P.INSTITUTE_DEPTH > 2) {
        P.INSTITUTE_PROPERTIES_IN_ORDER.push("school");
    }
}

// Other plugins can obtain the institute depth with
// ... a feature the depth is available at plugin load time...
P.provideFeature("hres:schema:institute_depth", function(plugin) {
    plugin.INSTITUTE_DEPTH = P.INSTITUTE_DEPTH;
});
// ... and a service.
P.implementService("hres:schema:institute_depth", function() {
    return P.INSTITUTE_DEPTH;
});

// Update depth when institute objects change
P.onResearchInstituteChange.push(function() {
    P.data.instituteDepth = undefined;
    O.reloadJavaScriptRuntimes();
});
