/* Haplo Plugins                                      http://haplo.org
 * (c) Haplo Services Ltd 2006 - 2016    http://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


P.db.table("overview", {
    name: {type:"text"},
    updated: {type:"datetime"},
    user: {type:"user"},
    json: {type:"text"}
});

// --------------------------------------------------------------------------

P.respond("GET", "/do/activity", [
    {pathElement:0, as:"string", validate:P.validateActivityName}
], function(E, activityName) {
    var activity = P.getActivity(activityName);

    // Admin display shows menus and statistics
    var adminMode = false;

    // Try building the activity menu to see if we're in admin mode
    var menuBuilder = O.service("std_action_panel:build_panel", activity._menuActionPanelName, {
        style: "menu",
        options: {
            category: "activity:menu"
        }
    });
    if(menuBuilder.anyBuilderShouldBeRendered()) {
        adminMode = true;
    }

    // Setup basic view
    var view = {
        pageTitle: activity.title,
        activity: activity,
        canEdit: activity.userCanEdit(O.currentUser),
        adminMode: adminMode,
        adminMenu: menuBuilder ? menuBuilder.deferredRender() : undefined
    };

    // Get overview information
    var overviewq = P.db.overview.select().where("name","=",activityName).order("updated",true).limit(1);
    var overview = overviewq.length ? JSON.parse(overviewq[0].json) : {};
    view.overviewDoc = overview.text ? O.text(O.T_TEXT_DOCUMENT,overview.text).toString() : '';

    // Sidebar is composed of various elements
    var sidebarElements = [];
    var addSidebarElement = function(sort, deferred) { sidebarElements.push({sort:sort,deferred:deferred}); };
    var serviceNames = [
            "haplo_activity_navigation:overview:sidebar",
            "haplo_activity_navigation:overview:sidebar:"+activity.name
        ];
    serviceNames.forEach(function(service) {
        if(O.serviceImplemented(service)) { O.service(service, activity, addSidebarElement); }
    });

    // My links
    var profileObject = O.currentUser.ref ? O.currentUser.ref.load() : undefined;
    if(profileObject) {
        var myLinksBuilder = O.service("std_action_panel:build_panel", activity._myItemsActionPanelName, {
            object: profileObject,
            options: {"highlight":"primary"}
        });
        if(myLinksBuilder.anyBuilderShouldBeRendered()) {
            addSidebarElement(0, myLinksBuilder.deferredRender());
        }
    }

    // Generate 'links' action panel for right hand column of overview page
    var tilesBuilder = O.service("std_action_panel:build_panel", activity._linksActionPanelName, {
        style: "links",
        options: {
            category: "activity:overview",
            "haplo:activity": activity.name
        }
    });
    tilesBuilder.title("Useful links"); // default title for sidebar
    if(tilesBuilder.anyBuilderShouldBeRendered()) {
        addSidebarElement(1005, tilesBuilder.deferredRender());
    }

    // Admin mode displays more things
    if(adminMode) {
        // Statistics menu
        var statisticsBuilder = O.service("std_action_panel:build_panel", activity._statisticsActionPanelName, {
            style: "statistics",
            options: {
                category: "activity:statistics"
            }
        });
        if(statisticsBuilder.anyBuilderShouldBeRendered()) {
            view.statistics = statisticsBuilder.deferredRender();
        }
    }

    // Finally render it into the page
    E.appendSidebarHTML(P.template("overview-sidebar").render({
        sidebarElements: _.sortBy(sidebarElements,"sort")
    }));
    E.render(view, "overview");
});

// --------------------------------------------------------------------------

var overviewForm = P.form({
    "specificationVersion": 0,
    "formId": "overview",
    "formTitle": "Administration",
    "elements": [
        {type: "document-text", name:"text", path: "text"}
    ]
});

P.respond("GET,POST", "/do/activity/edit-overview", [
    {pathElement:0, as:"string", validate:P.validateActivityName}
], function(E, activityName) {
    var activity = P.getActivity(activityName);
    if(!activity.userCanEdit(O.currentUser)) { O.stop("Not permitted"); }

    // Get overview text & contacts
    var overviewq = P.db.overview.select().where("name","=",activityName).order("updated",true).limit(1);
    var document = overviewq.length ? JSON.parse(overviewq[0].json) : {};

    var form = overviewForm.handle(document, E.request);
    if(form.complete) {
        P.db.overview.create({
            name: activity.name,
            updated: new Date(),
            user: O.currentUser,
            json: JSON.stringify(document)
        }).save();
        return E.response.redirect("/do/activity/"+activity.name);
    }

    E.render({
        pageTitle: "Edit "+activity.title,
        backLink: "/do/activity/"+activity.name,
        backLinkText: "Cancel",
        activity: activity,
        form: form
    }, "overview-edit");
});
