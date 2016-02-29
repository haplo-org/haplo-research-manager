/* Haplo Research Manager                             http://haplo.org
 * (c) Haplo Services Ltd 2006 - 2016    http://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


P.implementService("haplo:descriptive_object_labelling:setup", function(type) {
    P.OUTPUT_TYPES.forEach(function(outputType) {
        type(outputType, {
            labels: [Label.Output],
            labelsFromLinked: [A.Author],
            // Label with creator & authors so they can see their own outputs
            labelWithCreator: true,
            labelWith: [A.Author]
        });
    });
});

P.implementService("haplo:user_roles_permissions:setup", function(setup) {
    // Accepted outputs can be read by everyone
    setup.groupPermission(Group.Everyone, "read", Label.AcceptedIntoRepository);
    // Outputs editors can read and write at all times
    setup.groupPermission(Group.OutputEditors, "read-write", Label.Output);
    // Setup role & permission which allows users to add outputs and then edit
    // anything that they wrote (Author labelling above) or submitted
    // (labelWithCreator above). Use an oversight role permission because there
    // will only ever be one label for this permission.
    setup.groupPermission(Group.Everyone, "create", Label.Output);
    setup.groupPersonalRole(Group.Everyone, "Is: Output Author");
    setup.roleOversightPermission("Is: Output Author", "read-write", [Label.Output]);
});
