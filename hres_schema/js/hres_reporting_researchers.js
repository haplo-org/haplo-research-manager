/* Haplo Research Manager                             http://haplo.org
 * (c) Haplo Services Ltd 2006 - 2016    http://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


P.implementService("std:reporting:discover_collections", function(discover) {
    discover("researchers", "Researchers", ["hres:people"]);
});

P.implementService("std:reporting:collection:researchers:setup", function(collection) {
    collection.
        currentObjectsOfType(T.Researcher).
        property("hres:row_permissions:additional_labels",  [Label.ActivityIdentity]);
        // TODO: Permissions for Researchers? Does it need different label lists for different purposes?
});
