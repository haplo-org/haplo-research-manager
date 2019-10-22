/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2019            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


P.dataSource("datasets", "object-lookup", [T.Dataset]);

var defaultDMPForm = P.form("default_dmp_form", "form/default_dmp_form.json"),
    DMPDatasetForm = P.form("dmp_form_dataset", "form/dmp_form_dataset.json"),
    DMPCostForm = P.form("dmp_form_cost", "form/dmp_form_cost.json");

var dmpDocstoreSpec = P.dmpDocstoreSpec = {
    name: "dmpDocstore",
    title: "Data management plan",
    formsForKey: function(key) {
        let dmpForm = O.serviceMaybe("hres:data_management_plans:form_for_key", key);
        return dmpForm ? [dmpForm] : [defaultDMPForm, DMPDatasetForm, DMPCostForm];
    },
    panel: 675,
    priority: 100,
    path: "/do/hres-data-management-plans/dmp-form",
    blankDocumentForKey: function(key) {
        return {};
    },
    keyIdType: "ref",
    keyToKeyId(key) {
        if(key.workUnit) {
            let object = key.workUnit.ref.load();
            if(object.first(A.Project) && 
                !O.service("hres:data_management_plan:docstore_has_key", object.ref) &&
                O.service("hres:data_management_plan:dmp_key_for_project", object.first(A.Project))) {
                return O.service("hres:data_management_plan:dmp_key_for_project", object.first(A.Project));
            }
            return object.ref;
        } else {
            return O.isRef(key) ? key : key.ref;
        }
    }
};

var dmpDocstore = P.dmpDocstore = P.defineDocumentStore(dmpDocstoreSpec);

P.respond("GET,POST", "/do/hres-data-management-plans/edit-dmp", [
    {pathElement:0, as:"ref"}
], function(E, projectRef) {
    var instance = dmpDocstore.instance(projectRef);
    instance.handleEditDocument(E, {
        gotoPage: function(instance, E, formId) {
            E.response.redirect("/do/hres-data-management-plans/edit-dmp/"+
                instance.key.toString()+"/"+formId);
        },
        render: function(instance, E, deferredRender) {
            E.render({
                pageTitle: "Data management plan forms", 
                deferred: deferredRender
            }, "add-form");
        },
        finishEditing: function(instance, E, complete) {
            if(complete) {
                instance.commit(O.currentUser);
            }
            E.response.redirect("/"+instance.key.toString());
        }
    });
});

P.respond("GET,POST", "/do/hres-data-management-plans/view-dmp", [
    {pathElement:0, as:"ref"}
], function(E, projectRef) {
    let instance = dmpDocstore.instance(projectRef);
    let ui = instance.makeViewerUI(E, {showVersions: true});
    E.appendSidebarHTML(ui.sidebarHTML);
    E.render({
        pageTitle: "View data management plan",
        deferred: ui.deferredDocument
    }, "view-form");
});

