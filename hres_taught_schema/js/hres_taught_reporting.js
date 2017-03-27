
P.implementService("std:reporting:discover_collections", function(discover) {
    discover("taught_students", "Taught students", ["hres:people"]);
});

P.implementService("std:reporting:collection:taught_students:setup", function(collection) {
    collection.
        currentObjectsOfType(T.TaughtStudent).
        fact("isPastStudent",       "boolean",      "Past student").
        fact("project",             "ref",          "Project").
        fact("supervisor",          "ref",          "Supervisor").
        fact("moduleCode",          "text",         "Module");
    collection.filter(collection.FILTER_ALL, function(select) {
        select.
            where("isPastStudent", "=", false).
            where("project", "!=", null);
    });
});

P.implementService("std:reporting:collection:taught_students:get_facts_for_object", 
    function(object, row) {
        var res = O.query().link([T.TaughtProject, T.StudentProject], A.Type).
            link(object.ref, A.Researcher).
            sortBy("date").
            execute();
        if(!res.length) { return; }
        
        var project = res[0];
        row.project = project.ref;
        
        var supervisor = project.first(A.Supervisor);
        row.supervisor = supervisor ? supervisor : null;
        
        var module = project.first(A.CourseModule);
        var moduleCode = module ? module.load().first(A.Code).s() : null;
        row.moduleCode = moduleCode ? moduleCode : null;
        
        row.isPastStudent = object.isKindOf(T.PostgraduateTaughtStudentPast) ||
                            object.isKindOf(T.UndergraduateStudentPast);
    });

P.implementService("std:reporting:gather_collection_update_rules", function(rule) {
    rule("taught_students",     T.TaughtProject,     A.TaughtStudent);
    rule("taught_students",     T.StudentProject,    A.TaughtStudent);
});
