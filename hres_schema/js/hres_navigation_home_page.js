/* Haplo Research Manager                             http://haplo.org
 * (c) Haplo Services Ltd 2006 - 2016    http://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


// "My stuff" navigation shown on home page if user has a profile object.
// Plugins can add links below the "My record" by:
//  * implementing the home_page_my_links action panel and adding links directly
//  * implementing hres:schema:roles_for_my_links and specifying link using the roles system

// --------------------------------------------------------------------------

P.implementService("hres:schema:roles_for_my_links", function(myLink) {
    // TODO: My link for researcher's projects
    // myLink(100, "Researcher", "My project", "My projects");
});

// --------------------------------------------------------------------------

P.element("home_nav", "Home page key links navigation",
    function(L) {
        var myRecordRef = O.currentUser.ref;
        if(!myRecordRef) { return; }
        var myRecord = myRecordRef.load();
        L.render({
            myRecord: {
                highlight: "primary",
                elements: [
                    {label:"My record", href:myRecord.url()}
                ]
            },
            myLinks: {
                name: "std:action_panel",
                options: '{"panel":"home_page_my_links","style":"links"}',
                object: myRecord
            }
        }, "element/home_nav");
    }
);

// --------------------------------------------------------------------------

var rolesForMyLinksList;
var rolesForMyLinks = function() {
    if(!rolesForMyLinksList) {
        rolesForMyLinksList = [];
        O.service("hres:schema:roles_for_my_links", function(priority, role, label, labelPlural) {
            rolesForMyLinksList.push({
                priority:priority, role:role, label:label, labelPlural:labelPlural,
                urlName:role.toLowerCase().replace(/[^a-z0-9]+/,'-')
            });
        });
    }
    return rolesForMyLinksList;
};

P.implementService("std:action_panel:home_page_my_links", function(display, builder) {
    var roles = O.service("haplo:permissions:user_roles", O.currentUser);
    rolesForMyLinks().forEach(function(i) {
        var items = roles.labelsForRole(i.role);
        if(items.length === 1) {
            builder.link(i.priority, items[0].load().url(), i.label);
        } else if(items.length > 1) {
            // Link to disambiguation page instead
            builder.link(i.priority, "/do/hres-navigation/"+i.urlName, i.labelPlural);
        }
    });
});

P.respond("GET", "/do/hres-navigation", [
    {pathElement:0, as:"string"}
], function(E, roleUrlName) {
    var i = _.find(rolesForMyLinks(), function(l) { return l.urlName === roleUrlName; });
    if(!i) { O.stop("Unknown role"); }
    var roles = O.service("haplo:permissions:user_roles", O.currentUser);
    var items = roles.labelsForRole(i.role);
    E.render({
        i: i,
        items: _.map(items, function(ref) { return ref.load(); })
    }, "navigation-my-item-list");
});
