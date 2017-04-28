
var MANDATORY = [
    {
        name:"identifier",
        value: A.DOI,
        _attr: {
            "identifierType": "DOI"
        }
    },
    {
        name:"creators",
        value: [
            {
                name: "creator",
                relation: A.AuthorsCitation,
                value: [
                    {
                        name: "creatorName",
                        value: A.Title
                    },
                    {
                        name: "givenName",
                        value: function(o) { return o.firstTitle().toFields().first; }
                    },
                    {
                        name: "familyName",
                        value: function(o) { return o.firstTitle().toFields().last; }
                    },
                    {
                        name: "nameIdentifier",
                        value: A.ORCID,
                        _attr: {
                            "nameIdentifierScheme": "ORCID"
                        }
                    },
                    {
                        name: "affiliation",
                        // TODO: Do properly with standalone entities
                        value: "University of Jisc"
                    }
                ]
            }
        ]
    }
];

var build = function(spec, obj) {
    var i  = {};

    if(typeof(spec.value) === "string") {
        i[spec.name] = spec.value;
    } else if(typeof(spec.value) === "object") {
        i[spec.name] = [];
        _.each(spec.value, function(s) {
            var context;
            if("relation" in s) {
                // TODO: Handle other relations correctly
                // TODO: string only citations
                context = _.map(obj.every(s.relation), function(v) {
                    var ref = O.service("hres:author_citation:get_ref_maybe", v);
                    if(ref) { return ref.load(); }
                });
            } else {
                context = [obj];
            }
            _.each(_.compact(context), function(o) {
                i[spec.name].push(build(s, o));
            });
        });
    } else if(typeof(spec.value) === "function") {
        i[spec.name] = spec.value(obj);
    } else {
        var v = obj.first(spec.value);
        if(v) {
            var str = (O.isRef(v) ? v.load().firstTitle() : v).toString();
            i[spec.name] = str;
        }
    }
    if(i[spec.name] && spec._attr) {
        i[spec.name]._attr = spec._attr;
    }

    return i;
};

P.getDataCiteMetadata = function(item) {
    var metadataItems = [];
    
    _.each(MANDATORY, function(spec) {
        metadataItems.push(build(spec, item));
    });

    return {
        metadata: [
            {"datacite:resource": [
                {_attr: {
                    "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
                    "xmlns:datacite": "http://datacite.org/schema/kernel-4",
                    "xsi:schemaLocation": "http://datacite.org/schema/kernel-4 http://schema.datacite.org/meta/kernel-4/metadata.xsd"
                }}
            ].concat(metadataItems)}
        ]
    };
};
