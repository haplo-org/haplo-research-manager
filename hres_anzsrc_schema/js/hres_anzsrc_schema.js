/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2021            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


// --------------------------------------------------------------------------
// FoR Code Data Type
// --------------------------------------------------------------------------

var createCodeValue = P.implementTextType("hres_anzsrc:for_code", "Field of Research Code", {
    string: function(value) {
        return value[0];
    },
    indexable: function(value) {
        return value[0];
    },
    identifier: function(value) {
        return value[0];
    },
    render: function(value) {
        return value[0];
    },
    $setupEditorPlugin: function(value) {
        P.template("include_code_editor").render();
    }
});

// --------------------------------------------------------------------------
// FoR Navigation
// --------------------------------------------------------------------------


P.hook("hNavigationPosition", function(response, name) {
    if(name === "hres:anzsrc-fields-of-research" && !O.application.config["hres_anzsrc_schema:hide_for_navigation"]) {
        let navigation = response.navigation;
        navigation.separator();
        navigation.link("/do/hres-anzsrc-schema/fields-of-research", "ANZSRC Fields of Research");
    }
});

P.respond("GET", "/do/hres-anzsrc-schema/fields-of-research", [
], function(E) {
    E.render({
        fors: O.query().link(T.ANZSRCFieldOfResearch, A.Type).
            linkToQuery(A.Parent, null, false, (sq) => {
                // This returns the items linked to the taxonomy root type e.g. the 2008 root
                // Which the linkToQuery above takes and returns the 2 Digit FoRs for that root
                // By searching for links through the A.Parent attribute
                sq.link(T.ANZSRCFieldOfResearch, A.Type);
                if(!!O.behaviourRefMaybe(ROOT_BEHAVIOUR)) {
                    sq.linkDirectly(O.behaviourRefMaybe(ROOT_BEHAVIOUR));
                }
            }).
            sortByTitle().
            execute()
    });
});

P.implementService("std:action_panel:anzsrc_for_navigation", function(display, builder) {
    let relatedFoRPanel = builder.panel(500);
    O.query().
        link(T.ANZSRCFieldOfResearch, A.Type).
        linkDirectly(display.object.ref, A.Parent).
        sortByTitle().
        execute().
        each((fieldOfResearch) => {
            relatedFoRPanel.link("default", fieldOfResearch.url(), fieldOfResearch.title);
        });
    if(!relatedFoRPanel.empty) { relatedFoRPanel.element(0, {title:"Related Fields of Research"}); }
});

// --------------------------------------------------------------------------
// Permissions
// --------------------------------------------------------------------------

P.implementService("haplo:descriptive_object_labelling:setup", function(type) {
    type(T.Person, {
        labelWith: [A.ANZSRCFieldOfResearch]
    });

    type(T.Project, {
        labelsFromLinked: [[A.Researcher, A.ANZSRCFieldOfResearch]]
    });
});

P.implementService("haplo:user_roles_permissions:setup", function(setup) {
    setup.attributeRole("Field of Research Lead",       T.ANZSRCFieldOfResearch,   A.Head);

    // FoR Leads get read permissions at all things within their FoR
    setup.roleOversightPermission("Field of Research Lead",     "read",         [T.Project]);
});

// --------------------------------------------------------------------------
// Computing FoR onto annotated objects from researcher
// --------------------------------------------------------------------------

P.hook('hComputeAttributes', function(response, object) {
    if(object.isKindOfTypeAnnotated('hres:annotation:anzsrc-field-of-research:copy-from-researcher')) {
        let allResearchersFoR = [];
        object.every(A.Researcher, (v,d,q) => {
            let researcher = v.load();
            allResearchersFoR = allResearchersFoR.concat(researcher.every(A.ANZSRCFieldOfResearch));
        });

        let toAdd = _.map(O.deduplicateArrayOfRefs(allResearchersFoR), (ref) => ref.toString());
        let existing = _.map(O.deduplicateArrayOfRefs(object.every(A.ANZSRCFieldOfResearch)), (ref) => ref.toString());
        if(!_.isEqual(toAdd, existing)) {
            O.withoutPermissionEnforcement(() => {
                object.remove(A.ANZSRCFieldOfResearch);
                _.each(toAdd, function(refStr) {
                    object.append(O.ref(refStr), A.ANZSRCFieldOfResearch);
                });
            });
        }
    }
});

P.hook('hPostObjectChange', function(response, object, operation, previous) {
    if(object.isKindOf(T.Person)) {
        if(!(previous && object.valuesEqual(previous, A.ANZSRCFieldOfResearch))) {
            O.background.run("hres_anzsrc_schema:copy_for_to_linked_records", {
                ref: object.ref.toString()
            });
        }
    }
});

