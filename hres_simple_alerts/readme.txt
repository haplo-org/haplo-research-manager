title: Simple alerts
--
The simple alerts plugin provides functionality for sending reminders based on project dates.

h2. Reminders

Alerts are a type of project date. You define them in the same way that any other project date is defined. The name of the alerts must end with @:alert@ or @:alert:n@ where n is an integer, starting from 0.

Most alerts should be set up with an associated standard project date. For example, you may have a date called @example:project-end@, and you want an alert six months before this date. You would set up a project date called @example:project-end:alert@. The calculation rules for this date should be based on @example:project-end@. If you wanted another reminder 3 months before, you should set up another called @example:project-end:alert:0@.

The required max of the associated project date will be the deadline for the alert. The deadline is used to determine which dashboards this alert is displayed in, and also changes the display of the row on the project dates page. 

If you do not want the reminder to appear on the project dates page, they can be defined alone. They should still end with @:alert@ or @:alert:n@, but are otherwise idenitcal.

Project dates where the reminder has been sent, but the deadline is in the future will be highlighted in orange, and will be included on the upcoming deadlines dashboard. Project dates where the reminder as been sent and the deadline is passed will be highlighted in red, and included on the deadlines missed dashboard. 

When registering an alert with an associated project date, @notForDisplay@ should be set to true, to stop it getting its own row in the project dates table.

h3. Notifications

h3(service). hres:simple_alerts:recipients_for_alert

To set the recipient for a specific reminder, implement @hres:simple_alerts:recipients_for_alert:alert-name@. It should return an object with fields @to@ and @cc@. @to@ is required, but @cc@ is optional. They should each be an array of entities.

To set the default recipient for a client, implement @hres:simple_alerts:recipients_for_alert@, returning an object in the same format as the specific version. 

For example:

<pre>language=javascript
var SEND_TO_SUPERVISOR_ONLY = [
    "phddemo_annual_progress_review:apr:finish:alert"
];

_.each(SEND_TO_SUPERVISOR_ONLY, function(value) {
    P.implementService("hres:simple_alerts:recipients_for_alert:"+value, function() {
        return {to: ["supervisor_list"]};
    });
});

P.implementService("hres:simple_alerts:recipients_for_alert", function() {
    return {to: ["researcher"], cc: ["supervisor_list"]};
});
</pre>

h3(service). hres:simple_alerts:additional_render

It is possible to collect an additional render to include in an alert on an alert-by-alert basis. This can be done by calling this service and returning a deferredRender object which will render inline of the outgoing alert email.

For example:

<pre>language=javascript
    // from a client/workflow plugin
    P.implementService("hres:simple_alerts:additional_render:the_name_of_my_alert",
        function(project) {
            return P.template("notification/alert").
                deferredRender({ project: project, text: "Some additional text for this alert." });
        }
    );
</pre>

h3(service). hres:simple_alerts:custom_template_for_notification

To set the custom template for a specific reminder, implement @hres:simple_alerts:custom_template_for_notification:alert-name@ with a project attribute. It should return an object with fields @template@ and @view@. @template@ should be defined as a P.template.

For example:

<pre>language=javascript
    // from a client/workflow plugin
    P.implementService("res:simple_alerts:custom_template_for_notification:the_name_of_my_alert",
        function(project) {
            return {
                template: P.template("notification/alert"),
                view: {
                    attribute1: attribute1.value
                }
        }
    );
</pre>

h3. Config

| **Field** | **Type** | **Default** | **Description** |
| @sendReminders@ | @bool@ | true | Whether email notifications should be sent for this client |
| @deploymentDate@ | @date@ | 2018/01/01 | The go live date for this client (or alerts on this client). Alerts before this date will be shown greyed out |
| @noReminderEmail@ | list | [] | List of project date name strings to not send reminder emails for. |
| @noWarning@ | list | [] | List of project date name strings to not show warnings for (e.g. the traffic lights at the project date's page and entries on the dashboards below). |

h2. Reporting

@hres_simple_alerts@ provides a plugin feature for creating dashboards showing missed and upcoming deadlines. 

Use the feature @hres:simple_alerts_reporting@, and set up using @P.simpleAlertsReporting(spec)@

| **Field** | **Description** |
| @missedUrl@ | The URL for the missed deadlines dashboard |
| @upcomingUrl@ | The URL for the upcoming deadlines dashboard |
| @collectionName@ | The name of the collection for this dashboard (e.g. @"doctoral_researchers"@) |
| @collectionDisplayName@ | The name of the collection object, suitable for display in column header (e.g. @"Researcher"@) |
| @canViewDashboard@ | An action to enforce permission for this dashboard |
| @getProject@ | A function that takes the collection object (e.g. a doctoral reseracher) and returns the associated project |

h3. Example set up

<pre>language=javascript
var missedDeadlineUrl = "/do/phd-alerts-reporting/missed-deadlines";
var upcomingDeadlineUrl = "/do/phd-alerts-reporting/upcoming-deadlines";

var spec = {
    collectionName: "doctoral_researchers",
    collectionDisplayName: "Doctoral researcher", 
    getProject: function(object) {
        var projects = O.query().link(T.DoctoralResearchProject, A.Type).link(object.ref, A.Researcher).limit(1).execute();
        return projects.length ? projects[0] : undefined;
    },
    upcomingUrl: upcomingDeadlineUrl,
    missedUrl: missedDeadlineUrl,
    canViewDashboard: CanViewAlertsDashboards
};
</pre>

The facts created for the collection are:

| **Fact** | **Description** |
| @alertWarningType@ | Either @amber@ or @red@. @amber@ if the deadline is in the future, but a reminder has been sent. @red@ if both reminder and deadline are in the past |
| @alertEarliestDeadline@ | When is the earliest deadline for an action that has not been taken |
| @alertEarliestDeadlineName@ | Name of the earliest deadline |