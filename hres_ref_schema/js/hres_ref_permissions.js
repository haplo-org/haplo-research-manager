/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2018            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


P.implementService("haplo:descriptive_object_labelling:setup", function(type) {
    type(T.Person, {
        labelWith: [A.REFUnitOfAssessment]
    });

    type(T.Project, {
        labelsFromLinked: [[A.Researcher, A.REFUnitOfAssessment]]
    });
});

P.implementService("haplo:user_roles_permissions:setup", function(setup) {
    setup.attributeRole("Unit of Assessment Lead",         T.REFUnitOfAssessment,  A.Head);
    
    // UoA Leads get read permissions at all things within their UoA
    // NOTE: "read-edit" for T.Person doesn't give the permissions you intend. as editing the UoA
    // will relabel the person to be outside of the Lead's permitted labelset
    setup.roleOversightPermission("Unit of Assessment Lead",      "read",     [T.Person, T.Project]);
    setup.groupPermission(Group.REFManagers,        "read-edit",        T.Person);
    setup.groupRestrictionLabel(Group.REFManagers, Label.EditREFUoA);
});
