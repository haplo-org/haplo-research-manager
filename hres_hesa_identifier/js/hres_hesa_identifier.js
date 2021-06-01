/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2021            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


var VALID_HESA_REGEXP = /^\S+$/;

// --------------------------------------------------------------------------------------------------------------------

var createHESAValue = P.implementTextType("hres:hesa", "HESA Identifier", {
    string(value) {
        return value[0];
    },
    indexable(value) {
        return value[0];
    },
    identifier(value) {
        return value[0];
    },
    render(value) {
        return value[0];
    },
    $setupEditorPlugin(value) {
        P.template("include_editor_plugin").render();   // hack to include client side support
    }
});

// --------------------------------------------------------------------------------------------------------------------

P.HESA = {
    create(hesa) {
        if((typeof(hesa) === 'string') && VALID_HESA_REGEXP.test(hesa)) {
            return createHESAValue([hesa]);
        } else {
            throw new Error("Bad HESA value");
        }
    },
    isHESA(maybeHESA) {
        return O.isPluginTextValue(maybeHESA, "hres:hesa");
    },
    asString(hesa) {
        var f = hesa.toFields();
        if(f.type !== "hres:hesa") { throw new Error("Not a HESA"); }
        return f.value[0];
    }
};

// --------------------------------------------------------------------------------------------------------------------

P.provideFeature("hres:hesa", function(plugin) {
    plugin.HESA = P.HESA;
});

// --------------------------------------------------------------------------

P.implementService("std:reporting:collection:researchers:setup", function(collection) {
    collection.
        fact("hesaIdentifier",          "text",             "HESA Identifier");
});
P.implementService("std:reporting:collection:researchers:get_facts_for_object", function(object, row) {
    row.hesaIdentifier = !!object.first(A.HESAIdentifier) ? P.HESA.asString(object.first(A.HESAIdentifier)) : null;
});