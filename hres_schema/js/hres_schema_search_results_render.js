/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


P.renderSearchResult(T.ResearchInstitute, function(object, renderer) {
    renderer.firstValue(A.Parent, "subtitle");
    renderer.allValues(A.Head, "column", renderer.AUTO);
    renderer.allValues(A.ResearchAdministrator, "column", renderer.AUTO);
    renderer.allValues(A.ResearchDirector, "column", renderer.AUTO, 1, true);
    renderer.preventDefault();
});

P.renderSearchResult(T.Person, function(object, renderer) {
    renderer.firstValue(A.ResearchInstitute, "subtitle");
    renderer.firstValue(A.Type, "subtitle-right");
    renderer.firstValue(A.StudentId, "column", renderer.AUTO);
    renderer.firstValue(A.JobTitle, "column", renderer.AUTO);
    renderer.allValues(A.EmailAddress, "column", renderer.AUTO);
    renderer.allValues(A.Telephone, "column", renderer.AUTO, 1, true);
    renderer.preventDefault();
});

// --------------------------------------------------------------------------
// Person picker additional info

P.implementService("haplo:people-picker:search-result-info", function(person, infoBlocks, pickerName) {
    infoBlocks.push({
            sort: 100,
            deferred: P.template("people-picker/people-picker-info-block").deferredRender({
                jobTitle: person.first(A.JobTitle),
                researchInstitute: person.first(A.ResearchInstitute),
                email: person.first(A.EmailAddress)
            })
        });
});
