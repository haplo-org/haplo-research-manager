
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

P.implementService("std:action_panel:home_page_my_links", function(display, builder) {
    var roles = O.service("haplo:permissions:user_roles", O.currentUser);
    if(roles.hasAnyRole("Principal Investigator")) {
        builder.link(400, "/do/hres-projects/researcher-projects/"+O.currentUser.ref,
            "My Projects");
    }
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
