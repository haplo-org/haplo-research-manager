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

var recalculateDates = function(impl, ref, dates, ignorePreviousState, calculateOnly) {
    var flags = [];
    var inputDates = {};
    _.each(impl.calculationDates, function(name) {
        var calculationDate = dates.date(name).getDatesForCalculations();
        if(calculationDate.min) {
            inputDates[name] = [calculationDate.min, calculationDate.max];
            flags.push("has:"+name);
        }
        if(calculationDate.previousActual) {
            inputDates[name+":previous"] = [calculationDate.previousActual, calculationDate.previousActual];
            flags.push("has:"+name+":previous");
        }
        var previousActuals = calculationDate.previousActuals || [];
        for(var i = 1; i <= previousActuals.length; i++) {
            var flag = "has:"+name+":previous:"+i;
            flags.push(flag); //So we can check how many times this has happened previously
        }
    });
    flags = flags.concat(impl.flags(ref.load(), inputDates));

    var suspensions = P.getSuspensionsForProject(ref);

    // Allow plugins to add dates and flags not stored in workflows or project journal
    O.serviceMaybe("hres_date_calculation:add_input_information", ref, inputDates, flags);

    var operation = calculateOnly ? "compute" : "update";
    var service = ignorePreviousState ?  
        "haplo:date_rule_engine:"+operation+"_dates_ignoring_previous_state" :
        "haplo:date_rule_engine:"+operation+"_dates";

    var outputXDates = O.service(service,
                inputDates,
                impl.ruleSet,
                flags,
                suspensions,
                ref);

    O.serviceMaybe("hres_date_calculation:modify_output_dates", outputXDates);
    var outputDates = {};
    _.each(outputXDates, function(result, name) {
        if(result && result[0]) {
            outputDates[name] = [result[0].toDate(), result[1].toDate()];
        }
    });
    return outputDates;
};

var saveRecalculatedDatesToJournal = function(ref, dates, ignorePreviousState) {
    var impls = [];
    var project = ref.load();
    if(O.serviceImplemented("hres_date_calculation:get_implementations_for_project")) {
        O.service("hres_date_calculation:get_implementations_for_project", project, impls);
    }

    _.each(impls, function(impl) {
        var recalculated = recalculateDates(impl, ref, dates, ignorePreviousState);

        // result = [start, end <,problem string>]
        _.each(impl.calculationDates, function(name) {
            var date = dates.date(name);
            if(date.requiredIsFixed || date.actual) { return; }
            var result = recalculated[name];
            if(result && result[0]) {
                date.setRequiredCalculated(result[0], result[1]);
                // Problem calculating
                if(result.length === 3) {
                    // TODO: Report on the error
                }
            }
        });
    });

    P.saveRecalculatedYearRecurringDates(project, dates);
};

P.implementService("hres:project_journal:dates:request_update", function(ref, dates) {
    saveRecalculatedDatesToJournal(ref, dates);
});

// --------------------------------------------------------------------------
// Admin functionality

P.implementService("hres:project_journal:dates:request_update_ignoring_state", function(ref, dates) {
    saveRecalculatedDatesToJournal(ref, dates, true);
});

P.implementService("hres:project_journal:dates:recalculated_for_project", function(ref, dates, ignorePreviousState) {
    var impls = [];
    var project = ref.load();
    if(O.serviceImplemented("hres_date_calculation:get_implementations_for_project")) {
        O.service("hres_date_calculation:get_implementations_for_project", project, impls);
    }
    
    return _.map(impls, function(impl) {
        return {
            impl: impl,
            dates: recalculateDates(impl, ref, dates, ignorePreviousState, true /*only calculate dates, don't save state*/)
        };
    });
});
