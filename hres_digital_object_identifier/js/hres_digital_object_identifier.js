/* Haplo Research Manager                             http://haplo.org
 * (c) Haplo Services Ltd 2006 - 2016    http://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


var RESOLVER_PREFIX = 'https://dx.doi.org/';
var VALID_DOI_REGEXP = /^\S+$/;

// --------------------------------------------------------------------------------------------------------------------

var createDOIValue = P.implementTextType("hres:doi", "Digital Object Identifier", {
    string: function(value) {
        return "doi:"+value[0];
    },
    indexable: function(value) {
        return value[0];
    },
    identifier: function(value) {
        return value[0];
    },
    render: function(value) {
        return P.template("doi").render({
            doi: value[0],
            url: RESOLVER_PREFIX+encodeURIComponent(value[0])
        });
    },
    $setupEditorPlugin: function(value) {
        P.template("include_editor_plugin").render();   // hack to include client side support
    }
});

// --------------------------------------------------------------------------------------------------------------------

P.DOI = {
    create: function(doi) {
        if((typeof(doi) === 'string') && VALID_DOI_REGEXP.test(doi)) {
            return createDOIValue([doi]);
        } else {
            throw new Error("Bad DOI value");
        }
    },
    url: function(doi) {
        if(!doi) { return undefined; }
        var doiFields = doi.toFields();
        if(doiFields.type === "hres:doi") {
            return "https://dx.doi.org/"+doiFields.value[0];
        } else {
            throw new Error("Not a DOI");
        }
    }
};

// --------------------------------------------------------------------------------------------------------------------

P.provideFeature("hres:doi", function(plugin) {
    plugin.DOI = P.DOI;
});
