/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2021            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


/*HaploDoc
node: /hres_schema/financial_years
title: Financial years
--

An equivalent implementation to "Academic years":/hres/hres_schema/academic_years, to allow for financial year/quarter reporting navigation.

Differences from Academic years:
 * Default date range is 1st April to 31st March
 * Created years ensured up to 10 years ahead

h2. Config

Use the following to override the default financial year start/end dates.

h3(config). hres:financial_years:start_month

h3(config). hres:financial_years:start_day

h3(config). hres:financial_years:end_month

h3(config). hres:financial_years:end_day

h2. Services

h3(service). hres:financial_year:get_object_version

Usage:

@O.serviceMaybe("hres:financial_year:get_object_version, object, financialYear);@

Returns version of the given @object@ for specified @financialYear@ end date. \
If @object@ doesn't exist at the given time service will return earlier version of it, \
in case if object was never modified it will return original object version.

*/

var S_MONTH = O.application.config["hres:financial_years:start_month"];
var E_MONTH = O.application.config["hres:financial_years:end_month"];

var START_MONTH = (S_MONTH !== undefined) ? S_MONTH : 3;                        // April in JS zero-based years
var START_DAY = O.application.config["hres:financial_years:start_day"] || 1;    // first day of April
var END_MONTH = (E_MONTH !== undefined) ? E_MONTH : 2;                          // March
var END_DAY = O.application.config["hres:financial_years:end_day"] || 31;       // last day of March, because platform date ranges include last day

var ENSURE_AT_LEAST_YEARS_IN_FUTURE = 10;
var ENSURE_AT_LEAST_YEARS_IN_PAST = -6;

// An array of objects representing financial years in order, keys:
//   ref: of financial year object
//   title: "2019 - 2020"
//   datetime: DateTime object, will be a range
//   start, end: appropriate properties of datetime
//   previous, next: to previous and next financial years
//   index: of the entry in getAll() array
var financialYears;
var financialYearsLookup;
var loadFinancialYears = function() {
    financialYears = [];
    financialYearsLookup = O.refdict();
    O.impersonating(O.SYSTEM, () => {
        _.each(O.query().link(T.FinancialYear,A.Type).sortByDateAscending().execute(), (obj) => {
            let datetime = obj.first(A.Date);
            if(datetime) {
                let year = {
                    ref: obj.ref,
                    title: obj.title,
                    datetime: datetime,
                    start: datetime.start,
                    end: datetime.end
                };
                financialYears.push(year);
                financialYearsLookup.set(obj.ref, year);
            }
        });
    });
    // Add in previous and next properties
    let num = financialYears.length;
    for(let i = 0; i < num; ++i) {
        let year = financialYears[i];
        year.index = i;
        if(i > 0) { year.previous = financialYears[i-1]; }
        if(i < (num - 1)) { year.next = financialYears[i+1]; }
        Object.seal(year);
    }
    Object.seal(financialYears);
};

var ensureFinancialYears = function() {
    if(!financialYears) {
        loadFinancialYears();
    }
};

var findFinancialYear = function(date) {
    return _.find(financialYears, (y) => (y.start <= date) && (y.end > date));
};

// ----------------------------------------------------------------------------------------------------------------

