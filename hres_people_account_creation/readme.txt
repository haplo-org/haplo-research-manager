title: HRES people account creation
--
h2(#overview). Overview

The HRES people account creation workflow feature supports the external user account setup for forms defined with Haplo people picker. Any workflow allowing for new external user creation should direct the workflow to the `dispatch_account_creation` state if new users creation is required.

Assignment of newly created users to the workflow/project object has to be handled on the client side.

h3(config). hres:disable_automatic_accounts_creation

Boolean value, default set to false.
Should be set to true on the client side if external user accounts should be created manually by Admin role or if external users have institutional accounts created through the User sync.

If set to default accounts for each new nominated external users will be automatically created and set with an access to the system.

h3(feature). hres_people_account_creation:external_user_setup

Implement this feature to support external users account creation in the workflow.

If accounts should be automatically created the following fields are required: finalState, documentStoreName, pickerName
If `hres:disable_automatic_accounts_creation` is set to true the following fields are required: finalState, approver, pickerName

<pre>language=javascript
EgWorkflow.use("hres_people_account_creation:external_user_setup", {
    finalState: "approved",
    approver: "phd:group:graduate-school-registry",
    documentStoreName: "egApplicationForm",
    pickerName: "demo:exams:nomination-of-examiners"
});
</pre>


h3(service). "hres_people_account_creation:create_accounts_for_picker"

This allows the accounts to be created for all of the users that would have account created for them (either manually or automatically) but at an arbitrary point.

Arguments:

|instance|The instance of the document store to create the accounts for|
|document|The document to search for the new people in when creating the accounts|

Example usage:

<pre>language=javascript
    },
    // Create account as soon as user added to people picker
    onSetCurrentDocument(instance, document, isComplete) {
        // let pickerName = ["example-picker-1", "example-picker-2"];
        _.each(pickerNames, (name) => {
            O.service("hres_people_account_creation:create_accounts_for_picker", instance.key, name, instance, document);
        });
    },
    // ...
</pre>

h3(service). "hres_people_account_creation:notify:users_created"

This service allows for code to be ran after all of the users accounts have been created.

Arguments:

|instance|The instance of the document store