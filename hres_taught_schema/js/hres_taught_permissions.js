/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */

P.hresSchemaNAME.addTypeNamesFromSchema(T, [
    ['Taught Student',                  'TaughtStudent'],
    ['Postgraduate Taught Student',     'PostgraduateTaughtStudent'],
    ['Undergraduate Student',           'UndergraduateStudent']
]);

// Navigation for home page
P.implementService("hres:schema:roles_for_my_links", function(myLink) {
    myLink(100, "Taught Student", "My project", "My projects");
});

var CanSeeRoles = O.action("haplo_user_roles_permissions:can_see_roles");

// Add button to object page to roles list
P.hook("hObjectDisplay", function(response, object) {
    if(O.currentUser.allowed(CanSeeRoles)) {
        // TODO: Configurable set of types to show Permissions button
        if(object.isKindOf(T.TaughtStudent)) {
            response.buttons["*USERROLES"] = [["/do/haplo-user-roles-permissions/roles/"+object.ref, "Permissions: User roles"]];
        }
    }
});

// Navigation for research institutes
P.implementService("hres:navigation:people_types_for_research_institute_navigation", function(institutePeopleLinks) {
    institutePeopleLinks.push({sort:10000, type:T.PostgraduateTaughtStudent, name:NAME("+Postgraduate Taught Student")});
    institutePeopleLinks.push({sort:10010, type:T.UndergraduateStudent, name:NAME("+Undergraduate Student")});
});

P.implementService("haplo:descriptive_object_labelling:setup", function(type) {
    type(T.CourseModule, {
        selfLabelling: true,
        labelWith: [A.ModuleLeader, A.ResearchInstitute]
    });

    type(T.TaughtStudent, {
        labels: [Label.ActivityIdentity],
        labelWith: [A.ResearchInstitute]
    });

    type(T.TaughtProject, {
        selfLabelling: true,
        labelWith: [A.CourseModule],
        labelsFromLinked: [
            [A.TaughtStudent, A.ResearchInstitute],
            [A.CourseModule, A.ResearchInstitute]
        ]
    });

    type(T.StudentProject, {
        selfLabelling: true,
        labelsFromLinked: [[A.TaughtStudent, A.ResearchInstitute]]
    });
});

var TAUGHT_TYPES = [T.TaughtStudent, T.TaughtProject, T.StudentProject];

P.implementService("haplo:user_roles_permissions:setup", function(setup) {
    // Permissions
    setup.roleProjectPermission("Taught Student",                   "read",     TAUGHT_TYPES);
    setup.roleProjectPermission("Taught Project Supervisor",        "read",     TAUGHT_TYPES);
    setup.roleProjectPermission("Student Project Supervisor",       "read",     TAUGHT_TYPES);

    setup.roleProjectPermission("Taught Module Leader",        "read-edit",     TAUGHT_TYPES);

    setup.groupPermission(Group.Everyone, "read", T.CourseModule);
    setup.groupPermission(Group.Everyone, "read", T.TaughtStudent);

    // Roles
    setup.groupPersonalRole(Group.TaughtStudents,       "Is: Taught Student");
    setup.attributeRole("Taught Student",               T.TaughtProject,    A.TaughtStudent);
    setup.attributeRole("Taught Student",               T.StudentProject,   A.TaughtStudent);
    
    setup.attributeRole("Taught Project Supervisor",    T.TaughtProject,    A.Supervisor,   undefined);
    setup.attributeRole("Student Project Supervisor",   T.StudentProject,   A.Supervisor,   undefined);

    // Module leaders get access to all projects and students in the research institute of the module.
    setup.attributeRole("Taught Module Leader", T.CourseModule, A.ModuleLeader, undefined, A.ResearchInstitute);
});
