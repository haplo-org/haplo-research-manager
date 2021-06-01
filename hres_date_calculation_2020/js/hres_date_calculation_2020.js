/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2021            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


let requestUpdate = function(ref, dates) {
    let rulesetHistorySetNames = [];
    let project = ref.load();
    if(!project) { return; }
    // TODO: name kept the same for compatibility with previous engine naming - change?
    if(O.serviceImplemented("hres_date_calculation:get_implementations_for_project")) {
        O.service("hres_date_calculation:get_implementations_for_project", project, rulesetHistorySetNames);
    }
    let log = getProjectLog(project, dates);
    let finalWhen;
    if(log.length) {
        finalWhen = log[log.length -1].when;
    } 
    _.each(rulesetHistorySetNames, (rulesetHistorySetName) => {
        let recalculated = O.service("haplo:date_rule_engine_2:compute_dates", rulesetHistorySetName, log, finalWhen || new XDate(), ref);
        let normalisedDates = {};
        _.each(recalculated.dates, (result, name) => {
            normalisedDates[name.replace("::Activity end", "")] = result;
        });
        _.each(normalisedDates, (result, name) => {
            if(!result || name.endsWith(":earliest") || name.endsWith("::Activity start") || name.match(/::.*:/)) { return; }
            let xdate;
            if(result) {
                xdate = result.start ? result.start.xdate : result.xdate;
            }
            let date = dates.date(name);
            if(result.repeating) {
                let index = date.previousActuals.length;
                let newResult = result.getDate(index);
                if(newResult) {
                    xdate = newResult.xdate;
                }
            }
            if(date.requiredIsFixed || date.actual) { return; }
            O.serviceMaybe("hres_date_calculation_2020:modify_output_dates", name, normalisedDates[name].xdate, dates, project);
            if(normalisedDates[name+":earliest"] && normalisedDates[name+":earliest"].xdate) {
                O.serviceMaybe("hres_date_calculation_2020:modify_output_dates", name+":earliest", normalisedDates[name+":earliest"].xdate, dates, project);
                // there's a min and a max date
                date.setRequiredCalculated(
                    new XDate(normalisedDates[name+":earliest"].xdate).toDate(),
                    new XDate(xdate).toDate()
                );
            } else if(xdate) {
                date.setRequiredCalculated(new XDate(xdate).toDate());
            }
        });
        // console.log(JSON.stringify(recalculated, undefined, 2));
    });
};

P.implementService("hres:project_journal:dates:request_update", requestUpdate);

P.implementService("hres:project_journal:dates:request_update_ignoring_state", requestUpdate);

var jsDateIsEqual = function(date1, date2) {
    return date1.getTime() === date2.getTime();
};

var getProjectLog = function(project, dates) {
    let log = [];
    // 1. Project dates - get all of them an use the update date for the log.when
    _.each(dates.list, (date) => {
        getLogEntryFromProjectDate(log, date);
    });
    // 2. Flags - get initial flags (ie. what the project _started_ as)
    getInitialFlagsForProject(log, project);
    // 3. Get transitions, from either change requests plugin, or imported events in the project journal
    O.serviceMaybe("hres_date_calculation:collect_activity_transitions", project, log);
    // 4. Get suspensions, using existing service I think
    let suspensions = [];
    O.serviceMaybe("hres_date_calculation:collect_suspensions", project.ref, suspensions);
    let compactSuspensions = [];
    _.chain(suspensions).sortBy((s) => { return s[0]; }).each((s) => {
        let startLength = compactSuspensions.length;
        // Does last suspension overlap with this one? if so, extend it, otherwise add new suspension
        if(startLength > 0 && compactSuspensions[startLength-1][1] > s[0]) {
            compactSuspensions[startLength-1][1] = s[1];
        } else {
            compactSuspensions.push(s);
        }
    }).value();
    _.each(compactSuspensions, (s) => {
        // Applies to all activities
        // PERM TODO: enable single activity suspensions if they're needed (the engine has the API for it)
        log.push({
            type: "unscheduledStop",
            when: new XDate(s[0])     // suspension start date
        });
        log.push({
            type: "unscheduledStart",
            when: new XDate(s[1])     // suspension end date
        });
    });
    return _.sortBy(log, (entry) => {
        return entry.when;
    });
};

var getInitialFlagsForProject = function(log, project) {
    let initialObjectVersion;
    // StoreObject versions are 1-indexed
    if(O.serviceImplemented("hres_date_calculation_2020:get_initial_project_version")) {
        initialObjectVersion = O.service("hres_date_calculation_2020:get_initial_project_version", project);
    } else {
        if(project.version > 1) {
            initialObjectVersion = project.history[0];
        } else {
            initialObjectVersion = project;
        }
    }
    // flags will be first "Added" then "removed" - so any removes are applied at the end to ensure
    // they're not removed before they're added
    let toAdd = [];
    let toRemove = [];
    const collected = {
        add(flag) { toAdd.push(flag); },
        remove(flag) { toRemove.push(flag); }
    };
    O.serviceMaybe("hres_date_calculation:collect_project_initial_flags", initialObjectVersion, collected);
    const initialFlags = _.difference(toAdd, toRemove);
    log.unshift({
        type: "flags",
        when: new XDate(0),
        flags: initialFlags
    });
};

var getLogEntryFromProjectDate = function(log, date) {
    let calculationDates = date.getDatesForCalculations();
    // Put them at the start of the log - their location shouldn't matter, and the Project Journal
    // doesn't keep lastModified information
    let when = new XDate(2);
    if(calculationDates.min) {
        log.unshift({
            type: "setDate",
            name: date.name,
            when: when,
            date: new XDate(calculationDates.max)
        });
        log.unshift({
            type: "setDate",
            name: date.name+":earliest",
            when: when,
            date: new XDate(calculationDates.min)
        });
        if(calculationDates.requiredMax) {
            log.unshift({
                type: "setDate",
                name: date.name+":deadline",
                when: when,
                date: new XDate(calculationDates.requiredMax)
            });
        }
        if(calculationDates.requiredMin) {
            log.unshift({
                type: "setDate",
                name: date.name+":deadline:earliest",
                when: when,
                date: new XDate(calculationDates.requiredMin)
            });
        }
    }
};