/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2018            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


// ------- Homepage Activity --------------------------------------

var CanEditREFOverview = O.action("hres:action:ref:can_edit_activity_overview").
    title("Can edit REF activity overview text").
    allow("group", Group.REFManagers);

// Creates link on the homepage action panel to a reporting and guides area
P.implementService("haplo_activity_navigation:discover", function(activity) {
    activity(40, "ref", "REF", "E238,0,b E210,0,a E511,0,d E20A,0,e", CanEditREFOverview);
});

// --------- New REF Exercise --------------------------------------

var CanStartProcess = O.action("hres_ref_process_management:manage_ref").
    title("Manage REF Process").
    allow("group", Group.REFManagers);

P.implementService("std:action_panel:activity:menu:ref", function(display, builder) {
    if(O.currentUser.allowed(CanStartProcess)) {
        let panel = builder.panel(10).title("REF Exercise");
        panel.link(100, "/do/hres-ref-management/start-process", "Start new process");
    }
});

P.respond("GET,POST", "/do/hres-ref-management/start-process", [
], function(E) {
    CanStartProcess.enforce();
    if(E.request.method === "POST") {
        O.background.run("hres_ref_process_management:start_process", {});
        return E.response.redirect("/do/activity/ref");
    }
    let sections = [];
    O.serviceMaybe("hres_ref_process_management:add_start_guidance", sections);
    E.render({
        pageTitle: "Start a new REF process",
        sections: sections,
        confirm: {
            text: "Please confirm you would like to start a new REF process",
            options: [{label:"Confirm"}]
        }
    }, "start-process");
});

P.backgroundCallback("start_process", function(data) {
    O.serviceMaybe("hres_ref_process_management:start_process");    
});
