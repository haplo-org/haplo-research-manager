/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


/*HaploDoc
node: /hres_project_journal/dates/dates_ui
sort: 10
--

h2. Services

h3(service). "hres:project_journal:dates:ui:should_grey_out_dates"

Implement in client namespace, takes project ref and date object, sets opacity to 0.3 in project dates table for specified dates, must return a boolean. \

 e.g. To grey out any future dates for a student's project status (relative to when that status was applied):

<pre>language=javascript
P.implementService("hres:project_journal:dates:ui:should_grey_out_dates", function(projectRef, date) {
    let hasCertainStatus = projectRef.load().has(O.behaviourRef("client:list:doctoral-research-project-status:certain-status"), A. DoctoralResearchProjectStatus);
    date = date.actual || date.scheduled || date.requiredMin || date.requiredMax;
    let journalQuery = O.service("hres:project_journal:select", { project: projectRef, kind: "certain_status_effective_from" });
    let dateOccursAfterStatusApplied;
    if(journalQuery.length > 0) {
        dateOccursAfterStatusApplied = date ? new XDate(date).getTime() > new XDate(journalQuery[0].datetime).getTime() : false;
    }
    return hasCertainStatus && dateOccursAfterStatusApplied;
});
</pre>

*/

var datesTableDeferredRender = P.datesTableDeferredRender = function(projectRef, options, context) {
    var projectDates = ("datesList" in options) ?
        options.datesList :
        O.service("hres:project_journal:dates", projectRef);
    var project = projectRef.load();
    var isPastProject = O.serviceMaybe("hres:project_journal:is_project_past", project);
    var deployment = O.serviceMaybe("hres:project_journal:dates:get_alerts_deployment_date");
    var display = [];
    var lastPrefix;
    var displayAlerts = false;
    let displayAdminOptions = !!((O.currentUser.allowed(P.CanForceDatesUpdate) || O.currentUser.allowed(P.CanSeeProjectDatesHistory)) && options.displayAdminOptions);
    let isSuperUser = O.currentUser.isSuperUser;
    projectDates.datesForDisplay().forEach(function(date, i, dates) {
        if(date.alerts && (date.requiredMax || date.scheduled)) {
            displayAlerts = true;
            var now = new XDate();
            var red;
            var amber;
            var beforeDeployment = 0;
            var deadline = new XDate(date.requiredMax || date.scheduled);
            _.each(date.alerts, function(alert) {
                var alertStart = new XDate(alert.requiredMin);
                if(!deployment || deployment.diffDays(alertStart) < 0) {
                    ++beforeDeployment;
                }
                if(now.diffDays(alertStart) <= 0) {
                    amber = "amber";
                }
                if(now.diffDays(deadline) <= 0) {
                    red = "red";
                }
            });
            date.warning = red || amber;
            if(isPastProject || date.actual || O.serviceMaybe("hres:project_journal:dates:should_hide_deadline_warning", date.name)) {
                date.warning = "";
            }
            if(beforeDeployment === date.alerts.length) {
                if(deployment.diffDays(deadline) >= 0) {
                    if(date.warning === "amber") {
                        date.warning = "amberBefore";
                    } else if(date.warning === "red") {
                        date.warning = "redBefore";
                    } else {
                        date.warning = "beforeDeployment";
                    }
                } else {
                    date.warning = "beforeDeployment";
                }
            }
        } else if(date.alerts && date.actual) {
            // Can't assume alerts are not calculated from an actual date e.g. workflow actuals can be imported.
            date.alerts = [];
        }
        if((!date.warning||date.warning === "beforeDeployment"||date.warning === "amberBefore"||date.warning === "redBefore") && ("dates" in options) && options.dates.indexOf(date.name) === -1) { return; }
        var d = {
            date: date,
            displayName: date.displayName,
            hasScheduledActual: !!(date.scheduled || date.actual),
            displayRequiredIsFixed: !!(date.requiredIsFixed && displayAdminOptions),
            displayGreyedDate: O.serviceMaybe("hres:project_journal:dates:ui:should_grey_out_dates", projectRef, date),
            filteredPreviousActuals: _.filter(date.previousActuals, (value, index) => index !== date.actualIndex)
        };
        var split = date.displayName.split(',');
        if(split.length > 1) {
            if(lastPrefix === split[0]) {
                d.displayName = "..."+split[1];
            }
            lastPrefix = split[0];
        } else {
            lastPrefix = undefined;
        }
        display.push(d);
    });
    return P.template("dates/dates-display").deferredRender({
        project: projectRef,
        display: display,
        hideDeadlines: options.hideDeadlines,
        editable: !!options.isEditable,
        displayAdminOptions: displayAdminOptions,
        canForceUpdate: O.currentUser.allowed(P.CanManuallyForceDatesUpdate),
        displayAlerts: displayAlerts,
        context: context, 
        isSuperUser: isSuperUser
    });
};

