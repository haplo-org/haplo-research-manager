/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


var SERVICE_PREFIX = 'https://orcid.org/';

// --------------------------------------------------------------------------------------------------------------------

var createORCIDValue = P.implementTextType("hres:orcid", "ORCID", {
    string: function(value) {
        return value[0];
    },
    indexable: function(value) {
        return value[0];
    },
    identifier: function(value) {
        return value[0];
    },
    render: function(value) {
        return P.template("type/orcid").render({
            orcid: value[0],
            SERVICE_PREFIX: SERVICE_PREFIX
        });
    },
    $setupEditorPlugin: function(value) {
        P.template("type/include_editor_plugin").render();   // hack to include client side support
    }
});

// --------------------------------------------------------------------------------------------------------------------

P.ORCID = {
    create: function(orcid) {
        // TODO: Check ORCIDs on server side?
        if((typeof(orcid) === 'string')) {
            return createORCIDValue([orcid]);
        } else {
            throw new Error("Bad ORCID value");
        }
    },
    url: function(orcid) {
        if(!orcid) { return undefined; }
        var orcidFields = orcid.toFields();
        if(orcidFields.type === "hres:orcid") {
            return SERVICE_PREFIX+encodeURIComponent(orcidFields.value[0]);
        } else {
            throw new Error("Not a ORCID");
        }
    },
    asString: function(orcid) {
        if(!orcid) { return undefined; }
        var orcidFields = orcid.toFields();
        if(orcidFields.type === "hres:orcid") {
            return orcidFields.value[0];
        }
    }
};

// --------------------------------------------------------------------------------------------------------------------

P.provideFeature("hres:orcid", function(plugin) {
    plugin.ORCID = P.ORCID;
});
