/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


P.CanViewResearcherProjectsDashboard = O.action("hres:action:view-researcher-projects-dashboard").
    title("View Researcher Projects Dashboard").
    allow("role", "Head").
    allow("role", "Research Director").
    allow("role", "Research Administrator").
    allow("role", "Principal Investigator");

// --------------------------------------------------------------------------

P.implementService("std:action_panel:researcher", function(display, builder) {
    if(O.currentUser.allowed(P.CanViewResearcherProjectsDashboard)) {
        builder.panel(2000).link("default",
            "/do/hres-projects/researcher-projects/"+display.object.ref, "Projects");
    }
});

P.implementService("hres:schema:roles_for_my_links", function(myLink) {
    myLink(100, "Principal Investigator", "My Project", "My Projects");
});

// --------------------------------------------------------------------------

P.respond("GET,POST", "/do/hres-projects/researcher-projects", [
    {pathElement:0, as:"object"}
], function(E, researcher) {
    P.CanViewResearcherProjectsDashboard.enforce();
    var deferredDashboard = P.reporting.dashboard(E, {
        name: "researcher_projects",
        kind: "list",
        collection: "projects",
        title: "Projects: "+researcher.title
    }).
        filter(function(sq) {
            sq.where("principalInvestigator", "=", researcher.ref);
        }).
        columns(100, [
            {fact:"ref", heading:"Project", link:true}
        ]).
        deferredRender();
    E.render({
        pageTitle: "Projects: "+researcher.title,
        backLink: researcher.url(),
        researcher: researcher,
        dashboard: deferredDashboard,
        canCreateProject: !!(O.currentUser.canCreateObjectOfType(T.Project))
    });
});

// --------------------------------------------------------------------------

P.respond("GET", "/do/hres-projects/new-project", [
    {pathElement:0, as:"object"}
], function(E, researcher) {
    var templateObj = O.object();
    templateObj.appendType(T.Project);
    templateObj.append(researcher.ref,
        A.Researcher, Q.PrincipalInvestigator);
    E.render({
        pageTitle: "Add new Project",
        backLink: "/do/hres-projects/researcher-projects/"+researcher.ref,
        templateObject: templateObj
    }, "std:new_object_editor");
});
