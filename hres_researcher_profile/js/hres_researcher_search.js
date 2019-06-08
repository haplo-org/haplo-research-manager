/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2018            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


// TODO is this element defined in the right place?
P.element("search_by_subject", "Find researchers by subject", function(L) {
    L.render({}, "subject_search_box");
});

var KINDS = {
    researcher: {
        makeQuery: function(searchTerm) {
            return "('"+searchTerm+"' and (type:'"+SCHEMA.getTypeInfo(T.Researcher).shortName+"'))";
        },
        sort: "title"
    },
    research: {
        makeQuery: function(searchTerm) {
            var query = "('"+searchTerm+"' and (type:'"+SCHEMA.getTypeInfo(T.Project).shortName+"'";
            var types = SCHEMA.getTypesWithAnnotation("hres:annotation:repository:output");
            _.each(types, function(type) {
                query += " or type:'"+SCHEMA.getTypeInfo(type).shortName+"'";
            });
            query += "))";
            return query;
        },
        sort: "date"
    }
};

P.respond("GET", "/do/researcher-profile/search", [
    {pathElement:0, as:"string"},
    {parameter:"searchTerm", as:"string"}
], function(E, kindName, searchTerm) {
    searchTerm = _.trim(searchTerm);
    if(!searchTerm && /\S/.test(searchTerm)) {
        return E.response.redirect("/");
    }

    var kind = KINDS[kindName];
    if(!kind) { O.stop("Unknown kind of search"); }

    E.render({
        searchTerm: searchTerm,
        query: kind.makeQuery(searchTerm),
        sort: kind.sort,
        showResultCount: true
    });
});