P.implementService("hres:project_journal:dates:ui:render_full_list", function(projectRef, options) {
    return datesTableDeferredRender(projectRef, options, 'full');
});

P.implementService("hres:project_journal:dates:ui:render_overview", function(usage, projectRef, options) {
    var services = [
        "hres:project_journal:dates:discover:key_dates_for_project",
        "hres:project_journal:dates:discover:key_dates_for_project:"+usage
    ];
    var dates = [];
    var remove = [];
    var configure = {
        add: function(name) {
            dates.push(name);
            return this;    // For chaining
        },
        remove: function(name) {
            remove.push(name);
            return this;    // For chaining
        }
    };
    services.forEach(function(s) { O.serviceMaybe(s, configure, projectRef); });
    dates = _.uniq(dates); remove = _.uniq(remove);
    dates = _.filter(dates, function(d) { return (remove.indexOf(d) === -1); });
    return datesTableDeferredRender(projectRef, _.extend({}, options, {dates:dates}), "overview");
});


// --------------------------------------------------------------------------

P.implementService("hres:project_journal:get_implementation:PDATE", function() {
    return {
        kindDisplayName: "Project Date",
        renderSmall: function(row) {
            var defn = P.dateDefinitionsKind[row.kind];
            if(defn) {
                if(defn.renderTimelineEntryDeferred) {
                    return defn.renderTimelineEntryDeferred(row);
                } else {
                    return P.template("journal/project-date").deferredRender({
                        defn: defn
                    });
                }
            }
        },
        link: function(row) {
            var defn = P.dateDefinitionsKind[row.kind];
            if(defn && defn.link) {
                return defn.link(row);
            }
        }
    };
});

// --------------------------------------------------------------------------

var dateForForm = function(date) {
    return date ? new XDate(date).toString("yyyy-MM-dd") : undefined;
};

// --------------------------------------------------------------------------

