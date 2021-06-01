/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */

var MAX_CO_INVESTIGATORS = P.MAX_CO_INVESTIGATORS =
    O.application.config["hres_funding:maximum_research_coinvestigators"] || 3;

var DISABLE_CREATE_PROJECT_BUTTON = O.application.config["hres_schema_projects:disable_create_project_button"] || false;
var DISPLAY_PROJECTS_TABLE_TITLE = O.application.config["hres_schema_projects:display_projects_table_title"] || false;

P.CanViewAllResearchProjects = O.action("hres:action:view-all-research-projects").
    title("View all Research Projects").
    allow("role", "Research Director").
    allow("role", "Research Administrator");

var projectsForResearcher = function(researcher) {
    return O.query().link(T.Project, A.Type).
        link(researcher.ref, A.Researcher).
        execute();
};

var canViewProjectsPage = function(user, researcher) {
    var hasProjects = projectsForResearcher(researcher).length > 0;
    if(!hasProjects) {
        return user.canCreate(O.labelList(T.Project, researcher.ref)) ||
            user.allowed(P.CanViewAllResearchProjects) ||
            (user && user.ref && user.ref == researcher.ref);
    } else { return true; }  
};

// --------------------------------------------------------------------------

_.each(["researcher", "staff"], function(type) { // TODO: Configurable additional panels
    P.implementService("std:action_panel:"+type, function(display, builder) {
        if(canViewProjectsPage(O.currentUser, display.object)) {
            builder.panel(2000).link("default",
                "/do/hres-projects/research-projects/"+display.object.ref, "Projects");
        }
    });
});

P.implementService("std:action_panel:home_page_my_links", function(display, builder) {
    var userRef = O.currentUser.ref;
    if(userRef) { 
        var person = userRef.load();
        if(person.isKindOf(T.Researcher) || person.isKindOf(T.Staff)) {
            builder.link(500, "/do/hres-projects/research-projects/"+userRef, NAME("hres:schema:my_links:my_projects", "My projects"));
        }
    }
});

// --------------------------------------------------------------------------

P.respond("GET,POST", "/do/hres-projects/research-projects", [
    {pathElement:0, as:"object"}
], function(E, researcher) {
    if(!canViewProjectsPage(O.currentUser, researcher)) {
        O.stop("Not permitted.");
    }
    let coInvestigatorFacts = [];
    for(var i=0; i < P.MAX_CO_INVESTIGATORS; i++) {
        coInvestigatorFacts.push("coInvestigator"+i);
    }
    var deferredDashboard = P.reporting.dashboard(E, {
        name: "research_projects",
        kind: "list",
        collection: "projects",
        title: "Projects: "+researcher.title
    }).
        filter(function(sq) {
            sq.or(function(ssq) {
                ssq.where("principalInvestigator", "=", researcher.ref);
                _.each(coInvestigatorFacts, (f) => ssq.where(f, "=", researcher.ref));
            });
        }).columns(100, [
            {fact:"ref", heading:"Project", link:true}
        ]).
        columns(600, [
            {fact:"principalInvestigator", type:"ref-person-name", link:true}
        ]).
        order(["createdAt"]).
        deferredRender();

    var builder = O.service("haplo:information_page:overview", {
        buildService: "hres_schema_projects:research-projects",
        pageTitle: "Projects",
        layout: "std:wide",
        backLink: researcher.url(),
        object: researcher
    }).
        section(60, P.template("create-project").deferredRender({
            researcher: researcher,
            dashboard: deferredDashboard,
            canCreateProject: O.currentUser.canCreate(O.labelList(T.Project, researcher.ref)) && !DISABLE_CREATE_PROJECT_BUTTON
        })).
        section(95, P.template("research-projects-title").deferredRender({
            title: NAME("hres_schema_projects:research_projects:title", "All Projects"),
            shouldDisplayTitle: !!DISPLAY_PROJECTS_TABLE_TITLE
        })).
        section(100, P.template("research-projects").deferredRender({
            dashboard: deferredDashboard
        })).
        respond(E);
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
        backLink: "/do/hres-projects/research-projects/"+researcher.ref,
        templateObject: templateObj
    }, "std:new_object_editor");
});

// --------------------------------------------------------------------------

P.hook("hPostObjectEdit", function(response, object, previous) {
    if(!object.isKindOf(T.Project)) { return; }
    if(!!previous) { return; }
    var r = response.replacementObject || (response.replacementObject = object.mutableCopy());
    // PI (ensure there is one)
    if(!object.first(A.Researcher, Q.PrincipalInvestigator)) {
        var co = object.first(A.Researcher, Q.CoInvestigator);
        var researcher = object.first(A.Researcher, Q.Null);
        if(co) {
            r.remove(A.Researcher, Q.CoInvestigator);
            r.append(co, A.Researcher, Q.PrincipalInvestigator);
        } else if(researcher) {
            r.remove(A.Researcher, Q.Null);
            r.append(researcher, A.Researcher, Q.PrincipalInvestigator);
        }
    }
});
