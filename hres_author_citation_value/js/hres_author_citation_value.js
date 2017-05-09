/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


// Configuration of shadowed fields for citation values
var CONFIG = {
    shadowAttribute: function(citationAttribute, shadowedAttribute) {
        haveShadowedAttributes = true;
        shadowedAttributes[citationAttribute] = shadowedAttribute;
    },
    shadowInTypes: function(types) {
        types.forEach(function(t) { shadowInTypes.set(t, true); });
    },
    standardShadowingConfigurationForTypes: function(types) {
        this.shadowAttribute(A.AuthorsCitation, A.Author);
        this.shadowAttribute(A.EditorsCitation, A.Editor);
        this.shadowInTypes(types);
    }
};
P.provideFeature("hres:author_citation:configuration", function(plugin) {
    plugin.hresAuthorCitation = CONFIG;
});
var haveShadowedAttributes = false, shadowedAttributes = {};
var shadowInTypes = O.refdictHierarchical();

// --------------------------------------------------------------------------

var createAuthorCitationValue = P.implementTextType("hres:author_citation", "Author Citation", {
    string: function(value) {
        if(value.cite) { return value.cite; }
        if(value.ref) {
            return O.ref(value.ref).load().title;
        }
        return '';
    },
    indexable: function(value) {
        var indexable = (value.cite || '');
        if(value.ref) {
            indexable += (' '+O.ref(value.ref).load().title);
        }
        return indexable;
    },
    render: function(value) {
        return P.template("citation").render(citationTemplateView(value));
    },
    $setupEditorPlugin: function(value) {
        P.template("include_editor_plugin").render();   // hack to include client side support
    }
});

var citationTemplateView = function(value) {
    var view = {value: value};
    if(value.ref) {
        view.object = O.ref(value.ref).load();
    }
    return view;
};

// --------------------------------------------------------------------------

var createCitationListDisplayValue = P.implementTextType("hres:author_citation_list_display", "Author Citation List (display only)", {
    render: function(value) {
        var valueViews = _.map(value.list, citationTemplateView);
        var lastValueView = valueViews.pop();
        var penultimateValueView = valueViews.pop();
        return P.template("citation_list").render({
            first: valueViews,
            penultimate: penultimateValueView,
            last: lastValueView
        });
    }
});

// --------------------------------------------------------------------------

var makeCiteFromNames = function(names) {
    var cite = names.last;
    if(names.first) {
        cite += ", "+names.first[0]+'.';
        if(names.middle) {
            cite += names.middle[0]+'.';
        }
    }
    return cite;
};

var createValueFromObject = function(object) {
    var cite;
    if(O.serviceImplemented("hres:author_citation:get_citation_for_object")) {
        cite = O.service("hres:author_citation:get_citation_for_object", object);
    }
    if(!cite) {
        var title = object.firstTitle();
        if(title) {
            if(O.typecode(title) === O.T_TEXT_PERSON_NAME) {
                // TODO: Better automatic generation of citation from person names?
                cite = makeCiteFromNames(title.toFields());
            } else {
                cite = title.toString();
            }
        }
    }
    var value = {ref:object.ref.toString()};
    if(cite) { value.cite = cite; }
    return createAuthorCitationValue(value);
};

P.implementService("hres:author_citation:append_citation_to_object", function(mutableObject, desc, qual, spec) {
    var citation;
    var ref;
    if("object" in spec) {
        citation = createValueFromObject(spec.object);
        ref = spec.object.ref;
    } else if("ref" in spec) {
        citation = createValueFromObject(spec.ref.load());
        ref = spec.ref;
    } else if("last" in spec) {
        citation = createAuthorCitationValue({
            cite: makeCiteFromNames(spec)
        });
    } else {
        throw new Error("Invalid specification passed to hres:author_citation:append_citation_to_object");
    }
    
    var unshadowedAttributes = _.invert(shadowedAttributes);
    var citationAttribute = unshadowedAttributes[desc];
    mutableObject.append(citation, citationAttribute, qual);
    if(ref) {
        mutableObject.append(ref, desc, qual);
    }
});

P.implementService("hres:author_citation:get_ref_maybe", function(value) {
    if(O.isRef(value)) {
        return value;
    } else if(O.isPluginTextValue(value, "hres:author_citation")) {
        var f = value.toFields();
        if(f.value.ref) {
            return O.ref(f.value.ref);
        }
    }
});

P.implementService("hres:author_citation:citation_string_from_object", function(object, desc) {
    var names = [];
    object.every(desc, function(v) {
        if(O.isRef(v)) {
            names.push(v.load().title);
        } else {
            names.push(v.toString());
        }
    });
    if(names.length) {
        if(names.length === 1) {
            return names[0];
        } else {
            var lastName = names.pop();
            return names.join(', ')+' and '+lastName;
        }
    }
});

