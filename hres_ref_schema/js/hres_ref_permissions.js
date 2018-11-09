/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2018            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


P.implementService("haplo:descriptive_object_labelling:setup", function(type) {
    // TODO: Review whether we want to reveal UoA information (as all labels are visible)
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
    setup.roleOversightPermission("Unit of Assessment Lead",      "read",     [T.Person, T.Project]);
});
