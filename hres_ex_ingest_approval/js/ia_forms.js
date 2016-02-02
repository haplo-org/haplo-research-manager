/* Haplo Research Manager                             http://haplo.org
 * (c) Haplo Services Ltd 2006 - 2016    http://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


// General information form specification
// Form specification: http://docs.haplo.org/dev/plugin/form/specification
var general = P.form({
    specificationVersion:0,
    formId: "authorForm",
    formTitle: "General",
    elements:[
        {
            type:"boolean",
            path:"requiresSoftware",
            label:"Does the dataset require any proprietary software to read or interpret?"
        },
        {
            type:"paragraph",
            path:"format",
            label:"If so, please detail software required to read the dataset"
        },
        {
            type:"paragraph",
            path:"notes",
            label:"Please add any explanatory notes to assist the RDM team"
        }
    ]
});

// Ethical considerations form specification
// Form specification: http://docs.haplo.org/dev/plugin/form/specification
var ethical = P.form({
    specificationVersion:0,
    formId: "ethicsForm",
    formTitle: "Ethics",
    elements: [
        {
            type:"boolean",
            path:"anonymised",
            style:"confirm",
            label:"I confirm that any sensitive data has been properly anonymised",
            trueLabel: "The submitter has confirmed that any sensitive data has been properly anonymised."
        },
        {
            type: "file-repeating-section",
            path: "ethicsFiles",
            label: "Ethics approval form and associated documents submitted for this research",
            allowAdd: false,
            allowDelete: false,
            elements: [{type:"file", path:"."}]
        }
    ]
});

// Multi-form document store for the above forms. Provides version and access control, and workflow integration
// Document stores: http://docs.haplo.org/dev/standard-plugin/document-store
P.IngestWorkflow.use("std:document_store", {
    name:"submissionForm",
    title: "Submission form",
    path: "/do/ingest-approval/submission",
    panel: 400,
    formsForKey: function(key) {
        return [general, ethical];
    },
    view: [{}],
    edit: [{roles:["author", "object:creator"], selector:{flags:["editForm"]}}]
});