// Get the financial year for this date, creating the financial year if necessary
var forDate = function(date) {
    ensureFinancialYears();
    let year = findFinancialYear(date);
    if(!year) {
        O.impersonating(O.SYSTEM, () => {
            // Determine the first year of the relevant financial year
            let financialStartYear = date.getFullYear();
            // Check if year is within reasonable range to avoid logic errors
            // due to javascript date constructor
            if(financialStartYear < 1970 || financialStartYear > 2100) {
                O.stop("Year must be between 1970-2100, date given: "+date.toString());
            }
            let cutOff = new Date(date.getFullYear(), START_MONTH, START_DAY);
            if(date < cutOff) { financialStartYear--; }
            // Make new object
            let obj = O.object();
            obj.appendType(T.FinancialYear);
            if(S_MONTH === 0) {
                obj.appendTitle(financialStartYear);
            } else {
                obj.appendTitle(""+financialStartYear+" - "+(financialStartYear+1));
            }
            let financialEndYear = (S_MONTH === 0) ? financialStartYear : financialStartYear+1;
            let datetime = O.datetime(
                new Date(financialStartYear, START_MONTH, START_DAY),
                new Date(financialEndYear,   END_MONTH,   END_DAY),
                O.PRECISION_DAY
            );
            obj.append(datetime, A.Date);
            obj.save();
            // Flush all the runtimes because any other runtime will have an invalid cache
            O.reloadJavaScriptRuntimes();
        });
        loadFinancialYears();
        year = findFinancialYear(date);
        if(!year) {
            throw new Error("Logic error in financial year creation");
        }
    }
    return year;
};

// --------------------------------------------------------------------------
// Objects and financial years

// Find expected ref for financial year
var expectedFinancialYearRef = function(object) {
    let date = object.first(A.Date);
    if(date && (O.typecode(date) === O.T_DATETIME)) {
        return forDate(date.start).ref;
    } else {
        return null;
    }
};

// --------------------------------------------------------------------------
// When annotated objects are created or updated, set the financial year

P.hook('hComputeAttributes', function(response, object) {
    if(object.isKindOfTypeAnnotated('hres:annotation:financial-year:apply')) {
        let financialYearRef = expectedFinancialYearRef(object);
        if(financialYearRef) {
            if(!(object.has(financialYearRef, A.FinancialYear))) {
                object.remove(A.FinancialYear);
                object.append(financialYearRef, A.FinancialYear);
            }
        }
    }
});

// ----------------------------------------------------------------------------------------------------------------
// Interface for other plugins to use

P.implementService("hres:financial_year:for_date", forDate);

P.implementService("hres:financial_year:year_info", function(ref) {
    ensureFinancialYears();
    return financialYearsLookup.get(ref);
});

P.implementService("hres:financial_year:all_year_info", function() {
    ensureFinancialYears();
    return financialYears;
});

P.implementService("hres:financial_year:navigation_bar", function(currentYear) {
    let year = currentYear ?
        O.service("hres:financial_year:year_info", currentYear) :
        O.service("hres:financial_year:for_date", new Date());
    return {
        year:year,
        deferred:P.template("academic-year-navigation").deferredRender(year)
    };
});

P.implementService("hres:financial_year:get_object_version", function(object, financialYear) {
    let date = O.serviceMaybe("hres:financial_year:year_info", financialYear);
    let obj = object.ref.loadVersionAtTime(date.end);

    if(obj) { return obj; }
    else if(object.history.length > 0) { return object.history[0]; }
    else { return object; }
});

/*HaploDoc
node: /hres_schema/financial_years/reporting_features
title: Reporting features
--

h2. Reporting features

h3(feature). hres:schema:financial_year_navigation

Where the fact you are using to determine the date is a date, use this feature to enable financial year navigation on a dashboard.

Example:
<pre>dashboard.use("hres:schema:financial_year_navigation", year, "projectStart")</pre>

h3(feature). hres:schema:financial_year_navigation_for_ref

Where the fact you are using to determine the date is a ref, use this feature to enable financial year navigation on a dashboard.

Example:
<pre>dashboard.use("hres:schema:financial_year_navigation_for_ref", year, "financialYear")</pre>

h3(feature). hres:schema:financial_quarter_navigation

Use this feature on a dashboard to enable quarter navigation where quarters line up with the financial year. \
Quarters are 1, 2, 3, and 4, and should be passed through the url. Q1 is April to June where default start month is used. \
Parameters are currentYear, currentQuarter, fact.

Example:
<pre>dashboard.use("hres:schema:financial_quarter_navigation", [Ref of relevant Financial year], 1, "projectStart");</pre>

*/

