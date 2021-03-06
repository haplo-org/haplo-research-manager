/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2019            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


/*
    Alerts are project dates. They are related to an existing project date. 
    The first alerts for a project date should be given the name of the existing projecct date suffixed by ":alert"
    Subsequent alerts should have the suffixes :alert:0", ":alert:1", ":alert:2" and so on 

    Alerts config:
        sendReminders       - send email notifications
        deploymentDate      - the date after which reminders should start being sent
*/

var ALERTS_CONFIG = _.extend({
    sendReminders: true,
    deploymentDate: "2018-01-01",
    noReminderEmail: [],
    noWarning: []
}, O.application.config["hres:simple_alerts:config"] || {});

var standaloneEntities = P.hresCombinedApplicationStandaloneEntities({    
    project: function(context) {
        return (context === "list") ? this.object_refList : this.object_ref;
    }
});

P.implementService("hres:project_journal:get_implementation:hres_simple_alerts", function(row) {
    return {
        kindDisplayName: "Reminder",
        renderSmall: function(row) {
            return P.template("journal/reminder").deferredRender(row);
        }
    };
});

var sendReminders = function(reminders) {
    _.each(reminders, function(reminder) {
        if(!reminder.deadline) { return; }
        if(-1 !== ALERTS_CONFIG.noReminderEmail.indexOf(reminder.deadlineName)) {
            return;
        }
        var recipients = O.serviceMaybe("hres:simple_alerts:recipients_for_alert:"+reminder.date.name);
        if(!recipients) {
            recipients = O.serviceMaybe("hres:simple_alerts:recipients_for_alert");
        }
        var project = reminder.project;
        // Alerts shouldn't be sent for past projects
        let indicators = [];
        O.serviceMaybe("hres:schema:collect_indicators_project_is_current", project, indicators);
        let projectHasAnyIndicatorThatCurrent = _.any(indicators, (i) => i.isCurrent);
        let projectHasOverrideAndIsPast = O.serviceMaybe("hres:schema:override_project_is_past", project);
        if(!projectHasAnyIndicatorThatCurrent || projectHasOverrideAndIsPast) { return; }
        var entities = standaloneEntities.constructEntitiesObject(project.ref);
        var diffDays = new XDate().clearTime().diffDays(new XDate(reminder.deadline).clearTime());
        if(diffDays === 0) {
            reminder.description = "Deadline today";
        } else if (diffDays > 0) {
            reminder.description = "Deadline in " + diffDays + (diffDays === 1 ? " day" : " days");
        } else {
            reminder.description = "Missed deadline by " + (-diffDays) + (diffDays === -1 ? " day" : " days");
        }
        reminder.additionalRender = O.serviceMaybe("hres:simple_alerts:additional_render:"+
            reminder.date.name, project);
        if(recipients) { 
            var to = recipients.to;
            var cc = recipients.cc;
            var customTemplate = O.serviceMaybe("hres:simple_alerts:custom_template_for_notification:"+reminder.date.name, project);
            var specification = {
                template:  customTemplate ? customTemplate.template : P.template("email/notification"),
                to: to,
                cc: cc,
                view: customTemplate ? customTemplate.view : {
                    reminder: reminder,
                    alertsUrl: project.url(true),
                    project: project
                }
            };
            O.service("std:workflow_emails:send_email", specification, entities);
            O.service("hres:project_journal:save", {
                project: project.ref,
                datetime: new XDate().toDate(),
                kind: "reminder",
                implementation: "hres_simple_alerts",
                    data: {
                        title: reminder.deadline ? reminder.deadlineDisplayName : reminder.date.displayName,
                        date: reminder.deadline ? new XDate(reminder.deadline).toString("dd MMM yyyy") : undefined
                    }
            });
        }
    });
};

P.backgroundCallback("send_reminders", function(data) {
    var reminders = O.serviceMaybe("hres:project_journal:dates:get_alerts_for_today");
    sendReminders(_.flatten(reminders));
});

P.hook("hScheduleDailyEarly", function() {
    if(!ALERTS_CONFIG.sendReminders) { return; }
    O.background.run("hres_simple_alerts:send_reminders", {});    
});

