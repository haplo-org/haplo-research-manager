/* Haplo Research Manager                             http://haplo.org
 * (c) Haplo Services Ltd 2006 - 2016    http://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */

/*HaploDoc
node: /hres_schema/hres_permissions
title: Permissions
sort: 20
--

h3(service). "hres_schema:override_person_permissions"

Use this service to implement custom permissions for the person type. By default, everyone can read person objects.

To use, return an object in the form of {"type":["group1", "group2"]}. The key is the type schema code and the value an array consisting of each group that can view the type.

<pre>language=javascript
P.implementService("hres_schema:override_person_permissions", function() {
    return {
        "phd:type:person:doctoral-researcher": ["hres:group:researchers", "hres:group:admin-staff", "hres:group:external-researchers"],
        "phd:type:person:doctoral-researcher-past": ["hres:group:researchers", "hres:group:admin-staff", "hres:group:external-researchers"]
    };
});
</pre>

*/

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
    if(O.serviceImplemented("hres_schema:override_person_permissions")) {
        let typesToOverride = O.service("hres_schema:override_person_permissions");
        let personSubtypes =  _.map(SCHEMA.getTypeInfo(T.Person).childTypes, ref => ref);
        _.each(personSubtypes, subType => {
            let code = SCHEMA.getTypeInfo(subType).code;
            if(typesToOverride[code]) {
                _.each(typesToOverride[code], group => {
                    setup.groupPermission(GROUP[group], "read", subType);
                });
            } else {
                setup.groupPermission(Group.Everyone, "read", subType);
            }
        });
    } else {
        setup.groupPermission(Group.Everyone, "read", T.Person);
    }

    setup.groupPermission(Group.Everyone, "read", T.Organisation);
    setup.groupPermission(Group.Everyone, "read", T.IntranetPage);
    // Research types
    setup.groupPermission(Group.Everyone, "read", T.ResearchInstitute);
    setup.groupPermission(Group.Everyone, "read", T.Committee);
    setup.groupPermission(Group.Everyone, "read", T.AcademicYear);
    setup.groupPermission(Group.Everyone, "read", T.FinancialYear);
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

//Hook to allow person sub-types to view themselves
P.hook("hOperationAllowOnObject", function(response, user, object, operation) {
    if(O.serviceImplemented("hres_schema:override_person_permissions")) {
        if(object.isKindOf(T.Person) && operation === "read" && user.ref == object.ref) {
            response.allow = true;
        }
    }
});

// --------------------------------------------------------------------------


// Allow Administrators and IT Support group to do everything.
O.action("std:action:administrator_override").
    allow("group", Group.Administrators).
    allow("group", Group.ITSupport);

O.action("haplo:action:accessibility-statement:can-edit-statements").
    allow("group", Group.ITSupport);