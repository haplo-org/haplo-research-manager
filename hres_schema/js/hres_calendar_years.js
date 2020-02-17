/* Haplo Research Manager                             http://haplo.org
 * (c) Haplo Services Ltd 2006 - 2016    http://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */

var calendarYearNavigationDeferredRender = function(year) {
    return P.template("calendar-year-navigation").deferredRender({
        year: year,
        previous: year-1,
        next: year+1
    });
};

P.reporting.registerReportingFeature("hres:schema:calendar_year_navigation",
    function(dashboard, currentYear, fact, startDate, endDate) {
        // N.B. avoid usage of startDate, endDate params
        // you will most likely not need to use these
        // these also adversely affect some semantics below.
        var year = currentYear || new Date().getFullYear();
        dashboard.filter(function(select) {
            select.or(function(sq) {
                if(!year) { sq.where(fact, "=", null); }
                sq.and(function(ssq) {
                    ssq.where(fact, ">=", startDate || new Date(year, 0)).
                       where(fact, "<", endDate || new Date(year, 12));
                       // months are zero-indexed, JS wraps (month = 12) to Jan of next year
                });
            });
        });
        dashboard.navigationUI(function(dashboard) {
            return calendarYearNavigationDeferredRender(year);
        });
    }
);

P.implementService("hres:calendar_year:navigation_bar", function(currentYear) {
    var year = currentYear || new Date().getFullYear();
    return {
        year: year,
        deferred: calendarYearNavigationDeferredRender(year)
    };
});

P.reporting.registerReportingFeature("hres:schema:calendar_month_navigation",
    function(dashboard, currentYear, currentMonth, fact, startDate, endDate) {
        dashboard.filter(function(select) {
            select.or(function(sq) {
                if(!currentYear) { sq.where(fact, "=", null); }
                sq.and(function(ssq) {
                    ssq.where(fact, ">=", startDate || new Date(currentYear, currentMonth)).
                       where(fact, "<", endDate || new Date(currentYear, currentMonth+1));
                       // JS wraps months, so adding 1 always returns the first day of the mext month
                });
            });
        });
        var monthName = new XDate(currentYear, currentMonth).toString("MMM");
        var previousYear = currentYear, nextYear = currentYear;
        var previousMonth = currentMonth-1;
        var nextMonth = currentMonth+1;
        if(currentMonth === 0) {
            previousMonth = 11;
            previousYear = currentYear-1;
        } else if (currentMonth === 11) {
            nextMonth = 0;
            nextYear = currentYear+1;
        }
        dashboard.navigationUI(function(dashboard) {
            return P.template("calendar-month-navigation").deferredRender({
                year: currentYear,
                monthName: monthName,
                month: currentMonth,
                previous: previousMonth,
                previousYear: previousYear,
                next: nextMonth,
                nextYear: nextYear
            });
        });
    }
);

P.reporting.registerReportingFeature("hres:schema:calendar_year_and_month_navigation",
    function(dashboard, currentYear, currentMonth, fact, startDate, endDate) {
        dashboard.filter(function(select) {
            select.or(function(sq) {
                if(!currentYear) { sq.where(fact, "=", null); }
                sq.and(function(ssq) {
                    ssq.where(fact, ">=", startDate || new Date(currentYear, currentMonth)).
                       where(fact, "<", endDate || new Date(currentYear, currentMonth+1));
                       // JS wraps months, so adding 1 always returns the first day of the mext month
                });
            });
        });
        let monthName = new XDate(currentYear, currentMonth).toString("MMMM");
        let previousMonth = currentMonth-1;
        let nextMonth = currentMonth+1;
        let previousYear, nextYear, monthPreviousYear, monthNextYear;
        previousYear = currentYear-1;
        nextYear = currentYear+1;
        monthNextYear = monthPreviousYear = currentYear;
        
        if(currentMonth === 0) { 
            previousMonth = 11;
            monthPreviousYear = currentYear-1;
        } else if (currentMonth === 11) {
            nextMonth = 0;
            monthNextYear = currentYear+1;
        }
        dashboard.navigationUI(function(dashboard) {
            return P.template("calendar-year-and-month-navigation").deferredRender({
                monthName: monthName,
                month: currentMonth,
                previousMonth: previousMonth,
                nextMonth: nextMonth,
                year: currentYear,
                previousYear: previousYear,
                nextYear: nextYear,
                monthPreviousYear: monthPreviousYear,
                monthNextYear: monthNextYear
            });
        });
    }
);

P.reporting.registerReportingFeature("hres:schema:calendar_quarter_navigation",
    function(dashboard, currentYear, currentQuarter, fact, startDate, endDate) {
        var startMonth = (currentQuarter-1)*3;
        var endMonth = startMonth+3;
        dashboard.filter(function(select) {
            select.or(function(sq) {
                if(!currentYear) { sq.where(fact, "=", null); }
                sq.and(function(ssq) {
                    ssq.where(fact, ">=", startDate || new Date(currentYear, startMonth)).
                       where(fact, "<", endDate || new Date(currentYear, endMonth));
                       // JS wraps months, so adding 1 always returns the first day of the mext month
                });
            });
        });

        var previousYear = currentYear, nextYear = currentYear;
        var nextQuarter = currentQuarter+1;
        var previousQuarter = currentQuarter-1;
        if(currentQuarter === 4) {
            nextYear = currentYear+1;
            nextQuarter = 1;
        } else if (currentQuarter === 1) {
            previousYear = currentYear-1;
            previousQuarter = 4;
        }
        dashboard.navigationUI(function(dashboard) {
            return P.template("quarter-navigation").deferredRender({
                year: currentYear,
                quarter: currentQuarter,
                previous: previousQuarter,
                previousYear: previousYear,
                next: nextQuarter,
                nextYear: nextYear
            });
        });
    }
);

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
