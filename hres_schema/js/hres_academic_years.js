/* Haplo Research Manager                             http://haplo.org
 * (c) Haplo Services Ltd 2006 - 2016    http://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


/*HaploDoc
node: /hres_schema/academic_years
title: Academic years
--

h2. Using Academic Years

Your objects should include a calendar year in the @A.Date@ attributes.

Add an annotation to your type definition so that the academic year will \
be set and updated when the object changes. In your requirements.schema file:

 * @annotation hres:annotation:academic-year:apply@


h2. Workflows

@use("hres:schema")@ to set up entities and tags.

<pre>language=javascript
use("std:dashboard:states", {
    configurationService: "hres:schema:workflow:dashboard:states:configure",
    // rest ofstd:dashboard:states specification
});
</pre>


h2. Permissions

Everyone has permission to read academic year objects, and they're created \
automatically when they're required.

h2. Services

h3(service). hres:academic_year:get_object_version

Usage:

@O.serviceMaybe("hres:academic_year:get_object_version, object, academicYear);@

Returns version of the given @object@ for specified @academicYear@ end date. \
If @object@ doesn't exist at the given time service will return earlier version of it, \
in case if object was never modified it will return original object version.

*/


var START_MONTH = 7;    // August in JS zero-based years
var START_DAY = 1;      // first day of August
var END_MONTH = 6;      // July
var END_DAY = 31;       // last day of July, because platform date ranges include last day

var ENSURE_AT_LEAST_YEARS_IN_FUTURE = 2;

// An array of objects representing academic years in order, keys:
//   ref: of academic year object
//   title: "2014 - 2015"
//   datetime: DateTime object, will be a range
//   start, end: appropraite properties of datetime
//   previous, next: to previous and next academic years
//   index: of the entry in getAll() array
var academicYears;
var academicYearsLookup;
var loadAcademicYears = function() {
    academicYears = [];
    academicYearsLookup = O.refdict();
    O.impersonating(O.SYSTEM, function() {
        _.each(O.query().link(T.AcademicYear,A.Type).sortByDateAscending().execute(), function(obj) {
            var datetime = obj.first(A.Date);
            if(datetime) {
                var year = {
                    ref: obj.ref,
                    title: obj.title,
                    datetime: datetime,
                    start: datetime.start,
                    end: datetime.end
                };
                academicYears.push(year);
                academicYearsLookup.set(obj.ref, year);
            }
        });
    });
    // Add in previous and next properties
    var num = academicYears.length;
    for(var i = 0; i < num; ++i) {
        var year = academicYears[i];
        year.index = i;
        if(i > 0) { year.previous = academicYears[i-1]; }
        if(i < (num - 1)) { year.next = academicYears[i+1]; }
        Object.seal(year);
    }
    Object.seal(academicYears);
};
var ensureAcademicYears = function() {
    if(!academicYears) {
        loadAcademicYears();
    }
};
var findAcademicYear = function(date) {
    return _.find(academicYears, function(y) {
        return (y.start <= date) && (y.end > date);
    });
};

// ----------------------------------------------------------------------------------------------------------------

// Get the academic year for this date, creating the academic year if necessary
var forDate = function(date) {
    ensureAcademicYears();
    var year = findAcademicYear(date);
    if(!year) {
        O.impersonating(O.SYSTEM, function() {
            // Determine the first year of the relevant academic year
            var academicStartYear = date.getFullYear();
            // Check if year is within reasonable range to avoid logic errors
            // due to javascript date constructor
            if(academicStartYear < 1970 || academicStartYear > 2100) {
                O.stop("Year must be between 1970-2100, date given: "+date.toString());
            }
            var cutOff = new Date(date.getFullYear(), START_MONTH, START_DAY);
            if(date < cutOff) { academicStartYear--; }
            // Make new object
            var obj = O.object();
            obj.appendType(T.AcademicYear);
            obj.appendTitle(""+academicStartYear+" - "+(academicStartYear+1));
            var datetime = O.datetime(
                new Date(academicStartYear,     START_MONTH, START_DAY),
                new Date(academicStartYear + 1, END_MONTH,   END_DAY),
                O.PRECISION_DAY
            );
            obj.append(datetime, A.Date);
            obj.save();
            // Flush all the runtimes because any other runtime will have an invalid cache
            O.reloadJavaScriptRuntimes();
        });
        loadAcademicYears();
        year = findAcademicYear(date);
        if(!year) {
            throw new Error("Logic error in academic year creation");
        }
    }
    return year;
};

// --------------------------------------------------------------------------
// Objects and academic years

// Find expected ref for academic year
var expectedAcademicYearRef = function(object) {
    var date = object.first(A.Date);
    if(date && (O.typecode(date) === O.T_DATETIME)) {
        return forDate(date.start).ref;
    } else {
        return null;
    }
};

// --------------------------------------------------------------------------
// When objects are created or updated, set the academic year

P.hook('hComputeAttributes', function(response, object) {
    if(object.isKindOfTypeAnnotated('hres:annotation:academic-year:apply')) {
        var academicYearRef = expectedAcademicYearRef(object);
        if(academicYearRef) {
            if(!(object.has(academicYearRef, A.AcademicYear))) {
                object.remove(A.AcademicYear);
                object.append(academicYearRef, A.AcademicYear);
            }
        }
    }
});

// ----------------------------------------------------------------------------------------------------------------
// Interface for other plugins to use

P.implementService("hres:academic_year:for_date", forDate);

P.implementService("hres:academic_year:year_info", function(ref) {
    ensureAcademicYears();
    return academicYearsLookup.get(ref);
});

P.implementService("hres:academic_year:all_year_info", function() {
    ensureAcademicYears();
    return academicYears;
});

