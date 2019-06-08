/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2019            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


var root = (function() { return this; })();

P.implementService("haplo:qa-audit:identify-issues", function(audit) {

    var labelling = audit.getInformation("descriptive-labelling");
    var roles = audit.getInformation("user-roles");
    var qa = audit.getInformation("qa");
    var plugins = audit.getInformation("plugins");
    var std_workflow = audit.getInformation("std_workflow");
    var activities = audit.getInformation("activities");

    var isActivityOrGlobalLabel = function(l) {
        return (l === "hres:label:identity") || (l === "hres:label:research") || (-1 !== l.indexOf(":label:activity-"));
    };

    _.each(labelling, function(ll, code) {

        // Find root types which don't have an activity label applied
        if(ll.isRootType) {
            var sl = ll.labels || [];
            var x = _.detect(sl, isActivityOrGlobalLabel);
            if(!x) {
                audit.issue(
                    "must-label-with-activity/"+code,
                    code+" ("+ll.name+") must have activity/identity label",
                    "All root types must have an activity label (name includes ':label:activity-') which is used to efficiently provide permissions to roles with oversight over everything within an activity (hres product).\nAlternatively, these types may represent identity of people and organisation which are used across all of hres, in which case they need the hres:label:identity label.\nOr, if the object represents research activity across the entire information system, then hres:label:research should be used.\nLabels are: "+sl.join(', ')+"\nThis issue must never be suppressed, and you must resolve it very carefully."
                );
            }
        }

        // Warn on labelling applied to non-root type
        if(!ll.isRootType && ll.hasLabelling) {
            audit.issue(
                "labelling-on-sub-type/"+code,
                code+" ("+ll.name+") has labelling, but isn't a root type",
                "Applying labelling information to sub-types should only be done if you really need it.\nEvaluate your use case carefully, and if you do need it, suppress this issue.\nLook in the Descriptive object labelling information to find out what labelling is applied -- and check the labelling has an effect anyway."
            );
        }

        // Objects shouldn't be labelled with the researcher
        if(ll.labelWith) {
            if(-1 !== ll.labelWith.indexOf("hres:attribute:researcher")) {
                audit.issue(
                    "labelled-with-researcher/"+code,
                    code+" ("+ll.name+") is labelled with the researcher",
                    "Labelling with a person implicitly gives them permission to read the object, so labelling with the researcher may give permissions you don't intend. Or it will be adding completely unnecessary labels.\nOnly suppress this issue if you are really certain that it needs labelling with the researcher, and ask for advice before doing so."
                );
            }
        }

        // Duplicated labels are a bad sign
        if(ll.labels) {
            if(ll.labels.length !== _.uniq(ll.labels).length) {
                audit.issue(
                    "duplicated-labels/"+code,
                    code+" ("+ll.name+") has duplicate labels",
                    "A static label is applied more than once, suggesting that the permissions are repeated in multiple places."
                );
            }
        }

    });

    _.each(roles.groups, function(gg, code) {

        // Oversight groups should have all permissions defined using activity labels
        var haveOutputTempAdminPermIssue = false;
        if(qa.moduleOversightGroups[code]) {
            var badLabels = [];
            _.each(gg.permissions, function(p) {
                if(!isActivityOrGlobalLabel(p[1])) {
                    if(gg.isAdministrator) {
                        // TODO: Sort out admin permissions
                        if(!haveOutputTempAdminPermIssue) {
                            audit.issue(
                                "temp-admin-permissions-not-handled",
                                "Permissions set by administratorGroup() are not handled properly by audit",
                                "TODO: Sort out how admin group permissions are handled, and fix the audit to check them properly.\nDo not suppress this issue."
                            );
                            haveOutputTempAdminPermIssue = true;
                        }
                    } else {
                        audit.issue(
                            "oversight-group-with-too-specific-permission/"+code+"/"+p[0]+"/"+p[1],
                            "Group "+code+" has too specific permissions",
                            "This group is an oversight group for an activity (hres module). All permissions must generally be expressed in terms of activity labels (or special hres:label:identity label). If you really need to express permissions more precisely, then suppress this with a good reason for doing so."
                        );
                    }
                }
            });
        }

    });

    _.each(roles.roles, function(rr, roleName) {

        // Roles should only be defined on structure or projects
        if(rr.definedByObjects) {
            _.each(rr.definedByObjects, function(r) {
                if(!qa.typesIsStructureOrProject[r.type]) {
                    audit.issue(
                        "role-defined-on-inappropriate-type/"+roleName+"/"+r.type+"/"+r.attribute,
                        "Role "+roleName+" is defined on an inappropriate type of object",
                        "To minimise the number of roles, and therefore make the permissions system work efficiently, the number of roles should be minimised. This means you should only define them on structural (research institute, committees) or project objects. If you define them on workflow objects, you'll just create huge numbers of rules and eventually it'll all go bad.\nReconsider the way your permissions are defined. Perhaps you should be doing it at activity level?\nIf the type of object is actually a valid one to define a role globally, set it in typesIsStructureOrProject in __qa__.json, but think very carefully before you do that.\nIf you have to suppress, justify it really carefully."
                    );
                }
            });
        }
 
    });

    _.each(O.application.plugins, function(pluginName) {

        // Use of hPreObjectDisplay should be carefully audited
        var plugin  = root[pluginName];
        if(plugin && plugin.hPreObjectDisplay) {
            audit.issue(
                "use-of-hPreObjectDisplay/"+pluginName,
                pluginName+" uses hPreObjectDisplay",
                "hPreObjectDisplay is discouraged. If it's used to hide information from some users, use a Restriction instead.\nOtherwise, suppress this warning with an explanation of why you need to use this hook."
            );
        }

    });

    // When plugins use a std_workflow and define forms, they should provide blank forms
    if(!(O.application.config["haplo_activity_navigation:disable_built_in_guides"])) {
        // Collect together all the defined forms
        var blanks = {};
        _.each(activities, function(activity) {
            O.serviceMaybe("haplo_activity_navigation:blank-forms:"+activity.name, function(spec) {
                _.each(spec.forms||[], function(form) {
                    blanks[form.plugin.pluginName+' '+form.formId] = true;
                });
            });
        });
        // Then check all plugins with workflows
        var doneChecks = {};
        _.each(std_workflow, function(info, name) {
            if(!(doneChecks[info.implementedBy])) {
                doneChecks[info.implementedBy] = true;
                var pluginInfo = plugins[info.implementedBy];
                var notUsed = [];
                _.each(pluginInfo.forms, function(formId) {
                    if(!(pluginInfo.pluginName+' '+formId in blanks)) {
                        notUsed.push(formId);
                    }
                });
                if(notUsed.length > 0) {
                    audit.issue(
                        "blank-forms-should-be-in-guides/"+pluginInfo.pluginName+"/"+notUsed.join(','),
                        pluginInfo.pluginName+" defines a Workflow and forms, but not all those forms are provided as blank forms for guides",
                        "Forms used in workflows should be provided for use in the Guides, using the haplo_activity_navigation:blank-forms:[activity] service. Admin users can then select the ones they want to show to their users with a comment.\nRemember to group them as they are in the document store, and set a document if needed to display all the possible fields where some are hidden by default.\nSome of the forms aren't any use as blank forms, as we only want to make available the main application forms, so suppress any remaining blank forms.\n"+
                        "Forms not used: "+notUsed.join(", ")
                    );
                }
            }
        });
    }

});
