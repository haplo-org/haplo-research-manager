/* Haplo Plugins                                      http://haplo.org
 * (c) Haplo Services Ltd 2006 - 2016    http://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */

/*

    Concepts:

    * Activity - a broad area of functionailty provided by one or more plugins.
    * Activity owner - the plugin which declares the activity exists. 
    * Activity tile - the tile on the home page for that activity.
    * Activity overview - page with intro text and tiles for key functionality
    * My items - key entry point for the activity which links to the primary
        page where the user starts work on an activity.
    * Activity menu - for authorised users, a page of menu entries and
        key statistics for that activity.

    How to set up an application to use it:

    * Choose an appropriate home page element from the requirements.schema file.

    How to implement an activity:

    * Choose the activity owner plugin with care. It should be one that all
        the other plugins in that activity depend on.
    * Implement haplo_activity_navigation:discover service to create the activity.
        (services below use ACTIVITY_NAME for the name of the activity with s/-/_/g)
    * Implement std:action_panel:activity:my_items:ACTIVITY_NAME to add the important "My items"
        link to the overview page.
    * To add links to the overview page, implement std:action_panel:activity:overview:ACTIVITY_NAME
    * To add things to to the overview page, implement haplo_activity_navigation:overview:ACTIVITY_NAME
        or haplo_activity_navigation:overview to add items to all pages.
    * To add things to the sidebar on the overview page, implement
        haplo_activity_navigation:overview:sidebar:ACTIVITY_NAME or
        haplo_activity_navigation:overview:sidebar to insert on everything or implement your own selective logic)
    * To add links to the menu, implement std:action_panel:activity:menu:ACTIVITY_NAME
    * To add statistics to the top of the menu page, implement std:action_panel:activity:statistics:ACTIVITY_NAME

    Things to watch out for:

    * Security & authorisation to see stats & menu entries is implemented by
        the implementing plugins. The activity system does not do any permissions.

    Statistics for menu:

    * These should use a std_reporting wherever possible. Define the statistic on the
        collection, then use P.reporting.statisticsPanelBuilder()
    * Link to the relevant dashboard for easy click through.
    * If the statistic has units or a percentage, use displayFormat in the statisitic
        definition.
    * If the statistic can be quickly calculated, just use builder.element(),
        but really std_reporting is preferred.

*/

// --------------------------------------------------------------------------

var DefaultEditAction = O.action("haplo_activity_navigation:default_allow_edit").
    title("Default edit permission for activity overview");

// --------------------------------------------------------------------------

var activities;
var activityByName;

P._ensureDiscovered = function() {
    if(activities) { return; }
    if(O.serviceImplemented("haplo_activity_navigation:discover")) {
        var discovered = [];
        activityByName = {};
        O.service("haplo_activity_navigation:discover", function(sort, name, title, icon, editAction) {
            if(!/^[a-z0-9\-]+$/.test(name)) {
                throw new Error("Invalid activity name");
            }
            var activity = new Activity(sort, name, title, icon, editAction);
            discovered.push(activity);
            activityByName[name] = activity;
        });
        activities = _.sortBy(discovered, "sort");
    }
};

P.getActivities = function() {
    P._ensureDiscovered();
    return activities;
};

P.getActivity = function(name) {
    P._ensureDiscovered();
    var activity = activityByName[name];
    if(!activity) { throw new Error("Unknown activity "+name); }
    return activity;
};

P.validateActivityName = function(name) {
    P._ensureDiscovered();
    return name in activityByName;
};

P.implementService("haplo_activity_navigation:get_activity", P.getActivity);

// --------------------------------------------------------------------------

var Activity = function(sort, name, title, icon, editAction) {
    this.sort = sort;
    this.name = name;
    this.title = title;
    this.icon = icon;
    this.editAction = editAction || DefaultEditAction;
    var nameForService = name.replace(/-/g,'_');
    this._editOverviewAction = "activity:edit_overview:"+nameForService;
    this._myItemsActionPanelName = "activity:my_items:"+nameForService;
    this._linksActionPanelName = "activity:overview:"+nameForService;
    this._menuActionPanelName = "activity:menu:"+nameForService;
    this._statisticsActionPanelName = "activity:statistics:"+nameForService;
};

// --------------------------------------------------------------------------

P.implementService("std:action_panel:home_activities", function(display, builder) {
    var excludes = O.application.config["haplo_activity_navigation:home_exclude_activity"] || [];
    _.each(P.getActivities(), function(activity) {
        if(-1 === excludes.indexOf(activity.name)) {
            builder.element(activity.sort, {
                href:"/do/activity/"+activity.name,
                label: activity.title,
                icon: activity.icon
            });
        }
    });
});

