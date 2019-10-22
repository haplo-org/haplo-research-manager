/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2019            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


P.hook('hUserPermissionRules', function(response, user) {
    if(user.isMemberOf(Group.CanAccessDMPApi)) {
        response.rules.rule(T.Project, O.STATEMENT_ALLOW, O.PERM_READ);
        response.rules.rule(T.Person, O.STATEMENT_ALLOW, O.PERM_READ);
        if("Dataset" in T) { response.rules.rule(T.Dataset, O.STATEMENT_ALLOW, O.PERM_READ); }
        if("Proposal" in T) { response.rules.rule(T.Proposal, O.STATEMENT_ALLOW, O.PERM_READ); }
        if("EthicsApplication" in T) { response.rules.rule(T.EthicsApplication, O.STATEMENT_ALLOW, O.PERM_READ); }
        response.rules.rule(Label.Concept, O.STATEMENT_ALLOW, O.PERM_READ);
    }
});


P.respond("GET,POST", "/api/hres-data-management-plans-standalone/get-plan", [
    {pathElement:0, as:"ref"}
], function(E, projectRef) {
    O.impersonating(O.serviceUser("hres:repository:service-user:data-management-plan"), () => { 
        E.response.body = JSON.stringify({
            dmp: O.service("hres:data_management_plans:get_dmp", projectRef)
        }, undefined, 2);
        E.response.kind = "json";
    });
}); 
