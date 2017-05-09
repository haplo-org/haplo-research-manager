/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


var ensureCalendarSourcesDiscovered = function() {
    if("_sources" in P) { return; }
    P._sources = {};
    if(O.serviceImplemented("hres:calendar:discover_calendar_sources")) {
        O.service("hres:calendar:discover_calendar_sources", function discover(name, title, description) {
            if(!(name in P._sources)) {
                P._sources[name] = new CalendarSource(name, title, description);
            }
        });
    }
};

var CalendarSource = function(name, title, description) {
    this.name = name;
    this.title = title;
    this.description = description;
};
CalendarSource.prototype.getEventsForCurrentUser = function() {
    var events = O.serviceMaybe("hres:calendar:source:"+this.name+":events");
    return events || [];
};

P.implementService("std:action_panel:home_page", function(display, builder) {
    builder.panel(1500).
        link("default", "/do/hres-calendar-subscriptions/my-subscriptions",
            "Calendar subscriptions", undefined);
});

P.respond("GET", "/do/hres-calendar-subscriptions/my-subscriptions", [
], function(E) {
    ensureCalendarSourcesDiscovered();
    var calendarUrl = O.service("haplo_calendar_access:get_url_for_user",
        "hres_calendar_subscriptions", O.currentUser);
    E.render({
        sources: _.values(P._sources),
        calendarUrl: calendarUrl
    });
});

P.respond("GET,POST", "/do/hres-calendar-subscriptions/generate-new-url", [
], function(E) {
    if(E.request.method === "POST") {
        O.service("haplo_calendar_access:generate_new_url_for_user",
            "hres_calendar_subscriptions", O.currentUser);
        E.response.redirect("/do/hres-calendar-subscriptions/my-subscriptions");
    }
    E.render({
        pageTitle: "Generate new subscription link",
        backLink: "/do/hres-calendar-subscription/my-subscriptions",
        text: "This will revoke the current subscription link, rendering it invalid. You will be given a new URL to subscribe to.",
        options: [
            {
                action:"/do/hres-calendar-subscriptions/generate-new-url",
                label:"Generate new subscription link"
            }
        ]
    }, "std:ui:confirm");
});

P.implementService("haplo_calendar_access:hres_calendar_subscriptions:build", function(config) {
    ensureCalendarSourcesDiscovered();
    var events = [];
    _.each(P._sources, function(source) {
        Array.prototype.push.apply(events, source.getEventsForCurrentUser()); // append without new array
    });
    // TODO: ability to get 'product name'(?) for use in plugins
    var title = O.application.config["hres_calendar_subscriptions:calendar_feed_title"] || O.application.name;
    return {
        title: title,
        events: events
    };
});