P.reporting.registerReportingFeature("hres:schema:financial_year_navigation", function(dashboard, currentYear, fact) {
    let yearNow = O.service("hres:financial_year:for_date", new Date());
    let year = currentYear ?
        O.service("hres:financial_year:year_info", currentYear) :
        yearNow;
    dashboard.filter((select) => {
        select.or((sq) => {
            if(yearNow.ref == year.ref) {
                sq.where(fact, "=", null);
            }
            sq.and((ssq) => {
                ssq.where(fact, ">=", year.start).
                    where(fact, "<", year.end);
            });
        });
    });
    dashboard.navigationUI((dashboard) => {
        return P.template("academic-year-navigation").deferredRender(year);
    });
});

P.reporting.registerReportingFeature("hres:schema:financial_quarter_navigation",
    function(dashboard, currentYear, currentQuarter, fact) {
        let year = currentYear ?
            O.service("hres:financial_year:year_info", currentYear) :
            O.service("hres:financial_year:for_date", new Date());
        let startMonth = (currentQuarter-1)*3;
        let endMonth = startMonth+3;
        dashboard.filter((select) => {
            select.or((sq) => {
                if(!currentYear) { sq.where(fact, "=", null); }
                sq.and((ssq) => {
                    ssq.where(fact, ">=", new XDate(year.start).addMonths(startMonth)).
                       where(fact, "<", new XDate(year.start).addMonths(endMonth));
                });
            });
        });

        let previousYear = currentYear, nextYear = currentYear;
        let nextQuarter = currentQuarter+1;
        let previousQuarter = currentQuarter-1;
        if(currentQuarter === 4) {
            nextYear = year.next.ref;
            nextQuarter = 1;
        } else if (currentQuarter === 1) {
            previousYear = year.previous.ref;
            previousQuarter = 4;
        }
        dashboard.navigationUI((dashboard) => {
            return P.template("quarter-navigation").deferredRender({
                year: year.title,
                quarter: currentQuarter,
                previous: previousQuarter,
                previousYear: previousYear,
                next: nextQuarter,
                nextYear: nextYear
            });
        });
    }
);

P.reporting.registerReportingFeature("hres:schema:financial_year_navigation_for_ref", function(dashboard, currentYear, fact) {
    let year = currentYear ?
        O.service("hres:financial_year:year_info", currentYear) :
        O.service("hres:financial_year:for_date", new Date());

    dashboard.filter((select) => {
        select.or((sq) => {
            sq.and((ssq) => {
                ssq.where(fact, "=", year.ref);
            });
        });
    });
    dashboard.navigationUI((dashboard) => {
        return P.template("academic-year-navigation").deferredRender(year);
    });
});

// ----------------------------------------------------------------------------------------------------------------
// There must exist at least a few financial years in the future

var ensureFinancialYearsInFutureAvailable = function() {
    let d = new Date();
    d.setFullYear(d.getFullYear()+ENSURE_AT_LEAST_YEARS_IN_PAST);
    for(let i = ENSURE_AT_LEAST_YEARS_IN_PAST; i <= ENSURE_AT_LEAST_YEARS_IN_FUTURE; ++i) {
        forDate(d);
        d.setFullYear(d.getFullYear()+1);
    }
};

// Check every morning to keep them updated
P.hook('hScheduleDailyEarly', function() {
    ensureFinancialYearsInFutureAvailable();
});

// Handler to check right now (useful when setting up new applications)
P.respond("GET", "/do/hres-schema-admin/ensure-financial-years", [
], function(E) {
    if(!O.currentUser.isMemberOf(Group.Administrators)) { O.stop("Not permitted"); }
    ensureFinancialYearsInFutureAvailable();
    E.render({
        message:"Done",
        pageTitle:"Ensure financial years"
    }, "std:ui:notice");
});
