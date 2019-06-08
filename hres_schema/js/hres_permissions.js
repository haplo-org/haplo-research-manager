/* Haplo Research Manager                             http://haplo.org
 * (c) Haplo Services Ltd 2006 - 2016    http://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


P.implementService("haplo:descriptive_object_labelling:setup", function(type) {
    type(T.Person, {
        labels: [Label.ActivityIdentity],
        labelWith: [A.ResearchInstitute]
    });

    type(T.Committee, {
        selfLabelling: true,
        labels: [Label.ActivityIdentity],
        labelWith: [A.ResearchInstitute]
    });

    type(T.Organisation, {
        labels: [Label.ActivityIdentity]
    });
    
    type(T.Project, {
        selfLabelling: true,
        labels: [Label.ActivityResearch],
        labelsFromLinked: [[A.Researcher, A.ResearchInstitute]]
    });

    if("Meeting" in T) {
        type(T.Meeting, {
            labels: [Label.ActivityResearch]
        });
    }
});

P.implementService("haplo:user_roles_permissions:setup", function(setup) {
    // Standard Administrators group should be able to do just about everything
    setup.administratorGroup(Group.Administrators);
    // Standard types
    setup.groupPermission(Group.Everyone, "read", T.Person);
    setup.groupPermission(Group.Everyone, "read", T.Organisation);
    setup.groupPermission(Group.Everyone, "read", T.IntranetPage);
    // Research types
    setup.groupPermission(Group.Everyone, "read", T.ResearchInstitute);
    setup.groupPermission(Group.Everyone, "read", T.Committee);
    setup.groupPermission(Group.Everyone, "read", T.AcademicYear);
    // Classification editors
    setup.groupPermission(Group.ClassificationEditors, "read-write", Label.CONCEPT);

    // Roles
    setup.groupPersonalRole(Group.Researchers,      "Is: Researcher");
    setup.groupPersonalRole(Group.AdminStaff,       "Is: Admin staff");
    setup.attributeRole("Head",                     T.ResearchInstitute,    A.Head);
    setup.attributeRole("Research Administrator",   T.ResearchInstitute,    A.ResearchAdministrator);
    setup.attributeRole("Research Director",        T.ResearchInstitute,    A.ResearchDirector);
    setup.attributeRole("Committee Member",         T.Committee,            A.CommitteeMember);
    setup.attributeRole("Committee Representative", T.Committee,            A.CommitteeRepresentative);
    setup.attributeRole("Researcher",               T.Project,              A.Researcher);

    // Role permissions
    setup.roleOversightPermission("Research Administrator", "read-edit", [T.ResearchInstitute]);
});

// --------------------------------------------------------------------------

// Allow Administrators and IT Support group to do everything.
O.action("std:action:administrator_override").
    allow("group", Group.Administrators).
    allow("group", Group.ITSupport);
