/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2021            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


var DEFAULT_GROUPS = [
    Group.ItSupport
];

var DEFAULT_RI_ROLES = [
    A.Head
];

var DEFAULT_COMMITTEE_ROLES = [
    A.CommitteeRepresentative,
    A.Chair,
    A.DeputyChair,
    A.CommitteeMember
];

var MAX_RI_DEPTH = O.application.config["hres:development-activity-impersonation:max-institute-depth"] || 4;

//Default is HRES standard + activity-relevant groups/roles, but client can modify list via service
var getActivityCustomisations = function(activity, defaults, activityExtension, category) {
    const optionalExtension = getOptionalExtensions(activity, category);
    let list = [].concat(defaults).concat(activityExtension).concat(optionalExtension);
    O.serviceMaybe("hres:development-activity-impersonation:"+activity+":override-"+category, list);
    return list;
};

var getOptionalExtensions = function(activity, category) {
    let list = [];
    O.serviceMaybe("hres:development-activity-impersonation:"+activity+":gather-optional-"+category, list);
    return list;
};

var getGroupUsers = function(spec, groups) {
    return _.map(groups, (g) => {
        const group = O.group(g);
        const allMembers = group.loadAllMembers();
        return {
            title: group.name,
            members: allMembers,
            count: allMembers.length+1
        };
    });
};

var getRoleUsers = function(spec, roles) {
    const universityQuery = O.query().link(T.University, A.Type).execute();
    if(!universityQuery.length) { return; }
    const university = universityQuery[0];
    const depth = 0;
    return {
        ref: university.ref,
        roles: getRolesForRI(spec, roles, university),
        children: getRIChildren(spec, roles, university.ref, depth+1),
        unsafeLevelClass: "hierarchy-level-"+depth
    };
};

var getRolesForRI = function(spec, roles, rI) {
    return _.map(roles, (role) => {
        const people = rI.every(role);
        return _.chain(people).
            map((person) => O.user(person)).
            compact().
            value();
    });
};

var getRIChildren = function(spec, roles, rI, depth) {
    if(depth < MAX_RI_DEPTH) {
        const children = O.query().
            link(T.ResearchInstitute, A.Type).
            linkDirectly(rI, A.Parent).
            sortByTitle().
            execute();
        return _.map(children, (child) => {
            return {
                ref: child.ref,
                roles: getRolesForRI(spec, roles, child),
                children: getRIChildren(spec, roles, child.ref, depth+1),
                unsafeLevelClass: "hierarchy-level-"+depth
            };
        });
    }
};

var getCommitteeUsers = function(spec, roles) {
    if(!("committeeTypes" in spec)) { return; }
    const committees = O.query().link(spec.committeeTypes, A.Type).sortByTitle().execute();
    if(!committees.length) { return; }
    return _.map(committees, (committee) => {
        return {
            ref: committee.ref,
            roles: _.map(roles, (role) => {
                const people = committee.every(role);
                return _.chain(people).
                    map((person) => O.user(person)).
                    compact().
                    value();
            })
        };
    });
};

P.provideFeature("hres:development_activity_impersonation", function(plugin) {
    plugin.activityImpersonation = function(spec) {
        if(!O.PLUGIN_DEBUGGING_ENABLED) { return; }
        const activity = O.service("haplo_activity_navigation:get_activity", spec.activityName);
        const activityImpersonationUrl = "/do/hres-development-activity-impersonation/"+activity.name;
        P.respond("GET,POST", activityImpersonationUrl, [
        ], function(E) {
            const groups = getActivityCustomisations(spec.activityName, DEFAULT_GROUPS, spec.activityGroups, "groups");
            const riRoles = getActivityCustomisations(activity.name, DEFAULT_RI_ROLES, spec.activityRoles, "roles");
            const committeeRoles = getActivityCustomisations(activity.name, DEFAULT_COMMITTEE_ROLES, [], "committee-roles");
            E.render({
                title: activity.title+" testing - Groups, Roles and Committees impersonation",
                groupUsers: getGroupUsers(spec, groups),
                roleUsers: getRoleUsers(spec, riRoles),
                roleTitles: _.map(riRoles, (role) => SCHEMA.getAttributeInfo(role).name),
                committeeUsers: getCommitteeUsers(spec, committeeRoles),
                committeeRoleTitles: _.map(committeeRoles, (role) => SCHEMA.getAttributeInfo(role).name),
                backLink: "/do/activity/"+activity.name
            }, "impersonation");
        });

        P.implementService("std:action_panel:activity:menu:"+activity.name.replace(/-/g,'_'), function(display, builder) {
            builder.panel(spec.activityPanel).
                link(2000, activityImpersonationUrl, "Groups, roles and committees");
        });
    };
});
