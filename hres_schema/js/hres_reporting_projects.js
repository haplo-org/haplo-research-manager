
P.CanViewResearcherProjectsDashboard = O.action("hres:action:view-researcher-projects-dashboard").
    title("View Researcher Projects Dashboard").
    allow("group", Group.Everyone);

// --------------------------------------------------------------------------

P.implementService("std:reporting:discover_collections", function(discover) {
    discover("projects", "Projects");
});

P.implementService("std:reporting:collection:projects:setup", function(collection) {
    collection.
        currentObjectsOfType(T.Project).
        fact("principalInvestigator",       "ref",      "Principal Investigator");
});

P.implementService("std:reporting:gather_collection_update_rules", function(rule) {
    rule("projects", T.Project, A.Researcher);
});

P.implementService("std:reporting:collection:projects:get_facts_for_object", 
    function(object, row) {
        row.principalInvestigator = object.first(A.Researcher, Q.PrincipalInvestigator);
    });

// --------------------------------------------------------------------------

P.implementService("std:action_panel:researcher", function(display, builder) {
    if(O.currentUser.allowed(P.CanViewResearcherProjectsDashboard)) {
        builder.panel(2000).link("default",
            "/do/hres-navigation/researcher-projects/"+display.object.ref, "Projects");
    }
});

P.implementService("std:action_panel:home_page_my_links", function(display, builder) {
    var roles = O.service("haplo:permissions:user_roles", O.currentUser);
    if(roles.hasAnyRole("Principal Investigator")) {
        builder.link(400, "/do/hres-navigation/researcher-projects/"+O.currentUser.ref,
            "My Projects");
    }
});

// --------------------------------------------------------------------------

P.respond("GET,POST", "/do/hres-navigation/researcher-projects", [
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

P.respond("GET", "/do/hres-navigation/new-project", [
    {pathElement:0, as:"object"}
], function(E, researcher) {
    var templateObj = O.object();
    templateObj.appendType(T.Project);
    templateObj.append(researcher.ref,
        A.Researcher, Q.PrincipalInvestigator);
    E.render({
        pageTitle: "Add new Project",
        backLink: "/do/hres-navigation/researcher-projects/"+researcher.ref,
        templateObject: templateObj
    }, "std:new_object_editor");
});
