/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2020            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


var ALLOW_PREVIOUS_DATASETS = O.application.config["hres:data_management_plans:allow_previous_datasets"] || false;

if("Dataset" in T) {
    P.dataSource("datasets", "object-lookup", [T.Dataset]);
}

// TODO: Not pluggable with the replaceable forms
var getChoicesFromSpec = function(specification) {
    let expectedSizes;
    _.find(specification.elements[0], (repeatingSection) => {
        expectedSizes = _.find(repeatingSection, (element) => {
            return element.path === "expected_size";
        });
        if(expectedSizes) { expectedSizes = expectedSizes.choices; }
        return !!expectedSizes;
    });
    return expectedSizes;
};

var isLargeFile = P.isLargeFile = function(expected_size) {
    const largeFileChoiceId = O.application.config["hres:data_management_plans:large_file_choice_id"] || "1tb";
    let expectedSizes = getChoicesFromSpec(DMPDatasetForm.specification);
    if(!expectedSizes) { return; }
    let largeFileIndex = _.find(expectedSizes, (choice) => { return choice[0] === largeFileChoiceId; });
    let choiceIndex = _.find(expectedSizes, (choice) => { return choice[0] === expected_size; });
    return _.indexOf(expectedSizes, choiceIndex) >= _.indexOf(expectedSizes, largeFileIndex);
};

P.implementService("hres:data_management_plans:expected_size_is_large", isLargeFile);

var DMPForm = P.replaceableForm("default-title-form", "form/default-title-form.json"),
    DMPDatasetForm = P.replaceableForm("datasets-form", "form/datasets-form.json"),
    DMPCostForm = P.replaceableForm("costs-form", "form/costs-form.json"),
    DMPEthicsForm = P.replaceableForm("ethics-form", "form/ethics-form.json"),
    HasDatasetsForm = P.replaceableForm("existing-datasets", "form/existing-datasets.json");

var dmpDocstore = P.dmpDocstore = P.defineDocumentStore({
    name: "dmpDocstore",
    title: "Data management plan",
    keyIdType: "ref",
    formsForKey: function(key) {
        let dmpForm = O.serviceMaybe("hres:data_management_plans:form_for_key", key);
        let forms = [DMPForm, DMPDatasetForm, DMPCostForm, DMPEthicsForm];

        // Replace front form if specific one needed, else use replaceable templated one
        if(dmpForm) { forms.splice(0, 1, dmpForm); }
        return forms;
    },
    panel: 675,
    priority: 100,
    path: "/do/hres-data-management-plans/dmp-form",
    blankDocumentForKey: function(key) {
        return {};
    },
    keyToKeyId(key) {
        if(key.workUnit) {
            return key.workUnit.ref;
        } else {
            return O.isRef(key) ? key : key.ref;
        }
    },
    getAdditionalUIForEditor: function(M, instance, document, form) {
        if(form.formId === "datasets-form") {
            let hasPrefilled = P.hasPrefilledDatasets(document);
            return {
                top: hasPrefilled ? P.template("std:ui:request").deferredRender({
                        message: "This form has some data prefilled from the datasets you selected as relevant to this DMP. If anything is incorrect you can edit it here before submitting."
                    }) : undefined,
                formTop: ALLOW_PREVIOUS_DATASETS ? P.template("add-dataset-link").deferredRender({key: instance.key}) : undefined
            };
        }
        if(form.formId === "ethics-form" && P.hasPrefilledEthics(document)) {
            return {
                top: P.template("std:ui:request").deferredRender({
                    message: "This form has some data prefilled from ethics applications related to your project. If anything is incorrect you can edit it here before submitting."
                })
            };
        }
        if(form.formId === "costs-form" && P.hasPrefilledCosts(document)) {
            return {
                top: P.template("std:ui:request").deferredRender({
                    message: "This form has some data prefilled from proposals related to your project. If anything is incorrect you can edit it here before submitting."
                })
            };
        }
    },
    onCommit(instance, user) {
        P.checkFileSizes(instance);
        O.serviceMaybe("hres:data_management_plans:on_dmp_commit", instance);
    }
});

