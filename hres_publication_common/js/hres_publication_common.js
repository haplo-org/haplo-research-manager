/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2020            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */



// --------------------------------------------------------------------------
//   STAFF DIRECTORY
// --------------------------------------------------------------------------

P.webPublication.registerReplaceableTemplate(
    "hres:publication-common:page:researcher-directory",
    "pages/researcher-directory"
);

P.webPublication.feature("hres:publication-common:researcher-directory", function(publication, spec) {

    let researcherResultsToRender = function(results) {
        let photo = O.serviceMaybe("hres:person:photo-display:listing", publication, 80, 80) || function(){};
        return _.map(results, (r, i) => {
            let department = r.first(A.ResearchInstitute) ?
                r.first(A.ResearchInstitute).load() : undefined;
            let faculty = (department && department.firstParent()) ?
                department.firstParent().load() : undefined;
            return {
                researcher: r,
                first: (i === 0),
                jobTitle: r.first(A.JobTitle),
                photo: photo(r),
                department: department,
                faculty: faculty
            };
        });
    };

    publication.respondToDirectory(spec.path, function(E, context) {
        let letter = (E.request.extraPathElements[0] || "A").toUpperCase();
        if(letter.length != 1) { letter = 'A'; }
        let results = O.query().
            link(T.Researcher).
            freeText(letter+'*', A.Title).   // a little bit of filtering, will select a few extras so need filtering in code as well
            sortByTitle().
            execute();
        results = _.filter(results, (r) => {
            let lastName = r.firstTitle().toFields().last;
            return (lastName && (lastName.charAt(0).toUpperCase() === letter));
        });
        context.hint.isResearcherDirectoryPage = true;
        E.render({
            spec: spec,
            letter: letter,
            researchers: {
                results: researcherResultsToRender(results)
            }
        }, context.publication.getReplaceableTemplate("hres:publication-common:page:researcher-directory"));
    });

    // Redirector to initial page
    publication.respondToExactPath(spec.path, function(E, context) {
        E.response.redirect(spec.path+'/a');
    });

});

P.globalTemplateFunction("hres:publication:letter-navigation", function(selected) {
    let e = [];
    for(let l = 65; l <= 90; ++l) {
        let letter = String.fromCharCode(l);
        e.push('<li');
        if(letter === selected) { e.push(' class="active"'); }
        e.push('><a href="', letter.toLowerCase(), '">', letter, '</a></li>');
    }
    this.unsafeWriteHTML(e.join(''));   // contents of e generated only from server controlled content
});

// --------------------------------------------------------------------------
//   RESEARCH INSTITUTE
// --------------------------------------------------------------------------

P.webPublication.registerReplaceableTemplate(
    "hres:publication-common:page:research-institute",
    "pages/research-institute"
);

P.webPublication.feature("hres:publication-common:research-institute", function(publication, spec) {

    publication.respondWithObject(spec.path,
        [T.ResearchInstitute],
        function(E, context, object) {
            context.hint.objectKind = 'research-institute';

            let researchers = O.query().
                link(T.Researcher).
                link(context.object.ref, A.ResearchInstitute).
                sortByTitle().
                execute();

            // Paged listing of related objects
            let related = P.webPublication.widget.search(E, {
                alwaysSearch: true,
                hideRelevanceSort: true,
                hideResultsCount: true,
                pageSize: 40,
                modifyQuery(query) {
                    query.link(context.object.ref);
                    if(spec.query.labels) {
                        query.anyLabel(spec.query.labels);
                    }
                }
            });

            let widget = P.webPublication.widget.object(object);
            if(spec.withoutAttributes !== undefined) {
                widget.withoutAttributes(spec.withoutAttributes);
            }
            if(spec.onlyAttributes !== undefined) {
                widget.onlyAttributes(spec.onlyAttributes);
            }

            E.render({
                object: widget,
                researchers: researchers,
                related: related
            }, context.publication.getReplaceableTemplate("hres:publication-common:page:research-institute"));
        }
    );

});



// --------------------------------------------------------------------------
//   RESEARCH INSTITUTE BROWSE
// --------------------------------------------------------------------------

P.webPublication.registerReplaceableTemplate(
    "hres:publication-common:page:research-institute-browse",
    "pages/research-institute-browse"
);

P.webPublication.feature("hres:publication-common:research-institute-browse", function(publication, spec) {

    let images = spec.images || [];

    let researchInstituteBrowse = function(E, context) {
        if(O.serviceImplemented("haplo:publication:update_branding")) {
            images = O.service("haplo:publication:update_branding", "research-institute", images);
        }
        let selected = E.request.extraPathElements[0];
        let topLevel = [];
        let imageIdx = 0;
        _.each(O.query().link(T.Faculty, A.Type).sortByTitle().execute(), (ri) => {
            let i = {
                ri: ri,
                href: spec.path+"/"+ri.ref+"#choose",
                title: ri.title,
                image: images[imageIdx++],
                selected: selected === ri.ref.toString()
            };
            if(imageIdx >= images.length) { imageIdx = 0; }
            if(i.selected) {
                i.institutes = O.query().
                    link(T.ResearchInstitute,A.Type).
                    link(ri.ref,A.Parent).
                    sortByTitle().execute();
            }
            topLevel.push(i);
        });
        context.hint.isResearchInstituteBrowsePage = true;
        E.render({
            spec: spec,
            topLevel: topLevel
        }, context.publication.getReplaceableTemplate("hres:publication-common:page:research-institute-browse"));
    };

    publication.respondToExactPath(spec.path, researchInstituteBrowse);
    publication.respondToDirectory(spec.path, researchInstituteBrowse);

});

// --------------------------------------------------------------------------
// Keyword search
// --------------------------------------------------------------------------

if("Keywords" in A) {
    P.webPublication.registerReplaceableTemplate(
        "hres:publication-common:page:keyword-search",
        "pages/search"
    );

    P.webPublication.feature("hres:publication-common:keyword-search", function(publication, spec) {
        publication.respondToExactPath(spec.SEARCH_PATH,
            function(E, context) {
                let search = P.webPublication.widget.search(E, {
                    placeholder: spec.placeholder,
                    modifyQuery(query) {
                        spec.modifyQuery(query);
                    }
                });
                let keywords = {};
                _.each(O.query().link(spec.types, A.Type).execute(), (o) => {
                    o.every(A.Keywords, (v,d,q) => {
                        keywords[v.toString().toLowerCase()] = true;
                    });
                });
                E.render({
                    SEARCH_PATH: spec.SEARCH_PATH,
                    showingResults: !!E.request.parameters.q,
                    search: search,
                    keywords: _.keys(keywords).sort(),
                    prompt: spec.searchPrompt
                }, context.publication.getReplaceableTemplate("hres:publication-common:page:keyword-search"));
            }
        );
    });
}