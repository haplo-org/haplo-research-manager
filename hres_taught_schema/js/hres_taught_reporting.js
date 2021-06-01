/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */

var getArrayOfKeysForObject = function(object, keyName) {
    var array = [];
    var obj = {};

    var res = O.query().link([T.TaughtProject, T.StudentProject], A.Type).
            or(function(sq) {
                sq.link(object.ref, A.TaughtStudent).link(object.ref, A.Researcher);
            }).
            sortBy("date").
            execute();

    if(res.length !== 0) {
        let project = res[0];
        let aYear = project.first(A.AcademicYear);
        obj[keyName] = aYear;
    } else {
        // if we want to display taught students that don't have a project this needs to have a value
        obj[keyName] = O.service("hres:academic_year:for_date", new Date()).ref;
    }

    array.push(obj);

    return array;
};

P.implementService("std:reporting:discover_collections", function(discover) {
    discover("taught_students", "Taught students", ["hres:people"]);
});

P.implementService("std:reporting:collection:taught_students:setup", function(collection) {
    collection.
        currentObjectsOfType(T.TaughtStudent).
        fact("academicYear",        "ref",          "Academic year").
        fact("isPastStudent",       "boolean",      "Past student").
        fact("project",             "ref",          "Project").
        fact("supervisor",          "ref",          "Supervisor").
        fact("moduleCode",          "text",         "Module").
        useFactAsAdditionalKey("academicYear");
    collection.filter(collection.FILTER_DEFAULT, function(select) {
        select.
            where("isPastStudent", "=", false).
            where("project", "!=", null);
    });
});

P.implementService("std:reporting:collection:taught_students:get_facts_for_object", 
    function(object, row) {
        row.isPastStudent = object.isKindOf(T.PostgraduateTaughtStudentPast) ||
                            object.isKindOf(T.UndergraduateStudentPast);

        var res = O.query().link([T.TaughtProject, T.StudentProject], A.Type).
            or(function(sq) {
                sq.link(object.ref, A.TaughtStudent).link(object.ref, A.Researcher);
            }).
            sortBy("date").
            execute();
        if(!res.length) { return; }
        
        var project = O.serviceMaybe("hres:academic_year:get_object_version", res[0], row.academicYear);
        var aYear = project.first(A.AcademicYear);
        if(aYear == row.academicYear) {
            row.project = project.ref;
            
            var supervisor = project.first(A.Supervisor);
            row.supervisor = supervisor ? supervisor : null;
            
            var module = project.first(A.CourseModule);
            var moduleCode = module ? module.load().first(A.Code).s() : null;
            row.moduleCode = moduleCode ? moduleCode : null;
        }   
    });

P.implementService("std:reporting:gather_collection_update_rules", function(rule) {
    rule("taught_students",     T.TaughtProject,     A.TaughtStudent);
    rule("taught_students",     T.StudentProject,    A.TaughtStudent);
});

P.implementService("std:reporting:collection:taught_students:get_additional_keys_for_object", function(object, collection) {
    return getArrayOfKeysForObject(object, "academicYear");
});

P.hook('hPostObjectChange', function(response, object, operation) {
    if(object.isKindOf(T.TaughtStudent)) {
        O.serviceMaybe("hres_repo_schema_outputs:update_outputs");
    }
});

P.implementService("std:reporting:collection:ethics:get_facts_for_object", function(object, row) {
    var researcherRef = object.first(A.Researcher);
    if(researcherRef && researcherRef.load().isKindOf(T.TaughtStudent)) {
        row.isResearcherTaught = true;
    }
});