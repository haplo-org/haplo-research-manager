/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


var datesTableDeferredRender = function(projectRef, options) {
    var projectDates = O.service("hres:project_journal:dates", projectRef);
    var display = [];
    var lastPrefix;
    projectDates.datesForDisplay().forEach(function(date, i, dates) {
        if(("dates" in options) && options.dates.indexOf(date.name) === -1) { return; }
        var d = {
            date: date,
            displayName: date.displayName,
            hasScheduledActual: !!(date.scheduled || date.actual)
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
        editable: !!options.isEditable
    });
};

P.implementService("hres:project_journal:dates:ui:render_full_list", function(projectRef, options) {
    return datesTableDeferredRender(projectRef, options);
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
    return datesTableDeferredRender(projectRef, _.extend({}, options, {dates:dates}));
});


// --------------------------------------------------------------------------

P.implementService("hres:project_journal:get_implementation:PDATE", function() {
    return {
        kindDisplayName: "Project Date",
        renderSmall: function(row) {
            var defn = P.dateDefinitionsKind[row.kind];
            if(defn) {
                return P.template("journal/project-date").deferredRender({
                    defn: defn
                });
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
        updateDate: function(document, date) {
            date.setRequiredFixed(new Date(document.min), new Date(document.max));
        }
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
            var mostRelevantDate = date.actual || date.scheduled;
            return {
                date: dateForForm(mostRelevantDate)
            };
        },
        updateDate: function(document, date) {
            var enteredDate = new XDate(document.date).clearTime();
            var today = new XDate().clearTime();
            // Dates entered as in the future are scheduled dates, otherwise they're actuals
            var setFn = (enteredDate.diffDays(today) <=  0) ? "setScheduled" : "setActual";
            date[setFn](new Date(document.date));
        }
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
        var options = prevent.url ? [{action:prevent.url, label:prevent.label || "More information..."}] : [];
        E.render({
            pageTitle: date.displayName,
            text: prevent.message,
            backLink: backLink,
            options: options
        }, "std:ui:confirm");
    } else {

        var extras = variation.extras(project, date, E);
        var document = variation.makeDocument(date);
        var form = variation.form.handle(document, E.request);
        if(form.complete && (!extras || extras.formInstance.complete)) {
            variation.updateDate(form.document, date);
            if(extras) { extras.commit(); }
            list.requestUpdatesThenCommitIfChanged({
                action: "user-edit",
                name: name,
                kind: variationName
            });
            return E.response.redirect(backLink);
        }

        E.render({
            backLink: backLink,
            project: project,
            error: (E.request.method === "POST"),
            date: date,
            form: form,
            extras: extras
        }, "dates/edit-date");
    }
});
