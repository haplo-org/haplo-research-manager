title: Data management plans
module_owner: Jenny
--

This plugin provides a basic implementation of Data Management Plans, which can be included in client workflows, with custom forms for the client. Data management plans make use of "multi-workflow docstores.":/haplo_multi_workflow_document_store

h3. Non-technical explanation of DMPs

The Data Management Plan feature allows the creation and management of DMPs within Haplo systems. The main focus of the feature is the DMP form, which can be customised to your specification. Much as, for example, ethics application forms, this form can be linked to workflow, so that a user must fill it in for the workflow to progress any further. Unlike other forms in Haplo, however, the DMP form can be used in many different workflows for a given project, so you can track what was previously submitted. Particularly useful is the ability to view the same DMP across different Haplo modules, for example, a DMP is created early in a project, reviewed during an ethics application, and then reviewed again when any outputs from the project will be published to the institutional repository. The precise times and places that the DMPs should be visible (or editable) can be customised to what is useful for your institution. 

The wording of the DMP forms can be customised to your requirements, and we can also create different versions of the DMP form for different situations. For instance, the version of the DMP form that PhD researchers and that academics fill out may be different, and this feature will support that. 

h3(service). "hres:data_management_plans:get_dmp_for_project"

This service will return the last committed version of a DMP when given the key to the form.

Arguments:

|key|Ref - The project the DMP is related to|

Usage:

<pre>language=javascript
var getResearchersFirstDMP = function(researcher) {
    let projects = O.query().
        link(T.Project, A.Type).
        link(researcher.ref, A.Researcher).
        sortByDateAscending().
        execute();

    let dmp;
    _.find(projects, (project) => {
        dmp = O.serviceMaybe("hres:data_management_plans:get_dmp_for_project", project.ref);
        return !!dmp;
    });
};
</pre>

h3(service). "hres:data_management_plans:project_has_dmp"

This service will confirm if the project given as an argument has a completed DMP associated with it.

Arguments:

|key|Ref - The project the DMP is related to|

Usage:

<pre>language=javascript
var researcherHasDMP = function(researcher) {
    let projects = O.query().
        link(T.Project, A.Type).
        link(researcher.ref, A.Researcher).
        execute();

    return !!_.find(projects, (project) => {
        return O.serviceMaybe("hres:data_management_plans:project_has_dmp", project.ref);
    });
};
</pre>

h3(service). "hres:data_management_plans:add_ref_to_dmp_dataset_for_index"

This service will add the given ref to the dataset in the DMP with the provided index in the form.

Arguments

|key|Ref - The reference of the project the DMP relates to|
|datasetIndex|Int - The index of the relevant dataset in the DMP|
|datasetRef|Ref - The ref of the dataset to link|

Usage:

<pre>language=javascript
var addNewDatasetToDMP = function(projectRef, datasetRef) {
    let dmp = O.serviceMaybe("hres:data_management_plans:get_dmp_for_project", project.ref);
    _.find(dmp.datasets, (dataset, i) => {
        // dataset_id is only available on linked datasets
        if(!dataset.dataset_id) {
            O.serviceMaybe("hres:data_management_plans:add_ref_to_dmp_dataset_for_index", projectRef, i, datasetRef);
            return true;
        }
    });
};
</pre>

h3(service). "hres:data_management_plans:expected_size_is_large"

This service checks the provided expected_size value from the datasets form and returns whether the institution defines that as a large file.

Arguments: 

|expected_size|String - the choice ID for the expected type form element|

Usage:

<pre>language=javascript
P.implementService("std:reporting:collection:projects:get_facts_for_object", function(object, row) {
    let dmp = P.getDMPCurrentDocument(object.ref),
        largeFilesExpected = false;
    _.each(dmp.datasets, (dataset) => {
        if(O.serviceMaybe("hres:data_management_plans:expected_size_is_large", dataset.expected_size)) {
            largeFilesExpected = true;
        }
    });
    row.largeFilesExpected = largeFilesExpected;
});
</pre>

**Related config data:**

h3(config). "hres:data_management_plans:large_file_choice_id"

This is the earliest choiceID for the expected_size form element for which the service above should return true. 

*Note: The expected_size form element should be listed in ascending order*

Usage:

<pre>language=json
{
    "type": "choice",
    "path": "expected_size",
    "label": "Expected size of dataset",
    "choices": [
        [
            "unknown",
            "Don't know"
        ],
        [
            "0gb4gb",
            "0GB - 4GB"
        ],
        [
            "4gb128gb",
            "4GB - 128GB"
        ],
        [
            "128gb1tb",
            "128GB - 1TB"
        ],
        [
            "1tb",
            "1TB +"
        ]
    ]
}
</pre>
If the application requires anything expected to be greater than 4GB in size to be deemed large then configuration data should be set: @"hres:data_management_plans:large_file_choice_id": "4gb128gb"@ anything selected after this choice, e.g. 1TB +, will also return true for the above service.

h3(service). "hres:data_management_plans:form_for_key"

This service lets the initial front form for the DMP to be changed on a more granular level than the replaceable form, this allows, for example, to replace the form if the DMP is being submitted for an academic project instead of a PGR one.

Arguments:

|key|Ref - The form instance key for the DMP|

Usage:

<pre>language=javascript
var pgrDMPForm = P.form("pgrDMPForm", "form/pgr_dmp.json");
var academicDMPForm = P.form("academicDMPForm", "form/academic_dmp.json");

P.implementService("hres:data_management_plans:form_for_key", function(key) {
    let object = key.load();
    if(object.first(A.Researcher)) {
        let researcherRef = object.first(A.Researcher);
        if(!researcherRef) { return; }
        let researcher = researcherRef.load();
        if(researcher.isKindOf(T.Researcher) || researcher.isKindOf(T.ResearcherPast)) {
            return academicDMPForm;
        }
        if(researcher.isKindOf(T.DoctoralResearcher) || researcher.isKindOf(T.DoctoralResearcherPast)) {
            return pgrDMPForm;
        }
    }
});
</pre>

h3(service). "hres:data_management_plans:on_dmp_commit"

This service allows for additional actions to be performed after a DMP has been committed to the document store.

Arguments:

|instance|FormInstance - The form instance that has just been committed|

Usage:

<pre>language=javascript
P.implementService("hres:data_management_plans:on_dmp_commit", function(instance) {
    if(instance.key.load().isKindOf(T.Project)) {
        O.service("std:reporting:update_required", "projects", [instance.key]);
    }
});
</pre>