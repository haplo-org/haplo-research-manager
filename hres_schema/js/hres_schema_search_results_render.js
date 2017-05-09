
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