var editVariations = {
    "required": {
        actionName: "editRequired",
        form: P.form("edit-required", "form/edit-required.json"),
        extras: function() {},
        makeDocument: function(date) {
            return {
                min: dateForForm(date.requiredMin),
                max: date.requiredIsInstantaneous ? undefined : dateForForm(date.requiredMax)
            };
        },
        prepareFormInstance: function() {},
        // console.log(new Date(null)) prints null but on the same time 
        // new Date(null) === null is false and that breaks everything
        updateDate: function(document, date) {
            var min = !!document.min ? new Date(document.min) : null;
            var max = !!document.max ? new Date(document.max) : null;
            date.setRequiredFixed(min, max);
        },
        clearDate: function(date) { date.clearRequired(); }
    },
    "scheduled-actual": {
        actionName: "editScheduledActual",
        form: P.form("edit-scheduled-actual", "form/edit-scheduled-actual.json"),
        extras: function(project, date, E) {
            // Extra form & data for scheduled?
            var document = O.service("hres:project_journal:dates:scheduled_data:get", project.ref, date.name) || {};
            var scheduledExtraFormInstance =  O.serviceMaybe("hres:project_journal:dates:get_form_instance_for_scheduled_date_extra_data:"+date.name, project, document);
            if(!scheduledExtraFormInstance) { return; }
            scheduledExtraFormInstance.update(E.request);
            return {
                formInstance: scheduledExtraFormInstance,
                commit: function() {
                    O.service("hres:project_journal:dates:scheduled_data:set", project.ref, date.name, scheduledExtraFormInstance.document);
                }
            };
        },
        makeDocument: function(date) {
            var mostRelevantSavedDate = date.actual || date.scheduled;
            return {
                date: dateForForm(mostRelevantSavedDate)
            };
        },
        prepareFormInstance: function(formInstance, date) {
            var latestPreviousIndex = date.previousActuals.length-(!date.actual ? 1 : 2);
            var mostRelevantSavedDate = date.actual || date.scheduled;
            var externalData = {
                latestPrevious: (date.previousActuals.length > latestPreviousIndex) ? date.previousActuals[latestPreviousIndex] : undefined
            };
            if(mostRelevantSavedDate) {
                externalData.mostRelevantSavedDate = mostRelevantSavedDate;
            }
            formInstance.externalData(externalData);
        },
        updateDate: function(document, date) {
            if(document.date) {
                var enteredDate = new XDate(document.date).clearTime();
                var today = new XDate().clearTime();
                // Dates entered as in the future are scheduled dates, otherwise they're actuals
                if(enteredDate.diffDays(today) <= 0) { 
                    // When date is in the future, it implicitly means the 'actual' didn't actually happen
                    date.clearActual();
                    date.setScheduled(new Date(document.date));
                } else {
                    date.setActual(new Date(document.date));
                }
            }
        },
        clearDate: function(date) {
            date.clearActual();
            date.clearScheduled();
        }
    },
    "previous-actual": {
        actionName: "editPreviousActual",
        form: P.form("edit-previous-actual", "form/edit-previous-actual.json"),
        extras: function() {},
        makeDocument: function() {
            return {};
        },
        prepareFormInstance: function(formInstance, date) {
            // TODO: use repeating section when std:validation:compare_to_date fails and shows the error message
            // instead of clearing the document.
            formInstance.externalData({
                oldestPrevious: (1 > date.previousActuals.length ? date.actual : date.previousActuals[0])
            });
        },
        updateDate: function(document, date) {
            var newPrevious = _.map([document.newPrevious], function(date) {
                return new Date(date);
            });
            date.unshiftActuals.apply(date, newPrevious);
        },
        clearDate: function() {}
    }
};

P.respond("GET,POST", "/do/hres-project-journal/edit-date", [
    {pathElement:0, as:"string", validate:function(d) { return d in editVariations; }},
    {pathElement:1, as:"string", validate:P.validateDateName},
    {pathElement:2, as:"object"}
], function(E, variationName, encodedName, project) {
    var name = decodeURIComponent(encodedName);
    var defn = P.dateDefinition(name);
    var variation = editVariations[variationName];
    O.action(P.getEditActionApiCode(variation.actionName, name)).enforce();

    var backLink = O.serviceMaybe("hres:project_journal:dates:get_post_date_edit_page_for_project", project) || project.url();

    var list = O.service("hres:project_journal:dates", project.ref);
    var date = list.date(name);

    var prevent = O.serviceMaybe("hres:project_journal:dates:prevent_date_edit:"+name, variationName, project);
    if(prevent) {
        var i = P.locale().text("template");
        var options = prevent.url ? [{action:prevent.url, label:prevent.label || i["More information..."]}] : [];
        E.render({
            pageTitle: date.displayName,
            additionalUI: prevent.additionalUI,
            text: prevent.message,
            backLink: backLink,
            options: options
        }, "dates/dates-prevent-edit");
    } else {

        var extras = variation.extras(project, date, E);
        var document = variation.makeDocument(date);
        var form = variation.form.instance(document);
        variation.prepareFormInstance(form, date);
        form.update(E.request);
        if(form.complete && (!extras || extras.formInstance.complete)) {
            if(E.request.parameters.clear) {
                variation.clearDate(date);
                list.requestUpdatesThenCommitIfChanged({
                    action: "ADMIN-FORCE-CLEAR-DATE",
                    name: name,
                    kind: variationName
                });
                return E.response.redirect(backLink);
            } else {
                variation.updateDate(form.document, date);
                if(extras) { extras.commit(); }
                list.requestUpdatesThenCommitIfChanged({
                    action: "user-edit",
                    name: name,
                    kind: variationName
                });
                return E.response.redirect(backLink);
            }
        }

        E.render({
            backLink: backLink,
            project: project,
            error: (E.request.method === "POST"),
            date: date,
            form: form,
            extras: extras,
            action: variation.actionName,
            canClear: O.currentUser.allowed(P.CanForceDatesUpdate)
        }, "dates/edit-date");
    }
});