P.backgroundCallback("copy_for_to_linked_records", function(data) {
    O.withoutPermissionEnforcement(() => {
        O.query().
            link(SCHEMA.getTypesWithAnnotation('hres:annotation:anzsrc-field-of-research:copy-from-researcher'), A.Type).
            link(O.ref(data.ref), A.Researcher).
            execute().each((obj) => {
                let mObj = obj.mutableCopy();
                mObj.computeAttributesForced();
                if(!obj.valuesEqual(mObj)) {
                    mObj.save();
                }
            });
    });
});

// --------------------------------------------------------------------------
// Reporting
// --------------------------------------------------------------------------

P.implementService("std:reporting:discover_collections", function(discover) {
    discover("anzsrc_field_of_research", "ANZSRC Field of Research");
});

P.implementService("std:reporting:collection:anzsrc_field_of_research:setup", function(collection) {
    collection.currentObjectsOfType(T.ANZSRCFieldOfResearch);
});

P.implementService("std:reporting:collection:researchers:setup", function(collection) {
    collection.
        fact("anzsrcFieldOfResearch",     "ref",      "Field of Research");
});

P.implementService("std:reporting:collection:researchers:get_facts_for_object", function(object, row) {
    row.anzsrcFieldOfResearch = object.first(A.ANZSRCFieldOfResearch);
});

// ------ Aggregate dimensions -----------------------

P.implementService("hres:reporting_aggregate_dimension:anzsrc_field_of_research", function() {
    return _.map(O.query().link(T.ANZSRCFieldOfResearch, A.Type).sortByTitle().execute(), (field) => {
        return {
            title: field.shortestTitle,
            value: field.ref,
            groupByFact: "anzsrcFieldOfResearch",
            filter(select) {
                select.where("anzsrcFieldOfResearch", "=", field.ref);
            }
        };
    });
});

// --------------------------------------------------------------------------
// Taxonomy Generation
// --------------------------------------------------------------------------

var ImportTaxonomy = P.form("import-taxonomy", "form/import-taxonomy.json");
P.respond("GET,POST", "/do/hres-anzsrc-schema/import-for", [
], function(E) {
    O.action("std:action:administrator_override").enforce();
    let possibleYears = ["2008", "2020"];
    let document = {};
    let form = ImportTaxonomy.instance(document);
    form.choices("years", _.map(possibleYears, (year) => {
        let label = year;
        if(!!O.behaviourRefMaybe(ROOT_BEHAVIOUR+":"+year)) { label += " (already exists)"; }
        return [year,label];
    }));
    form.update(E.request);
    if(form.complete) {
        P.data.status = "running";
        O.background.run("hres_anzsrc_schema:run", {
            years: JSON.stringify(document.year),
            archived: document.archived,
            maxDepth: document.maxDepth,
            includeCodeInTitle: document.includeCodeInTitle
        });
        return E.response.redirect("/do/hres-anzsrc-schema/import-for");
    }
    E.render({
        form: form,
        isRunning: P.data.status === "running"
    });
});

var ROOT_BEHAVIOUR = "hres:list:anzsrc-field-of-research";

var generateTaxonomy = function(years, archived, maxDepth, includeCodeInTitle) {
    let labelChanges = O.labelChanges();
    if(archived) { labelChanges.add(Label.ARCHIVED); }
    let createRootObject = function(title, behaviour, parent) {
        let rootObject = O.object();
        rootObject.appendType(T.ANZSRCFieldOfResearch);
        rootObject.appendTitle(title);
        rootObject.append(O.text(O.T_IDENTIFIER_CONFIGURATION_NAME, behaviour), A.ConfiguredBehaviour);
        if(parent) {
            rootObject.append(parent.ref, A.Parent);
        }
        rootObject.save(labelChanges);
        return rootObject;
    };

    let rootTitle = SCHEMA.getTypeInfo(T.ANZSRCFieldOfResearch).name;
    let importYear = function(rootObject, year, includeYearInYearRootObjectTitle) {
        let yearBehaviour = ROOT_BEHAVIOUR + ":" + year;
        let yearRootTitle = includeYearInYearRootObjectTitle ? year + " " + rootTitle : rootTitle;
        let yearRootObject = createRootObject(yearRootTitle, yearBehaviour, rootObject);

        let codeToTitle = P.loadFile("anzsrc-for-"+year+".json").readAsJSON();
        let codeToRef = {};
        _.each(codeToTitle, (title, code) => {
            if(code.length > maxDepth) { return; }
            let object = O.object();
            object.appendType(T.ANZSRCFieldOfResearch);
            // Prefix title with code
            object.appendTitle(includeCodeInTitle ? code + ". " + title : title);
            object.append(createCodeValue([code]), A.Code);
            let behaviour = yearBehaviour + ":" + code + ":" + title.trim().toLowerCase().
                // replaces punctuation and ā (for example) with hyphens
                replace(/[^a-z]/g, "-").
                // ensures only one hyphen in a row
                replace(/-+/g, "-").
                // remove last hyphen if it exists
                replace(/-$/g, "");

            // e.g. Pacific History (excl. New Zealand and Māori) -> :pacific-history-excl-new-zealand-and-m-ori
            object.append(O.text(O.T_IDENTIFIER_CONFIGURATION_NAME, behaviour), A.ConfiguredBehaviour);

            let parent = yearRootObject;
            if(code.length > 2) {
                parent = codeToRef[code.slice(0, code.length-2)];
            }
            object.append(parent, A.Parent);
            object.save(labelChanges);
            codeToRef[code] = object.ref;
        });
    };
    if(years.length > 1) {
        let rootRefMaybe = O.behaviourRefMaybe(ROOT_BEHAVIOUR);
        let rootObject = rootRefMaybe ? rootRefMaybe.load() : createRootObject(rootTitle, ROOT_BEHAVIOUR);
        _.each(years, (year) => importYear(rootObject, year, true));
    } else {
        // Create the year as a root of the type without a title in it's name
        importYear(undefined, years[0], false);
    }

};

