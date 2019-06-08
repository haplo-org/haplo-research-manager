/* Haplo Research Manager                             http://haplo.org
 * (c) Haplo Services Ltd 2006 - 2016    http://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


var RESOLVER_PREFIX = 'https://hdl.handle.net/';
var VALID_HANDLE_REGEXP = /^\S+$/;

// --------------------------------------------------------------------------------------------------------------------

var createHandleValue = P.implementTextType("hres:hdl", "Handle", {
    string: function(value) {
        return "info:hdl/"+value[0];
    },
    indexable: function(value) {
        return value[0];
    },
    identifier: function(value) {
        return value[0];
    },
    render: function(value) {
        return P.template("handle").render({
            handle: value[0],
            url: RESOLVER_PREFIX+encodeURIComponent(value[0])
        });
    },
    $setupEditorPlugin: function(value) {
        P.template("include_editor_plugin").render();   // hack to include client side support
    }
});

// --------------------------------------------------------------------------
// De-duplication of repository items

P.implementService("hres:hdl:match-to-existing-item-in-list", function(object, list) {
    let hdl = object.first(A.Handle);
    if(hdl) {
        return _.find(list, (listObject) => {
            return listObject.has(hdl, A.Handle);
        });
    }
});

// --------------------------------------------------------------------------------------------------------------------

P.Handle = {
    create: function(hdl) {
        if((typeof(hdl) === 'string') && VALID_HANDLE_REGEXP.test(hdl)) {
            return createHandleValue([hdl]);
        } else {
            throw new Error("Bad Handle value");
        }
    },
    url: function(hdl) {
        if(!hdl) { return undefined; }
        var handleFields = hdl.toFields();
        if(handleFields.type === "hres:hdl") {
            return "https://hdl.handle.net/"+handleFields.value[0];
        } else {
            throw new Error("Not a Handle");
        }
    },
    isHandle: function(maybeHandle) {
        return O.isPluginTextValue(maybeHandle, "hres:hdl");
    },
    asString: function(hdl) {
        var f = hdl.toFields();
        if(f.type !== "hres:hdl") { throw new Error("Not a Handle"); }
        return f.value[0];
    }
};

// --------------------------------------------------------------------------------------------------------------------

P.provideFeature("hres:hdl", function(plugin) {
    plugin.Handle = P.Handle;
});
