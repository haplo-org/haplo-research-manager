/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */

var HIDE_UNAUTHENTICATED_TEXT = O.application.config["hres_orcid:hide_unauthenticated_text"];

var SERVICE_PREFIX = 'https://orcid.org/';

// --------------------------------------------------------------------------------------------------------------------

var deferredRenderORCID = function(orcid) {
    if(!orcid) { return undefined; }
    var orcidText = orcid.toString();
    var q = P.db.orcids.select().where("orcid","=",orcidText);
    
    if(!q.length && !HIDE_UNAUTHENTICATED_TEXT) { orcidText += " (unauthenticated)"; }
    return P.template("type/orcid").deferredRender({
        orcid: orcid,
        orcid_text: orcidText,
        SERVICE_PREFIX: SERVICE_PREFIX
    });
};

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
        return P.template("std:render").render(deferredRenderORCID(value[0]));
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
            var orcidText = orcidFields.value[0];
            var q = P.db.orcids.select().where("orcid","=",orcidText);
            if(!q.length) { orcidText += " (unauthenticated)"; }
            return orcidText;
        }
    },
    deferredRender: function(orcid) {
        return deferredRenderORCID(orcid);
    }
};

// --------------------------------------------------------------------------------------------------------------------

P.provideFeature("hres:orcid", function(plugin) {
    plugin.ORCID = P.ORCID;
});

// --------------------------------------------------------------------------

P.implementService("haplo:data-import-framework:structured-data-type:add-destination:hres:orcid-id", function(model) {
    model.addDestination({
        name: "value:hres:orcid-id",
        title: "ORCID iD value (structured value)",
        displaySort: 999999,
        pseudo: true,
        kind: "dictionary",
        dictionaryNames: {
            id: {
                description: "Identifier",
                type: "text",
                required: true
            }
        },
        valueTransformerConstructor(batch, specification, sourceDetailsForErrors) {
            return function(value) {
                if(typeof(value) !== 'object' || !value.id) { return undefined; }
                return P.ORCID.create(value.id);
            };
        }
    });
});
