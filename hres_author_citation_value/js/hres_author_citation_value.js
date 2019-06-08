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
    replaceMatchingRef: function(value, ref, replacementRef) {
        if(!value.ref || (value.ref.toString() !== ref.toString())) { return; }
        value.ref = replacementRef.toString();
        return value;
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
        var valueViews = _.map(value.list, (data) => {
            return _.extend(citationTemplateView(data.value), {
                qualifier: data.qualifier ? SCHEMA.getQualifierInfo(data.qualifier).name : null
            });
        });
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

var createCiteForPersonObject = function(object) {
    var cite;
    if(object.first(A.PreferredCitation)) {
        cite = object.first(A.PreferredCitation).toString();
    }
    if(!cite && O.serviceImplemented("hres:author_citation:get_citation_for_object")) {
        cite = O.service("hres:author_citation:get_citation_for_object", object);
    }
    if(!cite) {
        var title = object.firstTitle();
        if(title) {
            if(O.typecode(title) === O.T_TEXT_PERSON_NAME) {
                cite = makeCiteFromNames(title.toFields());
            } else {
                cite = title.toString();
            }
        }
    }
    return cite;
};

var createValueFromObject = function(object) {
    var cite = createCiteForPersonObject(object);
    var value = {ref:object.ref.toString()};
    if(cite) { value.cite = cite; }
    return createAuthorCitationValue(value);
};

/*HaploDoc
node: /hres_author_citation_value/services
sort: 5
--

h3(service). O.service("hres:author_citation:get_citation_text_for_person_object", objectOrRef)

Returns the citation string for a person with a record within the system, using either their preferred \
citation format, if set, or the system default method of generating citations from names.
*/
P.implementService("hres:author_citation:get_citation_text_for_person_object", function(o) {
    var object = (O.isRef(o) ? o.load() : o);
    return createCiteForPersonObject(object);
});

/*HaploDoc
node: /hres_author_citation_value/services
title: Services
sort: 1
--

Consuming plugins should know as little about the internal structure of the author citation data type as \
posible. To achieve this a number of services are implemented to retrieve or save data to and from \
this data format.

h3(service). O.service("hres:author_citation:append_citation_to_object", mutableObject, desc, qual, spec)

Takes data passed in through the @spec@ object and appends an author citation to the @mutableObject@. @desc@ \
should refer to the shadowed attribute - ie. A.Author or A.Editor. @spec@ can have keys:

|object|StoreObject of the author|
|ref|Ref of the author|
|cite|Exact citation string|
|last|Last name|
|first|First name|
|middle|Middle name(s)|

@last@, @first@, and @middle@ are ignored if there is an object or ref to link to, or if @cite@ is defined.
*/
P.implementService("hres:author_citation:append_citation_to_object", function(mutableObject, desc, qual, spec) {
    var citation;
    var object;
    if("object" in spec) {
        object = spec.object;
    } else if("ref" in spec) {
        object = spec.ref.load();
    }
    if("cite" in spec) {
        citation = createAuthorCitationValue({
            cite: spec.cite,
            ref: object ? object.ref.toString() : null
        });
    } else if(object !== undefined) {
        citation = createValueFromObject(object);
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
});

/*HaploDoc
node: /hres_author_citation_value/services
sort: 2
--

h3(service). O.service("hres:author_citation:get_ref_maybe", value)

Returns the ref associated with the author citation value passed in, or @undefined@ if it's a text only citation.
*/
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

// TODO: Delete this and fix all uses of it. Carries out the same function as toString()
P.implementService("hres:author_citation:get_citation_text", function(value) {
   if(O.isPluginTextValue(value, "hres:author_citation")) {
        return value.toFields().value.cite;
    }
});

/*HaploDoc
node: /hres_author_citation_value/services
sort: 3
--

h3(service). O.service("hres:author_citation:citation_string_from_object", object, desc)

Returns a concatenated string of all of the citation strings for values in the @object@ 's @desc@, joined \
with commas and "and" nicely for presentation in bibliographic publication citations and other string-only views.
*/
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
        P.template("include_editor_plugin").render({});
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

// Shadowed fields need to be updated when the object is changed
P.hook("hComputeAttributes", function(response, object) {
    var type = object.firstType();
    if(type && shadowInTypes.get(type)) {
        // Don't modify the object if hPreObjectEdit has turned the individual citations into a list
        // Even though there's an optimisation below to try and prevent this being called, the check
        // is still needed because other plugins might make modifications.
        // TODO: Extend platform for a nicer way of rendering multiple attributes as a single attribute
        var hasListDisplay = false;
        _.each(shadowedAttributes, function(shadowed, citation) {
            var v = object.first(1*citation);
            if(v && O.isPluginTextValue(v, "hres:author_citation_list_display")) {
                hasListDisplay = true;
            }
        });
        if(hasListDisplay) { return; }
        // Shadow citation into other attributes
        _.each(shadowedAttributes, function(shadowed, citation) {
            citation = 1*citation;  // JS keys are always strings
            var toAppend = [];
            object.every(citation, (v,d,q) => {
                if(O.isPluginTextValue(v, "hres:author_citation")) {
                    var authorRef = O.ref(v.toFields().value.ref);
                    if(authorRef) {
                        toAppend.push(authorRef);
                    }
                }
            });
            // Mutate after iterating
            object.remove(shadowed);
            toAppend.forEach((r) => object.append(r, shadowed));
        });
    }
});

// Combine all the author values into a single list value
// hPreObjectDisplay & hPreObjectDisplayPublisher
var preObjectDisplay = function(response, object) {
    var type = object.firstType();
    if(haveShadowedAttributes && type && shadowInTypes.get(type)) {
        var r = response.replacementObject || object.mutableCopy();
        var oldWillCompute = r.willComputeAttributes;
        _.each(shadowedAttributes, function(shadowed, citation) {
            citation = 1*citation;  // JS keys are always strings
            // More compact display of citation attribute as a list
            var entries = [];
            r.every(citation, function(v,d,q) {
                if(O.isPluginTextValue(v, "hres:author_citation")) {
                    entries.push([v,q]);
                }
            });
            if(entries.length > 1) {
                r.remove(citation);
                var displayListValue = createCitationListDisplayValue({
                    list: _.map(entries, function(vq) {
                        return {
                            value: vq[0].toFields().value,
                            qualifier: vq[1]
                        };
                    })
                });
                r.append(displayListValue, citation);
            }
        });
        // Optimisation to prevent computing attributes when it's not necessary
        if(!oldWillCompute) { r.setWillComputeAttributes(false); }
        response.replacementObject = r;
    }
};
P.hook('hPreObjectDisplay', preObjectDisplay);
P.hook('hPreObjectDisplayPublisher', preObjectDisplay);

// Don't display the shadowed attributes
var objectRender = function(response, object) {
    var type = object.firstType();
    if(type && shadowInTypes.get(type)) {
        _.each(shadowedAttributes, function(shadowed, citation) {
            response.hideAttributes.push(shadowed);
        });
    }
};
P.hook('hObjectRender', objectRender);
P.hook('hObjectRenderPublisher', objectRender);

// --------------------------------------------------------------------------

// Used by the editor value type implementation to fetch citations from the server, if required
P.respond("GET", "/api/hres-author-citation-value/fetch", [
    {parameter:"ref", as:"object"}
], function(E, object) {
    E.response.kind = 'text';
    E.response.body = createValueFromObject(object).toString();
});