P.implementService("hres:academic_year:navigation_bar", function(currentYear) {
    var year = currentYear ?
        O.service("hres:academic_year:year_info", currentYear) :
        O.service("hres:academic_year:for_date", new Date());
    return {year:year, deferred:P.template("academic-year-navigation").deferredRender(year)};
});

P.implementService("hres:academic_year:get_object_version", function(object, academicYear) {
    let date = O.serviceMaybe("hres:academic_year:year_info", academicYear);
    let obj = object.ref.loadVersionAtTime(date.end);

    if(obj) { return obj; }
    else if(object.history.length > 0) { return object.history[0]; }
    else { return object; }
});

// ----------------------------------------------------------------------------------------------------------------
// Basic reporting navigation

/*HaploDoc
node: /hres_schema/academic_years/reporting_features
title: Reporting features
--

h2. Reporting features

h3(feature). hres:schema:academic_year_navigation

Where the fact you are using to determine the date is a date, use this feature to enable academic year navigation on a dashboard.

Example:
<pre>dashboard.use("hres:schema:academic_year_navigation", year, "registrationStart")</pre>

h3(feature). hres:schema:academic_year_navigation_for_ref

Where the fact you are using to determine the date is a ref, use this feature to enable academic year navigation on a dashboard.

Example:
<pre>dashboard.use("hres:schema:academic_year_navigation_for_ref", year, "academicYear")</pre>

h3(feature). hres:schema:academic_quarter_navigation

Use this feature on a dashboard to enable quarter navigation where quarters line up with the academic year. \
Quarters are 1, 2, 3, and 4, and should be passed through the url. Q1 is August to October. \
Parameters are currentYear, currentQuarter, fact.

Example:
<pre>dashboard.use("hres:schema:academic_quarter_navigation", [Ref of relevant Academic year], 1, "registrationStart");</pre>

*/

P.reporting.registerReportingFeature("hres:schema:academic_year_navigation", function(dashboard, currentYear, fact) {
    var yearNow = O.service("hres:academic_year:for_date", new Date());
    var year = currentYear ?
        O.service("hres:academic_year:year_info", currentYear) :
        yearNow;
    dashboard.filter(function(select) {
        select.or(function(sq) {
            if(yearNow.ref == year.ref) {
                sq.where(fact, "=", null);
            }
            sq.and(function(ssq) {
                ssq.where(fact, ">=", year.start).
                    where(fact, "<", year.end);
            });
        });
    });
    dashboard.navigationUI(function(dashboard) {
        return P.template("academic-year-navigation").deferredRender(year);
    });
});

P.reporting.registerReportingFeature("hres:schema:academic_quarter_navigation",
    function(dashboard, currentYear, currentQuarter, fact) {
        var year = currentYear ?
            O.service("hres:academic_year:year_info", currentYear) :
            O.service("hres:academic_year:for_date", new Date());
        var startMonth = (currentQuarter-1)*3;
        var endMonth = startMonth+3;
        dashboard.filter(function(select) {
            select.or(function(sq) {
                if(!currentYear) { sq.where(fact, "=", null); }
                sq.and(function(ssq) {
                    ssq.where(fact, ">=", new XDate(year.start).addMonths(startMonth)).
                       where(fact, "<", new XDate(year.start).addMonths(endMonth));
                });
            });
        });

        var previousYear = currentYear, nextYear = currentYear;
        var nextQuarter = currentQuarter+1;
        var previousQuarter = currentQuarter-1;
        if(currentQuarter === 4) {
            nextYear = year.next.ref;
            nextQuarter = 1;
        } else if (currentQuarter === 1) {
            previousYear = year.previous.ref;
            previousQuarter = 4;
        }
        dashboard.navigationUI(function(dashboard) {
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

P.reporting.registerReportingFeature("hres:schema:academic_year_navigation_for_ref", function(dashboard, currentYear, fact) {
    var year = currentYear ?
        O.service("hres:academic_year:year_info", currentYear) :
        O.service("hres:academic_year:for_date", new Date());

    dashboard.filter(function(select) {
        select.or(function(sq) {
            sq.and(function(ssq) {
                ssq.where(fact, "=", year.ref);
            });
        });
    });
    dashboard.navigationUI(function(dashboard) {
        return P.template("academic-year-navigation").deferredRender(year);
    });
});

P.reporting.registerReportingFeature("hres:schema:academic_year_navigation_for_json_columns", function(dashboard, currentYear) {
    var year = currentYear ?
        O.service("hres:academic_year:year_info", currentYear) :
        O.service("hres:academic_year:for_date", new Date());
    dashboard.property("hres:schema:academic_year_navigation_for_json_columns:year", year);
    dashboard.property("std:reporting:json_column:default_value_property", year.ref.toString());
    dashboard.navigationUI(function(dashboard) {
        return P.template("academic-year-navigation").deferredRender(year);
    });
});

// ----------------------------------------------------------------------------------------------------------------
// There must exist at least a few academic years in the future

var ensureAcademicYearsInFutureAvailable = function() {
    var d = new Date();
    for(var i = 0; i <= ENSURE_AT_LEAST_YEARS_IN_FUTURE; ++i) {
        forDate(d);
        d.setFullYear(d.getFullYear()+1);
    }
};

// Check every morning to keep them updated
P.hook('hScheduleDailyEarly', function() {
    ensureAcademicYearsInFutureAvailable();
});

// Handler to check right now (useful when setting up new applications)
P.respond("GET", "/do/hres-schema-admin/ensure-academic-years", [
], function(E) {
    if(!O.currentUser.isMemberOf(Group.Administrators)) { O.stop("Not permitted"); }
    ensureAcademicYearsInFutureAvailable();
    var i = P.locale().text("template");
    E.render({message:i["Done"], pageTitle:i["Ensure academic years"]}, "std:ui:notice");
});
