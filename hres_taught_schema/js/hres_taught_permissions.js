
P.implementService("haplo:descriptive_object_labelling:setup", function(type) {
    type(T.CourseModule, {
        selfLabelling: true,
        labelWith: [A.ModuleLeader, A.ResearchInstitute]
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

    // Roles
    setup.groupPersonalRole(Group.TaughtStudents,       "Is: Taught Student");
    setup.attributeRole("Taught Student",               T.TaughtProject,    A.TaughtStudent);
    setup.attributeRole("Taught Student",               T.StudentProject,   A.TaughtStudent);
    
    setup.attributeRole("Taught Project Supervisor",    T.TaughtProject,    A.Supervisor,   undefined);
    setup.attributeRole("Student Project Supervisor",   T.StudentProject,   A.Supervisor,   undefined);

    // Module leaders get access to all projects and students in the research institute of the module.
    setup.attributeRole("Taught Module Leader", T.CourseModule, A.ModuleLeader, undefined, A.ResearchInstitute);
});
