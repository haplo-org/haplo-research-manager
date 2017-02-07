/* Haplo Research Manager                             http://haplo.org
 * (c) Haplo Services Ltd 2006 - 2016    http://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


var entityNameFromType = O.refdict();
entityNameFromType.set(T.School,     "school");
entityNameFromType.set(T.Department, "department");
entityNameFromType.set(T.Faculty,    "faculty");
entityNameFromType.set(T.University, "university");

var makeResearchInstituteGetter = function(name) {
    return function(context) {
        if(!("_loadedInstitute" in this)) {
            this._loadedInstitute = true;
            var lists = {};
            entityNameFromType.each(function(key, value) {
                lists[value] = [];
            });
            var scan, researcher,
                researcher_list = this.researcher_list,
                rllen = researcher_list.length;
            for(var i = 0; i < rllen; i++) {
                researcher = researcher_list[i];
                if(researcher && (scan = researcher.first(A.ResearchInstitute))) { 
                    var safety = 32;
                    while(scan && (--safety)) {
                        var obj = scan.load();
                        var n = entityNameFromType.get(obj.firstType());
                        if(n) {
                            // Deduped addition of research institute to list
                            var list = lists[n],
                                x = list.length - 1;
                            for(; x >= 0; --x) { if(list[x] == scan) { break; } }
                            if(x < 0) { lists[n].push(scan); }
                        }
                        scan = obj.firstParent();
                    }
                }
            }
            var that = this;
            entityNameFromType.each(function(key, value) {
                that[value+'_refList'] = lists[value];
            });
        }
        return (context === "list") ? this[name+'_refList'] : this[name+'_refList'][0];
    };
};

// --------------------------------------------------------------------------

var HRES_ENTITIES = {
    'researcher': ['object', A.Researcher],

    'academicYear': ['object', A.AcademicYear],

    'project': ['object', A.Project],

    "supervisor": ["project", A.Supervisor],

    'researchInstitute': ['researcher', A.ResearchInstitute],

    'school': makeResearchInstituteGetter('school'),
    'department': makeResearchInstituteGetter('department'),
    'faculty':    makeResearchInstituteGetter('faculty'),
    'university': makeResearchInstituteGetter('university'),

    'researchAdministrator': function(context) {
        return this._hresFindRoleInResearchInstitute(A.ResearchAdministrator, context);
    },

    'schoolHead': ['faculty', A.Head],
    'facultyHead': ['faculty', A.Head],
    'departmentHead': ['department', A.Head]
};

var HRES_SHARED_ROLES = [];

var _hresFindRoleInResearchInstitute = function(desc, context) {
    var insts = P.INSTITUTE_PROPERTIES_IN_ORDER;
    for(var x = insts.length - 1; x >= 0; --x) { // reverse order, search from lowest
        var property = insts[x];
        // Use the proper getter so all relevant objects are in the schema for workflow automove.
        var institute = this[property+'_maybe'];
        if(institute) {
            var values = institute.every(desc);
            if(values.length) {
                return (context === "list") ? values : values[0];
            }
        }
    }
    // Not found
    return (context === "list") ? [] : undefined;
};
var SETUP_ENTITY_PROTOTYPE = function(prototype) {
    prototype._hresFindRoleInResearchInstitute = _hresFindRoleInResearchInstitute;
};

// --------------------------------------------------------------------------

var haveUsedSchemaWorkflowFeature = false;
var usageOrder = []; // track use of workflow & plugin features to give better error message
var usesHresEntities = {};

P.workflow.registerWorkflowFeature("hres:combined_application_entities", function(workflow, entities) {
    usageOrder.push("workflow "+workflow.plugin.pluginName);
    haveUsedSchemaWorkflowFeature = true;
    workflow.
        use("std:entities", HRES_ENTITIES, SETUP_ENTITY_PROTOTYPE).
        use("std:entities:tags", "department", "faculty", "academicYear").
        use("std:entities:add_entities", entities).
        use("std:entities:roles");
    if(HRES_SHARED_ROLES.length) {
        workflow.use("std:entities:entity_shared_roles", {
            entities: HRES_SHARED_ROLES
        });
    }
    usesHresEntities[workflow.fullName] = true;
});

// --------------------------------------------------------------------------

var modifyEntities = function(entities, expected) {
    if(haveUsedSchemaWorkflowFeature) {
        // Must do all modification before using it in workflows, otherwise you'd get different entities in different workflows.
        throw new Error("Cannot modify hres:schema:entities after using the workflow feature. Adjust loadPriority of consuming plugins. Usage order: "+usageOrder.join(", "));
    }
    _.each(entities, function(v,k) {
        var actual = !!(k in HRES_ENTITIES);
        if(expected !== actual) {
            throw new Error((expected ? "Entity does not exist yet for modification: " : "Entity exists: ")+k);
        }
        HRES_ENTITIES[k] = v;
    });
};

var WORKFLOW_ENTITIES_FEATURE = {
    add:    function(entities) { modifyEntities(entities, false); },
    modify: function(entities) { modifyEntities(entities, true ); },
    sharedRoles: function(roles) {
        _.each(roles, function(role) {
            if(-1 === HRES_SHARED_ROLES.indexOf(role)) {
                HRES_SHARED_ROLES.push(role);
            }
        });
    }
};

P.provideFeature("hres:schema:entities", function(plugin) {
    usageOrder.push("plugin feature "+plugin.pluginName);
    plugin.hresWorkflowEntities = WORKFLOW_ENTITIES_FEATURE;
    plugin.hresCombinedApplicationStandaloneEntities = function(entities) {
        return P.workflow.standaloneEntities(
            _.extend({}, HRES_ENTITIES, entities || {}), SETUP_ENTITY_PROTOTYPE);
    };
});

// --------------------------------------------------------------------------

// Make sure workflows have minimum entities before anything can happen.
var requiredEntitiesMaybeProperties = {};  // calculated requirements
var requiredEntitiesAdd = {};
var requiredEntitiesRemove = {};
var allowMissingEntityFns = {};

P.workflow.registerOnLoadCallback(function(workflows) {
    workflows.forEach(function(workflow) {
        var name = workflow.fullName;
        // TODO using private variables, change to public api when available
        var entityDefinitions = workflow.constructEntitiesObject.$Entities.prototype.$entityDefinitions;
        if(usesHresEntities[name]) {
            var required = [];
            var remove = requiredEntitiesRemove[name] || [];
            workflow.
                getUsedActionableBy().
                concat(requiredEntitiesAdd[name]).
                forEach(function(actionableBy) {
                    if(actionableBy in entityDefinitions) {
                        if(-1 === remove.indexOf(actionableBy)) {
                            required.push(actionableBy+'_refMaybe');
                        }
                    }
                });
            requiredEntitiesMaybeProperties[name] = required;
            if(required.length) {
                workflow.actionPanel({closed:false}, hideActionPanelIfRequiredEntitiesMissing);
                workflow.transitionUI({closed:false}, blockTransitionsIfRequiredEntitiesMissing);
            }
        }
    });
});

var defineRequiredEntitiesModifier = function(featureName, dict) {
    P.workflow.registerWorkflowFeature(featureName, function(workflow, entities) {
        dict[workflow.fullName] = (dict[workflow.fullName] || []).concat(entities);
    });
};
// Workflows might require more entities to be defined to work, add them with:
defineRequiredEntitiesModifier("hres:schema:workflow:required_entities:add",    requiredEntitiesAdd);
// Workflows might only use an entity in rare situations and check it itself, remove them from auto checks with:
defineRequiredEntitiesModifier("hres:schema:workflow:required_entities:remove", requiredEntitiesRemove);
// Workflows might want to allow a missing entity for some instances
P.workflow.registerWorkflowFeature("hres:schema:workflow:required_entities:allow_missing_entity", function(workflow, fn) {
    if(!allowMissingEntityFns[workflow.fullName]) { allowMissingEntityFns[workflow.fullName] = []; }
    allowMissingEntityFns[workflow.fullName].push(fn);
});

var isMissingEntityAllowed = function(M, entity) {
    var allow = false;
    var fns = allowMissingEntityFns[M.workUnit.workType] || [];
    for(var j = fns.length - 1; j >= 0; --j) {
        if(fns[j](M, entity.replace("_refMaybe", ""))) {
            allow = true;
        }
    }
    return allow;
};

// TODO: Cache workflowHasMissingEntities if it's called in more than one place
var workflowHasMissingEntities = function(M) {
    if(O.application.config["hres:schema:workflow:required_entities:disable"]) { return false; }
    var requiredMaybeProps = requiredEntitiesMaybeProperties[M.workUnit.workType];
    if(requiredMaybeProps) {
        var entities = M.entities; // will only get here if hres:schema:entities was used on the workflow
        for(var i = requiredMaybeProps.length - 1; i >= 0; --i) {
            if(!(entities[requiredMaybeProps[i]])) {
                if(!isMissingEntityAllowed(M, requiredMaybeProps[i])) {
                    return true;
                }
            }
        }
    }
    return false;
};

// This is a bit of a hacky way of removing the UI, and doesn't really prevent anything,
// but is a low impact and relatively efficient way of stopping bad things happening.
var hideActionPanelIfRequiredEntitiesMissing = function(M, builder) {
    if(workflowHasMissingEntities(M)) {
        sendEntityMissingTask(M);
        builder.hidePanel();
        builder.panel(0).style("special").element(1, {
            deferred: P.template("workflow/entity-requirements-not-met").deferredRender()
        });
    }
};

var blockTransitionsIfRequiredEntitiesMissing = function(M, E, ui) {
    if(workflowHasMissingEntities(M)) {
        sendEntityMissingTask(M);
        ui.redirect(M.url);
    }
};

var sendEntityMissingTask = function(M) {
    O.serviceMaybe("haplo:group_notification_queue:push", {
        group: Group.CheckMissingEntities,
        type: "entity_missing",
        ref: M.workUnit.ref,
        deduplicateOnRef: true
    });
};

P.implementService("hres:schema:workflow:required_entities:have_missing", function(M) {
    return !!workflowHasMissingEntities(M);
});

P.implementService("haplo:group_notification_queue:queue_definition:"+
    Group.CheckMissingEntities, function() {
        return {
            pageTitle: "Missing information",
            workUnitTitle: "Missing information required for applications"
        };
    }
);

P.implementService("haplo:group_notification_queue:task_definition:entity_missing",
    function(ref) {
        return {
            // description: "Required information missing for application"
            deferredRenderDescription: P.template(
                "workflow/entity-requirement-task-description").deferredRender({
                    ref: ref.toString()
                })
        };
    }
);

P.respond("GET", "/do/hres-missing-entities/show-missing-entities", [
    {pathElement:0, as:"object"}
], function(E, object) {
    if(!O.currentUser.isMemberOf(Group.CheckMissingEntities)) {
        O.stop("Not permitted");
    }
    var workUnitQuery = O.work.query().ref(object.ref);
    var missingEntities = [];
    if(workUnitQuery.length > 0) {
        var workUnit = workUnitQuery[0];
        var M = O.serviceMaybe("std:workflow:for_ref", workUnit.workType, object.ref);
        if(M) {
            var requiredMaybeProps = requiredEntitiesMaybeProperties[M.workUnit.workType];
            for(var i = requiredMaybeProps.length - 1; i >= 0; --i) {
                var entity = requiredMaybeProps[i];
                if(!(M.entities[entity])) {
                    if(!isMissingEntityAllowed(M, entity)) {
                        missingEntities.push(entity.replace("_refMaybe", ""));
                    }
                }
            }
        }
    }
    E.render({
        object: object,
        missingEntities: missingEntities
    }, "workflow/show-missing-entities");
});

// --------------------------------------------------------------------------

var refColumnTagToName = function(tag) {
    var r = O.ref(tag);
    return r ? r.load().shortestTitle : '';
};

// for configurationService in std:dashboard:states specifications
P.implementService("hres:schema:workflow:dashboard:states:configure", function(spec) {
    spec.columnTag = "faculty";
    spec.columnTagToName = refColumnTagToName;
    var setup = spec.setup;
    spec.setup = function(dashboard, E) {
        if(setup) { setup(dashboard, E); }
        var currentYear = O.ref(E.request.parameters.year);
        var year = currentYear ?
            O.service("hres:academic_year:year_info", currentYear) :
            O.service("hres:academic_year:for_date", new Date());
        dashboard.addQueryFilter(function(query) { query.tag('academicYear', year.ref.toString()); });
        dashboard.addLinkParameter("year", year.ref.toString());
        dashboard.addHeaderDeferred(P.template("academic-year-navigation").deferredRender(year));
        // TODO: Perform permission enforcement without using this temporary API
        dashboard.addQueryFilter(function(query) { query._temp_refPermitsReadByUser(O.currentUser); });
    };
});
