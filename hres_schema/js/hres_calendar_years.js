/* Haplo Research Manager                             http://haplo.org
 * (c) Haplo Services Ltd 2006 - 2016    http://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


P.reporting.registerReportingFeature("hres:schema:calendar_year_navigation", function(dashboard, currentYear, fact) {
    var year = currentYear || new Date().getFullYear();
    dashboard.filter(function(select) {
        select.or(function(sq) {
            if(!year) { sq.where(fact, "=", null); }
            sq.and(function(ssq) {
                ssq.where(fact, ">=", new Date(year, 0)).
                   where(fact, "<", new Date(year, 12)); // javascript wraps this to january of next year
            });
        });
    });
    dashboard.navigationUI(function(dashboard) {
        return P.template("calendar-year-navigation").deferredRender({
            year: year,
            previous: year-1,
            next: year+1
        });
    });
});

P.reporting.registerReportingFeature("hres:schema:calendar_year_navigation_for_json_columns", function(dashboard, currentYear) {
    var year = currentYear || new Date().getFullYear();
    dashboard.property("hres:schema:calendar_year_navigation_for_json_columns:year", year);
    dashboard.property("std:reporting:json_column:default_value_property", year.toString());
    dashboard.navigationUI(function(dashboard) {
        return P.template("calendar-year-navigation").deferredRender({
            year: year,
            previous: year-1,
            next: year+1
        });
    });
});

P.reporting.registerReportingFeature("hres:schema:calendar_month_navigation", function(dashboard, fact) {
    var attrName = 'data-'+fact.toLowerCase();
    dashboard.$rowAttributeFns.push(function(row, attrs) {     // TODO - expose from api
        var value = row[fact];
        if(value !== null) { attrs[attrName] = value.toString(); }
    });
    dashboard.navigationUI(function(dashboard) {
        return P.template("widget_calendar_month_filter").deferredRender({
            fact: fact.toLowerCase(),
            months: ['January', 'February', 'March', 'April', 'May' ,'June' ,
                'July' ,'August' ,'September', 'October', 'November', 'December']
        });
    });
});
