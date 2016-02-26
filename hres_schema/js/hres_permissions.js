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
    // Classification editors
    setup.groupPermission(Group.ClassificationEditors, "read-write", Label.CONCEPT);

    // Roles
    setup.attributeRole("Head", T.ResearchInstitute, A.Head);
});
