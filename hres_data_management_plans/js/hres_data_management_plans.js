/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2019            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */

var defaultDMPForm = P.form("default_dmp_form", "form/default_dmp_form.json");

var dmpDocstoreSpec = {
    name: "dmpDocstore",
    title: "Data management plan",
    formsForKey: function(key) {
        let dmpForm = O.serviceMaybe("hres:data_management_plans:form_for_key", key);
        return dmpForm ? [dmpForm] : [defaultDMPForm];
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

var dmpDocstore = P.defineDocumentStore(dmpDocstoreSpec);

P.provideFeature("hres:data_management_plan", function(plugin) {
    plugin.dmpDocstore = {
        docstore: dmpDocstore,
        spec: dmpDocstoreSpec
    };
});

var docstoreHasKey = function(key) {
    let instance = dmpDocstore.instance(key);
    return !!instance && instance.hasCommittedDocument;
};

P.implementService("hres:data_management_plan:docstore_has_key", docstoreHasKey);

P.implementService("hres:data_management_plan:dmp_key_for_project", function(project) {
    let possibleSourceObjects = O.query().
        link(SCHEMA.getTypesWithAnnotation('hres:annotation:dmp-source'), A.Type).
        link(project, A.Project).execute();
    let dmp = _.chain(possibleSourceObjects).filter((obj) => {
        let objIsValid = O.service("hres:data_management_plan:object_is_valid_source", obj);
        return objIsValid && docstoreHasKey(obj);
    }).first().value();
    return dmp ? dmp.ref : undefined;
});