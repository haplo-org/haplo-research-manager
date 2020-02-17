/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


var CanViewDataMonitoringDashboards = O.action("hres-data-monitoring:view-reports").
    title("View data monitoring reports");

P.respond("GET,POST", "/do/hres-data-monitoring/researchers-missing-departments", [
], function(E) {
    CanViewDataMonitoringDashboards.enforce();
    var i = P.locale().text("template");
    P.reporting.dashboard(E, {
        kind:"list",
        collection:"researchers",
        name:"researchers_missing_departments",
        title: i["NAME(+Researcher) without academic departments"]
    }).
        filter(function(select) {
            select.where("faculty", "=", null);
        }).
        columns(100, [
            {fact:"ref", type:"ref-person-name", link:true, heading:NAME("Researcher")}
        ]).
        respond();
});
