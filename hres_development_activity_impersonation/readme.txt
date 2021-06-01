title: Development activity impersonation
module_owner: James
--

Provides quick-impersonation lists of users from key user groups and roles for development.  Implemented as a feature to be used and extended per-activity - by default will display:
* All members of IT Support
* A.Head for each Research Institute
Each activity can provide additional groups and roles for testing.

h4. Usage

Include @"hres_development_activity_impersonation"@ as a dependency in your application.

h4. Extending the tables for an activity

To include the impersonation table on an activity's menu page:

<pre>language=javascript
    P.onLoad = function() {
        if(O.featureImplemented("hres:development_activity_impersonation")) {
            P.use("hres:development_activity_impersonation");
            P.activityImpersonation({
                activityName: "activity-name",
                activityPanel: 9999,
                activityGroups: [
                    Group. ActivityOversight
                ],
                activityRoles: [
                    A. ResearchInstituteActivityAdministrator
                ],
                committeeTypes: [T. ActivityCommitteeSubtype]
            });
        }
    };
</pre>

To extend this for each activity, use @activityGroups@ and @activityRoles@ to provide additional groups and relevant RI attributes to display.

If committees are relevant to the activity, use @committeeTypes@ to provide the subtypes to display.

h3(service). @hres:development-activity-impersonation:ACTIVITY_NAME:...@

Where activity groups/roles are not always included (e.g. added as oversight roles for optional functionality, and so not included in the activity schema plugin), implement services as follows to add them when the optional plugins are installed.  Each service takes a single array argument, push additional groups/roles to the array to include them.

* @gather-optional-groups@
* @gather-optional-roles@
* @gather-optional-committee-roles@

h3(service). "hres:development-activity-impersonation:ACTIVITY_NAME:...@

Client code can modify the displayed groups+roles with a set of services to include/exclude as required.  Service implementation should include the specific activity name, as well as one of the following:

* @override-groups@
* @override-roles@
* @override-committee-roles@

The service will be called with the unmodified list as the only argument.

h3(config). @hres:development-activity-impersonation:max-institute-depth@

By default the RI roles table will only go up to 4 RIs deep (University -> Faculty -> Department -> School), set this config data to override.