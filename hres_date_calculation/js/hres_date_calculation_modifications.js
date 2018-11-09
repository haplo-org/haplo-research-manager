/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2018            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */

// --------------------------------------------------------------------------
// Modifications

/*HaploDoc
node: /hres_date_calculation/modifications
title: Modifications
sort: 1
--

h3(service). "hres_date_calculation:collect_suspensions"
function(project, suspensions)

Allows other plugins to push suspended periods for calculating period end rules (mostly used for suspensions and extensions to projects).

@suspensions@ is an array of suspended period. Implementations of this service should push any new suspensions to this array.

The format of each suspension is an array of length two. The first entry should be the start date, and the second should be the end of the period. Any suspensions with end date not strictly after start date will be ignored.


h3(service). "hres_date_calculation:collect_input_modifications"
function(project, modifications)

DEPRECATED - where possible, use @"hres_date_calculation:collect_suspensions"@ instead

Allows other plugins to push structured modifications to input dates.

@modifications@ are things that affect the project dates that cannot be expressed in rules defined in code. For example Suspensions and Extensions to projects. As these can have arbitrary length and start date they cannot be defined in a @ruleSet@.

@modification@ data structure:

<pre>
    {
        extendBy: [length, unit],   // length is a number, unit is a string eg. "month", "year"
        effectiveFrom: date         // date the extension applies from. eg. Suspension approval date
    }
</pre>

h3(service). "hres_date_calculation:modify_output_dates"
function(outputDates)

Allows other plugins to make changes to dates after all calculations have been applied. Do not use if you can possible avoid it.

@outputDates@ is an object. Keys are the names of the dates. Values are arrays with start and end dates as XDates.

*/

// TODO: Add more extension units when required
var DATE_FUNCTION = {
    "days": "addDays",
    "months": "addMonths",
    "years": "addYears"
};

P.getSuspensionsForProject = function(project) {
    let modifications = [];
    O.serviceMaybe("hres_date_calculation:collect_input_modifications", project, modifications);
    let suspensions = _.map(modifications, (mod) => {
        if("extendBy" in mod) {
            let fn = DATE_FUNCTION[mod.extendBy[1]];
            let endDate = new XDate(mod.effectiveFrom).clone();
            endDate[fn](mod.extendBy[0]);
            return [mod.effectiveFrom, endDate];
        }
        return undefined;
    });
    O.serviceMaybe("hres_date_calculation:collect_suspensions", project, suspensions);
    return _.filter(suspensions, (s) => !!s);
};

P.modifyOutputDates = function(project, inputDates) {
    let modifications = P.gatherModifications(project);
    let outputDates = P.applyModifications(inputDates, modifications);
    
    return outputDates;
};