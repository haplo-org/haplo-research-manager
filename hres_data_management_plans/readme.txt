title: Data management plans
module_owner: Jenny
--

This plugin provides a basic implementation of Data Management Plans, which can be included in client workflows, with custom forms for the client. Data management plans make use of "multi-workflow docstores.":/haplo_multi_workflow_document_store

h3. Non-technical explanation of DMPs

The Data Management Plan feature allows the creation and management of DMPs within Haplo systems. The main focus of the feature is the DMP form, which can be customised to your specification. Much as, for example, ethics application forms, this form can be linked to workflow, so that a user must fill it in for the workflow to progress any further. Unlike other forms in Haplo, however, the DMP form can be used in many different workflows for a given project, so you can track what was previously submitted. Particularly useful is the ability to view the same DMP across different Haplo modules, for example, a DMP is created early in a project, reviewed during an ethics application, and then reviewed again when any outputs from the project will be published to the institutional repository. The precise times and places that the DMPs should be visible (or editable) can be customised to what is useful for your institution. 

You will also be able to go back to completed workflows, and view the DMP as it was when the workflow was finished. For instance, if an ethics application was not approved with a particular version of the DMP, and subsequently there is a new ethics application with changes made to the DMP, you will always be able to go back to the initial ethics application, and see the version of the DMP that was not approved. You will be able to view the other versions of the DMP that have existed, so you can tell what changes have been made.

The wording of the DMP forms can be customised to your requirements, and we can also create different versions of the DMP form for different situations. For instance, the version of the DMP form that PhD researchers and that academics fill out may be different, and this feature will support that. The DMPs are also fully integrated into our workflows, so for instance, routing decisions could be made based on the data input into the form.

h3(feature). @hres:data_management_plan@

A feature that can be used by a plugin, to allow data management plans to be used by workflows defined in that plugin. Provides the config for use with "@haplo:multi-workflow-document-store@":/haplo_multi_workflow_document_store

h3(service). @hres:data_management_plan:object_is_valid_source@

Implementing this service is required for DMPs to work. Should return whether a given object is a valid source of DMPs. Source objects are those which may have workflows where DMPs can be initially created starting from them. For example, one implementation could define a valid source object as a proposal that has reached the "won" stage:

<pre>language=javascript
P.implementService("hres:data_management_plan:object_is_valid_source", function(object) {
    if(object && object.isKindOf(T.Proposal)) {
        return !!object.first(A.ProposalStage, Q.Won);
    }
});
</pre>
