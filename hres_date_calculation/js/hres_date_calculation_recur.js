/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2019            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


var LOOKUP_MONTH_STR = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11
};

P.saveRecalculatedYearRecurringDates = function(project, dates) {
    var yearRecurringImpls = [];
    var projectStart = dates.date("project-start").getDatesForCalculations();

    if(!projectStart.min) { return; }

    var yearRecurringImpl = function(impl) { yearRecurringImpls.push(impl); };

    O.serviceMaybe("hres_date_calculation:gather_year_recurring_implementations", project, projectStart.min, yearRecurringImpl);

    var recalculateAlertsForYearRecurringImpl = function(impl, deadline) {
        var alertMonthsBeforeRequiredMax = [];
        if(impl.alertMonthsBeforeRequiredMax) {
            alertMonthsBeforeRequiredMax = impl.alertMonthsBeforeRequiredMax.slice();
        }

        alertMonthsBeforeRequiredMax.
            sort().
            reverse();

        _.each(alertMonthsBeforeRequiredMax, function(months, index) {
            var alertName = impl.name+":alert"+(index > 0 ? ":"+(index-1) : "");
            var alertProjectDate = dates.date(alertName);
            if(alertProjectDate.requiredIsFixed) { return; }
            var alertRequiredMax = deadline.clone().addMonths(-1*months);
            alertProjectDate.setRequiredCalculated(alertRequiredMax.toDate());
        });
    };

    var _suspensions;
    var withinSuspension = function(deadline) {
        if(undefined === _suspensions) {
            _suspensions = [];
            _.chain(P.getSuspensionsForProject(project.ref)).
                map(function(suspension) {
                    var wrongOrder = suspension[1] < suspension[0];
                    return !wrongOrder ? suspension.slice() : [suspension[1], suspension[0]];
                }).
                sortBy(function(suspension) { return suspension[0]; }).
                each(function(suspension) {
                    if(_suspensions.length > 0) {
                        var lastSuspension = _suspensions[_suspensions.length-1];
                        var suspensionsOverlap = lastSuspension[1] > suspension[0];
                        if(suspensionsOverlap) {
                            var extendLastSuspension = lastSuspension[1] < suspension[1];
                            if(extendLastSuspension) {
                                lastSuspension[1] = suspension[1];
                            }
                            return;
                        }
                    }
                    _suspensions.push(suspension);
                });
        }
        return _.some(_suspensions, function(suspension) {
            return (deadline >= suspension[0] && deadline < suspension[1]);
        });
    };

    _.each(yearRecurringImpls, function(impl) {
        if(typeof impl.deployedOn !== "string") {
            throw new Error("must have String 'deployedOn' property for year recurring implementation");
        }
        var implDeployedOn = new XDate(impl.deployedOn);

        if(typeof impl.name !== "string") {
            throw new Error("must have String 'name' property for year recurring implementation");
        }
        var recurringProjectDate = dates.date(impl.name);
        if(recurringProjectDate.actual) {
            return;
        } else if(recurringProjectDate.requiredIsFixed) {
            recalculateAlertsForYearRecurringImpl(impl, new XDate(recurringProjectDate.requiredMin));
            return;
        }

        var beginning = projectStart.min;
        var date = impl.date;
        var month = LOOKUP_MONTH_STR[impl.month];
        if(impl.fromProjectDate) {
            var fromProjectDate = dates.date(impl.fromProjectDate);
            beginning = fromProjectDate.actual || fromProjectDate.requiredMax;
            if(!beginning) { return; }

            if(!date) {
                date = beginning.getDate();
            }
            if(!month) {
                month = beginning.getMonth();
            }
        }
        if(!date) {
            throw new Error("must have Number 'date' if not using String 'fromProjectDate' "+
                "property for year recurring implementation");
        }
        if(typeof month !== "number") {
            throw new Error("must have String 'month' if not using String 'fromProjectDate' "+
                "property for year recurring implementation");
        }


        var initialYear = beginning.getFullYear();
        var initialResultOverflows = new XDate(initialYear, month, date) > beginning;
        if(initialResultOverflows) {
            --initialYear;
        }
        var initialResult = new XDate(initialYear, month, date);
        var maybeMissingImportBeginning = project.creationDate > implDeployedOn ? project.creationDate : implDeployedOn;
        var maybeMissingImport;
        if(project.creationDate > implDeployedOn) {
            maybeMissingImport = (!recurringProjectDate.latestActual && project.creationDate > initialResult);
        } else {
            maybeMissingImport = (!recurringProjectDate.latestActual && beginning < implDeployedOn);
        }
        var year, resultOverflows;
        if(!maybeMissingImport) {
            year =  beginning.getFullYear();
            resultOverflows = new XDate(year, month, date) > beginning;
            if(resultOverflows) {
                --year;
            }
        } else {
            year = maybeMissingImportBeginning.getFullYear();
            resultOverflows = new XDate(year, month, date) > maybeMissingImportBeginning;
            if(resultOverflows) {
                --year;
            }
        }


        var actuals = recurringProjectDate.previousActuals;
        var result;

        var i;
        for(i = 0; i < recurringProjectDate.actualIndex+1; i += 1) {
            result = new XDate(++year, month, date);

            while(withinSuspension(result)) {
                result = new XDate(++year, month, date);
            }

            // Missed deadlines.
            var actual = i < actuals.length ? actuals[i] : undefined;
            if(actual) {
                var diff = actual.getFullYear() - year;

                if(diff > 0) {
                    year += diff;
                    result = new XDate(year, month, date);

                    while(withinSuspension(result)) {
                        result = new XDate(++year, month, date);     
                    }
                }
            }
        }

        var untils = _.chain(impl.untilProjectDates || ["project-end"]).
            map(function(dateName) {
                var untilProjectDate = dates.date(dateName);
                return untilProjectDate.actual || untilProjectDate.requiredMax;
            }).
            compact().value();
        untils.sort();
        var resultAchievable = !_.some(untils, function(until) { return result >= until; });

        if(resultAchievable) {
            recurringProjectDate.setRequiredCalculated(result.toDate());
            recalculateAlertsForYearRecurringImpl(impl, result);
        } else {
            // What if the until date moves back? Do:
            //
            //   * result = last deadline expected if waiting next.
            //   * undo nextOccurence / stop saying waiting for next.
            //
            // somehow? It's non-issue for withdrawn case.
            //
            // Clean-up is going to be ugly and doesn't really work because you
            // can't restore the scheduled data and date as far as I can work
            // out. It's ugly because we want the latest from the date engine but
            // the trigger of 'next' is a workflow handler. Maybe the repeating
            // model of ProjectDates is wrong.
        }
    });    
};