// --------------------------------------------------------------------------

// The client side plugin editor needs to know object titles for existing values.
// Send the titles by using the mechanism to send data to a client side editor plugin.

P.hook('hObjectEditor', function(response, object) {
    var titles;
    object.every(function(v,d,q) {
        if(O.isPluginTextValue(v, "hres:author_citation")) {
            var f = v.toFields();
            if(f.value.ref) {
                var object = O.ref(f.value.ref).load();
                titles = titles || {};
                titles[f.value.ref] = object.title;
            }
        }
    });
    if(titles || haveShadowedAttributes) {
        response.plugins.hres_author_citation_value = {titles:titles, shadowedAttributes:shadowedAttributes};
        P.template("include_editor_plugin").render({
            needsServerCitationLookup: O.serviceImplemented("hres:author_citation:get_citation_for_object")
        });
    }
});

// --------------------------------------------------------------------------

// TODO: Extend the platform to do this using a more efficient interface?

// Shadowed author fields need to have the citation text added as well as the links.
P.hook('hPreIndexObject', function(response, object) {
    if(!haveShadowedAttributes) { return; }
    var type = object.firstType();
    if(type && !shadowInTypes.get(type)) { return; }
    var hasAuthorCitationFields = false;
    (response.replacementObject || object).every(function(v,d,q) {
        if(O.isPluginTextValue(v, "hres:author_citation")) {
            hasAuthorCitationFields = true;
        }
    });
    if(hasAuthorCitationFields) {
        var r = O.object();
        (response.replacementObject || object).every(function(v,d,q) {
            var shadow = shadowedAttributes[d];
            if(shadow && O.isPluginTextValue(v, "hres:author_citation")) {
                var f = v.toFields();
                if(f.value.cite) {
                    r.append(f.value.cite, shadow, q);
                }
            }
            r.append(v,d,q);
        });
        response.replacementObject = r;
    }
});

// --------------------------------------------------------------------------

// Shadowed fields need to be made read only in the editor
P.hook('hPreObjectEdit', function(response, object, isTemplate, isNew) {
    var type = object.firstType();
    if(haveShadowedAttributes && type && shadowInTypes.get(type)) {
        response.readOnlyAttributes = (response.readOnlyAttributes || []);
        _.each(shadowedAttributes, function(shadowed, citation) {
            response.readOnlyAttributes.push(shadowed);
        });
    }
});

// Shadowed fields need to be updated after the object is saved
P.hook('hPostObjectEdit', function(response, object, previous) {
    var type = object.firstType();
    if(haveShadowedAttributes && type && shadowInTypes.get(type)) {
        var r = response.replacementObject || object.mutableCopy();
        response.replacementObject = r;
        _.each(shadowedAttributes, function(shadowed, citation) {
            citation = 1*citation;  // JS keys are always strings
            r.remove(shadowed);
            object.every(citation, function(v,d,q) {
                if(O.isPluginTextValue(v, "hres:author_citation")) {
                    var authorRef = O.ref(v.toFields().value.ref);
                    if(authorRef) {
                        r.append(authorRef, shadowed);
                    }
                }
            });
        });
    }
});

// Don't display the shadowed fields
// Combine all the author values into a single list value
P.hook('hPreObjectDisplay', function(response, object) {
    var type = object.firstType();
    if(haveShadowedAttributes && type && shadowInTypes.get(type)) {
        var r = response.replacementObject || object.mutableCopy();
        _.each(shadowedAttributes, function(shadowed, citation) {
            citation = 1*citation;  // JS keys are always strings
            // Don't display the shadowed attribute
            r.remove(shadowed);
            // More compact display of citation attribute as a list
            var entries = [];
            r.every(citation, function(v,d,q) {
                if(O.isPluginTextValue(v, "hres:author_citation")) {
                    entries.push(v);
                }
            });
            if(entries.length > 1) {
                r.remove(citation);
                var displayListValue = createCitationListDisplayValue({
                    list: _.map(entries, function(v) {
                        return v.toFields().value;
                    })
                });
                r.append(displayListValue, citation);
            }
        });
        response.replacementObject = r;
    }
});

// --------------------------------------------------------------------------

// Used by the editor value type implementation to fetch citations from the server, if required
P.respond("GET", "/api/hres-author-citation-value/fetch", [
    {parameter:"ref", as:"object"}
], function(E, object) {
    E.response.kind = 'text';
    E.response.body = createValueFromObject(object).toString();
});