var datasetDocstore = P.datasetDocstore = P.defineDocumentStore({
    name: "datasetDocstore",
    title: "Related datasets",
    keyIdType: "ref",
    formsForKey: function(key) {
        return [HasDatasetsForm];
    },
    path: "/do/hres-data-management-plans/datasets-form",
    blankDocumentForKey: function(key) {
        return {};
    },
    keyToKeyId(key) {
        if(key.workUnit) {
            let objectRef = key.workUnit.ref;
            return objectRef;
        } else {
            return O.isRef(key) ? key : key.ref;
        }
    },
    prepareFormInstance(key, form, instance, context) {
        let linkedDatasets = O.query().link(T.Dataset, A.Type).link(key, A.Project).execute();
        instance.choices("linkedDatasets", _.map(linkedDatasets, (dataset) => {
            return [dataset.ref.toString(), dataset.title];
        }));
    },
    getAdditionalUIForEditor(M, instance, document, form) {
        return {
            top: P.template("std:ui:request").deferredRender({
                message: "Enter the datasets related to your DMP here. If you can't find them or wish to enter the details manually click save for later. You can always return to this page from the DMP form"
            })
        };
    },
    onCommit(instance, user) {
        let dmpDatasets = dmpDocstore.instance(instance.key),
            document = P.addDatasets(instance, dmpDatasets);
        dmpDatasets.setCurrentDocument(document, false);
    }
});

// --------------------------------------------------------------------------
// Handlers
// --------------------------------------------------------------------------


P.respond("GET,POST", "/do/hres-data-management-plans/view-dmp", [
    {pathElement:0, as:"ref"}
], function(E, projectRef) {
    if(!P.canViewAndEditDMP(projectRef)) { O.stop("Not permitted"); }
    let instance = dmpDocstore.instance(projectRef);
    let ui = instance.makeViewerUI(E, {showVersions: true});
    E.appendSidebarHTML(ui.sidebarHTML);
    E.render({
        pageTitle: "View data management plan",
        deferred: ui.deferredDocument
    }, "view-form");
});

P.respond("GET,POST", "/do/hres-data-management-plans/edit-dmp", [
    {pathElement:0, as:"ref"}
], function(E, projectRef) {
    if(!P.canViewAndEditDMP(projectRef)) { O.stop("Not permitted"); }
    let instance = dmpDocstore.instance(projectRef),
        currentDoc = instance.currentDocument;
    if(!currentDoc.ethical_issues_exist) { P.addEthicsIssues(instance, projectRef); }
    if(!currentDoc.costs) { P.addCostingInformation(instance, projectRef); }
    if(!currentDoc.title) { currentDoc.title = projectRef.load().title; }

    instance.handleEditDocument(E, {
        gotoPage: function(instance, E, formId) {
            if(ALLOW_PREVIOUS_DATASETS && formId === "datasets-form" && !instance.currentDocument.datasets) {
                E.response.redirect("/do/hres-data-management-plans/has-datasets/"+instance.key.toString());
            } else {
                E.response.redirect("/do/hres-data-management-plans/edit-dmp/"+instance.key.toString()+"/"+formId);
            }
        },
        render: function(instance, E, deferredRender) {
            E.render({
                pageTitle: instance.hasCommittedDocument ? "Edit data management plan" : "Add data management plan", 
                deferred: deferredRender
            }, "add-form");
        },
        finishEditing: function(instance, E, complete) {
            if(complete) {
                P.addDMPHiddens(instance);
                instance.commit(O.currentUser);
            }
            E.response.redirect("/"+instance.key.toString());
        }
    });
});

P.respond("GET,POST", "/do/hres-data-management-plans/get-related-datasets", [
    {pathElement:0, as: "ref"}
], function(E, projectRef) {
    if(!P.canViewAndEditDMP(projectRef)) { O.stop("Not permitted"); }
    let instance = datasetDocstore.instance(projectRef);
    instance.handleEditDocument(E, {
        render: function(instance, E, deferredRender) {
            E.render({
                pageTitle: "Add related datasets", 
                deferred: deferredRender
            }, "add-form");
        },
        finishEditing: function(instance, E, complete) {
            if(complete) {
                instance.commit(O.currentUser);
            }
            E.response.redirect("/do/hres-data-management-plans/edit-dmp/"+projectRef.toString()+"/datasets-form");
        }
    });
});

P.respond("GET", "/do/hres-data-management-plans/has-datasets", [
    {pathElement:0, as:"ref"}
], function(E, projectRef) {
    if(!P.canViewAndEditDMP(projectRef)) { O.stop("Not permitted"); }
    E.render({
        pageTitle: "Does this DMP refer to an existing dataset?",
        backLink: "/do/hres-data-management-plans/edit-dmp/"+projectRef.toString(),
        options: [
            {
                action: "/do/hres-data-management-plans/get-related-datasets/"+projectRef.toString(),
                label: "Yes",
                notes: "This DMP refers to a dataset which has already been collated and exists within this Haplo repository",
                indicator: "primary"
            },
            {
                action: "/do/hres-data-management-plans/edit-dmp/"+projectRef.toString()+"/datasets-form",
                label: "No",
                notes: "This DMP refers to either a dataset that exists outside of the Haplo repository or one which is yet to be collated",
                indicator: "primary"
            }
        ]
    }, "std:ui:choose");
});