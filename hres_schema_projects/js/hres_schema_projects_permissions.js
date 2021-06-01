/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2018            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */

if(!O.application.config["hres_schema_projects_permissions:disable_default_permissions"]) {

    P.implementService("haplo:user_roles_permissions:setup", function(setup) {
        setup.groupPermission(Group.Researchers,        "read-create",  T.Project);
        setup.groupPermission(Group.AdminStaff,         "read-create",  T.Project);
        
        setup.roleProjectPermission("Researcher",       "read-write",   [T.Project]);
    });

}