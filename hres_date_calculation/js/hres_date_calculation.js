/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */

/*
*  If multiple rulesets apply last wins. They should be independent anyway by design, as otherwise they'd be 
*       one ruleset conceptually
*  If a date has a previousActual then name+":previous" uses that as an input, and "has"+name+"previous" is set
*       as an input flag
*  The engine creates name+":previous" input dates for all dateRules. Inputs can be left undefined, so these
*       can be left unused if not required
*/

// TODO: Add more extension units when required
var DATE_FUNCTION = {
    "months": "addMonths",
    "years": "addYears"
};

var applyModifications = function(dates, modifications) {
    _.each(modifications, function(modification) {
        // TODO: allow more modification types when required
        if(!("extendBy" in modification)) { throw new Error("Date modification must be an extension"); }
        _.each(_.keys(dates), function(name) {
            var d = dates[name];
            // Only extend if the whole date period is before the effectiveFrom date
            dates[name] = _.map(d, function(dd) {
                dd = new XDate(dd);   // Safety, in case inputs are native Dates
                // Lookup for adding time.
                var fn = DATE_FUNCTION[modification.extendBy[1]];
                if(!fn) { throw new Error("Invalid extension unit"); }
                if(d[1] < modification.effectiveFrom) {
                    dd = dd[fn](modification.extendBy[0]);
                }
                return dd;
            });
        });
    });
    return dates;
};

P.implementService("hres:project_journal:dates:request_update", function(ref, dates, reason) {
    var impls = [];
    var project = ref.load();
    if(O.serviceImplemented("hres_date_calculation:get_implementations_for_project")) {
        O.service("hres_date_calculation:get_implementations_for_project", project, impls);
    }

    _.each(impls, function(impl) {
        var flags = impl.flags(project);
        var inputDates = {};
        _.each(impl.calculationDates, function(name) {
            var calculationDate = dates.date(name).getDatesForCalculations();
            if(calculationDate.min) {
                inputDates[name] = [calculationDate.min, calculationDate.max];
            }
            if(calculationDate.previousActual) {
                inputDates[name+":previous"] = [calculationDate.previousActual, calculationDate.previousActual];
                flags.push("has:"+name+":previous");
            }
        });

        // Allow plugins to add dates and flags not stored in workflows or project journal
        O.serviceMaybe("hres_date_calculation:add_input_information", ref, inputDates, flags);

        // For modifying input data. Separate service to ensure all inputs are collected before this gets called
        var modifications = [];
        O.serviceMaybe("hres_date_calculation:collect_input_modifications", ref, modifications);
        inputDates = applyModifications(inputDates, modifications);

        var outputDates = O.service("haplo:date_rule_engine:compute_dates",
                    inputDates,
                    impl.ruleSet,
                    flags,
                    ref);

        // result = [start, end <,problem string>]
        _.each(impl.calculationDates, function(name) {
            var date = dates.date(name);
            if(date.requiredIsFixed || date.actual) { return; }
            var result = outputDates[name];
            if(result) {
                date.setRequiredCalculated(new Date(result[0]), new Date(result[1]));
                // Problem calculating
                if(result.length === 3) {
                    // TODO: Report on the error
                }
            }
        });
    });
});