P.backgroundCallback("run", function(data) {
    O.impersonating(O.SYSTEM, () => {
        generateTaxonomy(JSON.parse(data.years), data.archived, data.maxDepth, data.includeCodeInTitle);
        P.data.status = "done";
    });
});

// --------------------------------------------------------------------------
// Data import framework filter
// --------------------------------------------------------------------------

P.implementService("haplo:data-import-framework:filter:hres:anzsrc-for-code-to-ref", function() {
    return function(value) {
        if(typeof(value) === "string") {
            let output = O.query().
                link(T.ANZSRCFieldOfResearch, A.Type).
                identifier(createCodeValue([value]), A.Code).
                includeArchivedObjects().
                limit(1).
                execute();
            return output.length ? output[0].ref : undefined;
        }
    };
});

// --------------------------------------------------------------------------
// Test data generation
// --------------------------------------------------------------------------

P.implementService("hres:development:generate-test-data-start", function(generator) {
    if(!O.behaviourRefMaybe(ROOT_BEHAVIOUR)) { // Allows custom generation
        generateTaxonomy(["2020"], false, 6);
    }
});

var fieldsOfResearch;
P.implementService("hres_development_test_data:amend_created_person", function(generator, person) {
    if(!fieldsOfResearch) { fieldsOfResearch = O.query().link(T.ANZSRCFieldOfResearch, A.Type).execute(); }
    if(Math.random() < 0.8) {
        person.append(generator.randomListMember(fieldsOfResearch), A.ANZSRCFieldOfResearch);
    }
});

P.implementService("hres:development:generate-test-data-end", function(action) {
    action(20, function(generator) {
        let researchers = O.query().link(T.Researcher, A.Type).execute();
        _.each(fieldsOfResearch, (field) => {
            if(Math.random() < 0.9) {
                let mfield = field.mutableCopy();
                mfield.append(generator.randomListMember(researchers), A.Head);
                mfield.save();
            }
        });
    });
});

// --------------------------------------------------------------------------
// TODO: Delete migration
// --------------------------------------------------------------------------

P.respond("GET,POST", "/do/hres-anzsrc-schema/migrate-code-to-plugin-text-type", [
], function(E) {
    if(!O.currentUser.isSuperUser) { O.stop("Not permitted"); }
    let fieldsOfResearch = O.query().link(T.ANZSRCFieldOfResearch, A.Type).includeArchivedObjects().execute();
    // We only want to alter FoRs where they have a code and it's not the custom text type
    let forsToChange = _.reject(fieldsOfResearch, (fieldOfResearch) => {
        const code = fieldOfResearch.first(A.Code); // Only a single code
        return !code || O.isPluginTextValue(code, "hres_anzsrc:for_code");
    });
    let number = forsToChange.length;
    if(E.request.method === "POST") {
        _.each(forsToChange, (fieldOfResearch) => {
            const code = fieldOfResearch.first(A.Code);
            const mFieldOfResearch = fieldOfResearch.mutableCopy();
            mFieldOfResearch.remove(A.Code);
            mFieldOfResearch.append(createCodeValue([code.toString()]), A.Code);
            mFieldOfResearch.save();
        });
        return E.response.redirect("/");
    }
    E.render({
        pageTitle: "Migrate fields of research",
        backLink: "/",
        text: "Are you sure you would like to migrate "+number+" fields of research to use the custom plugin "+
            "text type for the code?",
        options: [{label:"Confirm"}]
    }, "std:ui:confirm");
});