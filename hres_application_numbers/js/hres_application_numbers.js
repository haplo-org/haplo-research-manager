/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


var createAppIdValue = P.implementTextType("hres:appid", "Application ID", {
    string: function(value) {
        return value[0];
    },
    indexable: function(value) {
        return value[0];
    },
    identifier: function(value) {
        return value[0].toUpperCase();
    },
    render: function(value) {
        return P.template("application-id").render({
            id: value[0]
        });
    },
    $setupEditorPlugin: function(value) {
        P.template("include_application_id_editor_plugin").render();   // hack to include client side support
    }
});

// --------------------------------------------------------------------------

P.implementService("hres:application_numbers:new_application_id", function(appId) {
    return createAppIdValue([appId]);
});

P.implementService("hres:application_numbers:new_application_id_for_academic_year", function(prefix, academicYearRef) {
    var year = O.service("hres:academic_year:year_info", academicYearRef);
    var yearNumber = year.start.getFullYear() - 2000;
    var dataProperty = "appID_Next_"+prefix;
    var nexts = P.data[dataProperty] || {};
    var nextProperty = year.ref.toString();
    if(!(nextProperty in nexts)) { nexts[nextProperty] = 1; }
    var appId = prefix+_.sprintf("%02d%02d-%04d", yearNumber, yearNumber+1, nexts[nextProperty]);
    nexts[nextProperty]++;
    P.data[dataProperty] = nexts;
    return createAppIdValue([appId]);
});

P.implementService("hres:application_numbers:new_application_id_for_calendar_year", function(prefix, fullYear) {
    var dataProperty = "appID_Next_"+prefix;
    var nexts = P.data[dataProperty] || {};
    var nextProperty = fullYear.toString();
    if(!(nextProperty in nexts)) { nexts[nextProperty] = 1; }
    var appId = prefix+_.sprintf("%04d-%04d", fullYear, nexts[nextProperty]);
    nexts[nextProperty]++;
    P.data[dataProperty] = nexts;
    return createAppIdValue([appId]);
});

// --------------------------------------------------------------------------

var APPLICATION_ID_REGEXP = /^\s*([A-Za-z]{3}[0-9]{4}-[0-9]{4,6})\s*$/;

P.hook("hPreSearchUI", function(response, query, subset) {
    if(query) {
        var m = APPLICATION_ID_REGEXP.exec(query);
        if(m) {
            var q = O.query().identifier(createAppIdValue([m[1].toUpperCase()])).execute();
            if(q.length > 0) {
                response.redirectPath = q[0].url();
            }
        }
    }
});
