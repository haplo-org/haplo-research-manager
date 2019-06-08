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
    'researcher': function() {
        var object = this.object;
        var researchers = O.deduplicateArrayOfRefs(object.every(A.Researcher, Q.PrincipalInvestigator).concat(object.every(A.Researcher)));
        return researchers;
    },

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

    'researchDirector': function(context) {
        return this._hresFindRoleInResearchInstitute(A.ResearchDirector, context);
    },

    'schoolHead': ['faculty', A.Head],
    'facultyHead': ['faculty', A.Head],
    'departmentHead': ['department', A.Head]
};

var HRES_SHARED_ROLES = [];

var _hresFindRoleInResearchInstitute = function(desc) {
    var insts = P.INSTITUTE_PROPERTIES_IN_ORDER;
    for(var x = insts.length - 1; x >= 0; --x) { // reverse order, search from lowest
        var property = insts[x];
        // Use the proper getter so all relevant objects are in the schema for workflow automove.
        var institute = this[property+'_maybe'];
        if(institute) {
            var values = institute.every(desc);
            if(values.length) {
                return values;
            }
        }
    }
    // Not found
    return [];
};

var _hresMakeCommitteeEntityGetter = function(type, instituteEntities) {
    var committee;
    var workflow = this;
    for(var i = 0; i < instituteEntities.length; i++) {
        var ri = workflow[instituteEntities[i]+"_maybe"];
        if(ri) { 
            var committeeSearchResults = O.query().link(type, A.Type).
                linkDirectly(ri.ref, A.ResearchInstitute).execute();
            if(committeeSearchResults.length) {
                committee = committeeSearchResults[0];
                break;
            }
        }
    }
    return committee ? [committee.ref] : [];
};

var SETUP_ENTITY_PROTOTYPE = function(prototype) {
    prototype._hresFindRoleInResearchInstitute = _hresFindRoleInResearchInstitute;
    prototype._hresMakeCommitteeEntityGetter = _hresMakeCommitteeEntityGetter;
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
        use("std:entities:tags", "department", "faculty", "academicYear", "project").
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

/*HaploDoc
node: /hres_workflow
sort: 21
--

h3(function). add(entities)

Adds entities to the default combined application entities. @entities@ is a dictionary of entity names to "definitions":https://docs.haplo.org/dev/standard-plugin/workflow/definition/std-features/entities.

This API cannot be used to change existing entity definitions.

h3(function). modify(entities)

Used to change existing entity definitions. The entitiy definition must already exist.

h3(function). sharedRoles(roles)

Defines application-wide shared roles.
*/
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

/*HaploDoc
title: HRes Workflow
node: /hres_workflow
sort: 20
--

h2(feature). hresWorkflowEntities

This feature allows you to modify entities application-wide.

Enable in your plugin by including @"hres:schema:entities"@ in your @plugin.json@'s @use@ array.

This feature must be loaded before workflow entities are defined, so may require the plugin @loadOrder@ to be changed.

*/
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
        if(!workflow.constructEntitiesObject) { return; }
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
/*HaploDoc
node: /hres_workflow
sort: 300
--

h3(config). hres:schema:workflow:required_entities:enable

Boolean. Set to true to have tasks sent to the Check missing entities group when a ref cannot be \
found for some of the @actionableBy@ entities in the state machine so they can debug the issue. \
In such cases a message saying that there is or is going to routing issues and that the \
administrators are resolving the issue replaces the action panel of the workflow. By default IT \
Support group is a member of Check missing entities group.
*/
    if(!O.application.config["hres:schema:workflow:required_entities:enable"]) { return false; }
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
    if(!(O.currentUser.isMemberOf(Group.CheckMissingEntities) || O.currentUser.isMemberOf(Group.Administrators))) {
        O.stop("Not permitted");
    }
    var workUnitQuery = O.work.query().ref(object.ref);
    var missingEntities = [];
    if(workUnitQuery.length > 0) {
        var workUnit = _.find(workUnitQuery, function(wu) {
            // non-workflow workUnits might be attached to an object.
            // find the first workUnit that has a workflow definition for the worktype.
            return O.serviceMaybe("std:workflow:definition_for_name", wu.workType);
        });
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

/*HaploDoc
node: /hres_schema/workflow
title: Workflow integration
--
h3(service). hres:schema:workflow:dashboard:states:configure

Pass in the name of this service as configurationService when using the @std:dashboard:states@ workflow feature. It will deal with most of the configuration for you.
It will set up academic year navigation, and columns split by faculty. States still need to be provided by the using plugin.
*/

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

// --------------------------------------------------------------------------

// Downloadable PDFs need header fields
P.implementService("haplo:workflow:download-pdf:setup:category:hres", function(pdf) {
    var entities = pdf.M.entities;
    entities.object.every(A.Date, function(v,d,q) {
        pdf.headerField(98, "Date", v.toString());
    });
    entities.researcher_list.forEach(function(researcher) {
        pdf.headerField(102, NAME("Researcher"), researcher.title);
        var studentId = researcher.first(A.StudentId);
        if(studentId) { pdf.headerField(104, NAME("Student ID"), studentId.toString()); }
    });
    entities.project_list.forEach(function(project) {
        pdf.headerField(120, NAME("Project"), project.title);
    });
    entities.faculty_list.forEach(function(faculty) {
        pdf.headerField(130, NAME("Faculty"), faculty.title);
    });
    entities.department_list.forEach(function(department) {
        pdf.headerField(132, NAME("Department"), department.title);
    });
});