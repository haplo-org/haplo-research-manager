/* Haplo Research Manager                             http://haplo.org
 * (c) Haplo Services Ltd 2006 - 2016    http://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */

/*

    Using Academic Years
    ====================

    Your objects should include a calendar year in the A.Date attributes.

    When you create or modify an object in your code, update the academic year with:

        O.service("hres:academic_year:update_object", object);

    If users can edit the object themselves, add an annotation to your type definition 
    so that the academic year will be updated. In your requirements.schema file:

        annotation hres:annotation:academic-year:update-on-edit


    Workflows
    =========

    use("hres:schema") to set up entities and tags.

    use("std:dashboard:states", {
        configurationService: "hres:schema:workflow:dashboard:states:configure",
        // rest ofstd:dashboard:states specification
    });


    Permissions
    ===========

    Everyone has permission to read academic year objects, and they're created
    automatically when they're required.

*/


var START_MONTH = 7;    // August in JS zero-based years
var START_DAY = 1;      // first day of August
var END_MONTH = 6;      // July
var END_DAY = 31;       // last day of July, because platform date ranges include last day

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
    O.withoutPermissionEnforcement(function() {
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
            var cutOff = new Date(date.getFullYear(), START_MONTH, START_DAY);
            if(date < cutOff) { academicStartYear--; }
            // Make new object
            var obj = O.object();
            obj.appendType(T.AcademicYear);
            obj.appendTitle(""+academicStartYear+" - "+(academicStartYear+1));
            obj.append(O.datetime(
                new Date(academicStartYear,     START_MONTH, START_DAY),
                new Date(academicStartYear + 1, END_MONTH,   END_DAY),
                O.PRECISION_DAY
            ), A.Date);
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

// Apply or update correct acacdemic year on a mutable object
var updateAcademicYearOn = function(obj) {
    var academicYearRef = expectedAcademicYearRef(obj);
    if(academicYearRef) {
        if(!obj.has(academicYearRef, A.AcademicYear)) {
            obj.remove(A.AcademicYear);
            obj.append(academicYearRef, A.AcademicYear);
            return true;
        }
    }
    return false;
};


// --------------------------------------------------------------------------
// Update academic year when edited

var typesToUpdateAcademicYearOnEdit;
var ensureTypesToUpdateAcademicYearOnEdit = function() {
    if(typesToUpdateAcademicYearOnEdit) { return; }
    typesToUpdateAcademicYearOnEdit = O.refdictHierarchical();
    SCHEMA.getTypesWithAnnotation("hres:annotation:academic-year:update-on-edit").forEach(function(type) {
        typesToUpdateAcademicYearOnEdit.set(type, true);
    });
};

// When objects are edited manually, update the academic year automatically
P.hook('hPostObjectEdit', function(response, object, previous) {
    ensureTypesToUpdateAcademicYearOnEdit();
    var type = object.firstType();
    if(type && typesToUpdateAcademicYearOnEdit.get(type)) {
        var academicYearRef = expectedAcademicYearRef(object);
        if(academicYearRef) {
            if(!(object.has(academicYearRef, A.AcademicYear))) {
                var m = response.replacementObject || (response.replacementObject = object.mutableCopy());
                m.remove(A.AcademicYear);
                m.append(academicYearRef, A.AcademicYear);
            }
        }
    }
});

// ----------------------------------------------------------------------------------------------------------------
// Interface for other plugins to use

P.implementService("hres:academic_year:for_date", forDate);

// Returns true if object has been changed
P.implementService("hres:academic_year:update_object", updateAcademicYearOn);

P.implementService("hres:academic_year:year_info", function(ref) {
    ensureAcademicYears();
    return academicYearsLookup.get(ref);
});

P.implementService("hres:academic_year:all_year_info", function() {
    ensureAcademicYears();
    return academicYears;
});

// ----------------------------------------------------------------------------------------------------------------
// Basic reporting navigation

P.reporting.registerReportingFeature("hres:schema:academic_year_navigation_for_json_columns", function(dashboard, currentYear) {
    var year = currentYear ?
        O.service("hres:academic_year:year_info", currentYear) :
        O.service("hres:academic_year:for_date", new Date());
    dashboard.property("std:reporting:json_column:default_value_property", year.ref.toString());
    dashboard.navigationUI(function(dashboard) {
        return P.template("academic-year-navigation").deferredRender(year);
    });
});