var CanForceDatesUpdate = O.action("hres:project_journal:force_manual_dates_recalculation");

var dateForm = P.form("select-date", "form/select_date.json");

P.backgroundCallback("send_reminders_for_date", function(data) {
    var date = new XDate(data.date);
    var reminders = O.serviceMaybe("hres:project_journal:dates:get_alerts_for_date", date);
    sendReminders(_.flatten(reminders));
});

P.respond("GET,POST", "/do/hres-simple-alerts/send-alerts-for-date", [
    {parameter:"sending", as:"int", optional:true}
], function(E, sending) {
    CanForceDatesUpdate.enforce();
    var document = {};
    var form = dateForm.handle(document, E.request);
    if(form.complete) {
        O.background.run("hres_simple_alerts:send_reminders_for_date", document);
        return E.response.redirect("/do/hres-simple-alerts/send-alerts-for-date?sending=1");
    }
    E.render({
        sending: !!sending,
        form: form
    });
});

P.implementService("hres_project_journal:gather_alerts_admin_links", function(links) {
    links.push({ url: "/do/hres-simple-alerts/send-alerts-for-date", label:"Send alerts for a specific date"});
});

P.implementService("hres:project_journal:dates:get_alerts_deployment_date", function() {
    return new XDate(ALERTS_CONFIG.deploymentDate);
});

var shouldHideDeadlineWarning = function(deadlineName) {
    return -1 !== ALERTS_CONFIG.noWarning.indexOf(deadlineName);
};

P.implementService("hres:project_journal:dates:should_hide_deadline_warning", shouldHideDeadlineWarning);

var makeDeadlineFromAlert = function(alert) {
    return {
        date: new XDate(alert.deadline),
        name: alert.deadlineDisplayName || alert.date.displayName
    };
};

P.getProjectReminderWarning = function(projectRef) {
    var deadlineShowDate = new XDate().clearTime();
    var alerts = O.service("hres:project_journal:dates:get_past_alerts_for_project", projectRef);
    var project = O.ref(projectRef).load();
    var isPastProject = O.serviceMaybe("hres:project_journal:is_project_past", project);
    var warning = {};

    if(!alerts.length || isPastProject) {
        return warning;
    }

    var sortedAlerts = _.chain(alerts).
    filter(function(alert) { // Paranoia.
        return !!alert.deadline;
    }).
    reject(function(alert) {
        return shouldHideDeadlineWarning(alert.deadlineName);
    }).
    sortBy(function(alert) {
        return new XDate(alert.deadline);
    }).
    value();

    if(sortedAlerts.length) {
        var earliestDeadline = makeDeadlineFromAlert(sortedAlerts[0]);
        _.extend(warning, earliestDeadline);
        if(earliestDeadline.date.diffDays(deadlineShowDate) >= 0) {
            warning.level = "red";
        } else {
            warning.level = "amber";
        }
    }

    return warning;
};

P.implementService("hres:simple_alerts:get_project_dates_indicator", function(projectRef) {
    var warning = P.getProjectReminderWarning(projectRef);
    switch(warning.level) {
        case "amber": 
            return "secondary";
        case "red":
            return "terminal";
        default:
            return;
    }
});

P.implementService("haplo:qa-audit:identify-issues", function(audit) {
    var services = audit.getInformation("services");
    var alertDefinitionsSorted = audit.getInformation("alertDateDefinitionsSorted");
    if(!("hres:simple_alerts:recipients_for_alert" in services)) {
        var alertDefsWithoutRecipients = _.filter(alertDefinitionsSorted, function(def) {
            return !("hres:simple_alerts:recipients_for_alert:"+def.name in services);
        });
        _.each(alertDefsWithoutRecipients, function(def) {
            audit.issue(
                "hres-simple-alerts-alert-missing-recipients/"+def.name,
                "Reminder email for "+(def.deadlineDisplayName || def.displayName)+" is missing recipients",
                "Check that the alert sends reminder emails. You can implement the\n"+
                "hres:simple_alerts:recipients_for_alert\n"+
                "service for default reminder email recipients or specify the recipients for the alert"+
                " by implementing the\n"+
                "hres:simple_alerts:recipients_for_alert:"+def.name+"\n"+
                "service."
            );
        });
    }
});
