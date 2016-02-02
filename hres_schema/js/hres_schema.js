/* Haplo Research Manager                             http://haplo.org
 * (c) Haplo Services Ltd 2006 - 2016    http://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


P.implementService("std:reporting:collection_category:hres:people:setup", function(collection) {
    collection.
        fact("nameFirst",  "text", "First").
        fact("nameLast",   "text", "Last").
        fact("nameTitle",  "text", "Title").
        indexedFact("faculty", "ref", SCHEMA.getTypeInfo(T.Faculty).name).
        indexedFact("department", "ref", SCHEMA.getTypeInfo(T.Department).name);
});

P.implementService("std:reporting:collection_category:hres:people:get_facts_for_object", function(object, row) {
    // Name of person
    var title = object.first(A.Title);
    if(O.typecode(title) === O.T_TEXT_PERSON_NAME) {
        var fields = title.toFields();
        row.nameFirst = fields.first || null;
        row.nameLast = fields.last || null;
        row.nameTitle = fields.title || null;
    } else {
        row.nameLast = title.toString();
    }
    var departmentRef = object.first(A.ResearchInstitute);
    if(departmentRef) {
        row.department = departmentRef;
        var department = departmentRef.load();
        var facultyRef = department.first(A.Parent);
        if(facultyRef) {
            row.faculty = facultyRef;
        }
    }
});

// --------------------------------------------------------------------------

var PERSON_EXPORT_COLUMNS = ["nameLast", "nameFirst", "nameTitle", "faculty", "department"];

var makePersonDashboardColumns = function(spec) {
    var columns = [
        {
            type:"linked",
            style:"wide",
            column:{type:"join", joinWith:", ", heading:(spec.heading || "Name"), columns:["nameLast", "nameFirst"]}
        },
        {
            type:"join",
            style:"medium",
            joinWith:" : ",
            heading:SCHEMA.getTypeInfo(T.Faculty).name+" : "+SCHEMA.getTypeInfo(T.Department).name,
            columns: [
                {fact:"faculty", shortestTitle:true},
                {fact:"department", shortestTitle:true}
            ]
        }
    ];
    return columns;
};

P.reporting.registerReportingFeature("hres:person_name_column", function(dashboard, spec) {
    dashboard.
        columns(10, dashboard.isExporting ? PERSON_EXPORT_COLUMNS : makePersonDashboardColumns(spec || {})).
        order("nameLast", "nameFirst").
        use("std:row_text_filter", {facts:["nameLast", "nameFirst"], placeholder:"Search by name"}).
        use("std:row_object_filter", {fact:"faculty", objects:T.Faculty}).
        use("std:row_object_filter", {fact:"department", objects:T.Department});
});
