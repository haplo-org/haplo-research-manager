/* Haplo Research Manager                             http://haplo.org
 * (c) Haplo Services Ltd 2006 - 2016    http://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


var entityNameFromType = O.refdict();
entityNameFromType.set(T.School, "school");
entityNameFromType.set(T.Department, "department");
entityNameFromType.set(T.Faculty,    "faculty");
entityNameFromType.set(T.University, "university");

var makeResearchInstituteGetter = function(name) {
    return function(context) {
        if(!("_loadedInstitute" in this)) {
            this._loadedInstitute = true;
            var lists = {};
            entityNameFromType.each(function(key, value) {
                lists[value] = [];
            });
            var scan, researcher;
            for(var i = this.researcher_list.length-1; i >= 0; i--) {
                researcher = this.researcher_list[i];
                if(researcher && (scan = researcher.first(A.ResearchInstitute))) { 
                    var safety = 32;
                    while(scan && (--safety)) {
                        var obj = scan.load();
                        var n = entityNameFromType.get(obj.firstType());
                        if(n) {
                            // Deduped addition of research institute to list
                            var list = lists[n],
                                x = list.length - 1;
                            for(; x >= 0; --x) { if(list[x] == scan) { break; } }
                            if(x < 0) { lists[n].push(scan); }
                        }
                        scan = obj.firstParent();
                    }
                }
            }
            var that = this;
            entityNameFromType.each(function(key, value) {
                that[value+'_refList'] = lists[value];
            });
        }
        return (context === "list") ? this[name+'_refList'] : this[name+'_refList'][0];
    };
};

// --------------------------------------------------------------------------

var HRES_ENTITIES = {
    'researcher': ['object', A.Researcher],

    'academicYear': ['object', A.AcademicYear],

    "project": ["object", A.Project],

    "researchInstitute": ["researcher", A.ResearchInstitute],

    'school': makeResearchInstituteGetter('school'),
    'department': makeResearchInstituteGetter('department'),
    'faculty':    makeResearchInstituteGetter('faculty'),
    'university': makeResearchInstituteGetter('university'),

    'schoolHead': ['faculty', A.Head],
    'facultyHead': ['faculty', A.Head],
    'departmentHead': ['department', A.Head]
};

// --------------------------------------------------------------------------

P.workflow.registerWorkflowFeature("hres:entities", function(workflow, entities) {
    workflow.
        use("std:entities", HRES_ENTITIES).
        use("std:entities:tags", "department", "faculty", "academicYear").
        use("std:entities:add_entities", entities);
});

var refColumnTagToName = function(tag) {
    var r = O.ref(tag);
    return r ? r.load().shortestTitle : '';
};

// for configurationService in std:dashboard:states specifications
P.implementService("hres:schema:workflow:dashboard:states:configure", function(spec) {
    spec.columnTag = "faculty";
    spec.columnTagToName = refColumnTagToName;
    var setup = spec.setup;
    spec.setup = function(dashboard, E) {
        if(setup) { setup(dashboard, E); }
        var currentYear = O.ref(E.request.parameters.year);
        var year = currentYear ?
            O.service("hres:academic_year:year_info", currentYear) :
            O.service("hres:academic_year:for_date", new Date());
        dashboard.addQueryFilter(function(query) { query.tag('academicYear', year.ref.toString()); });
        dashboard.addLinkParameter("year", year.ref.toString());
        dashboard.addHeaderDeferred(P.template("academic-year-navigation").deferredRender(year));
    };
});
