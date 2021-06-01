title: External researchers
--

This plugin adds support for managing external researchers. This is needed whenever an institution requires people who aren't a part of their institution to access the system.

h3(action). "hres_external_researchers:can_request_external_access"

This action determines who can give external researchers access (as available through the external researcher record in Haplo). By default, only the Administrators group can.

This action also controls who is allowed to see the dashboard for managing external researchers in the directories panel.

h3(service). "hres_external_researchers:prevent_user_access"

This service can be implemented in another plugin to prevent access to the @user@, passed in as the only argument.

h3(service). "hres_external_researchers:details_form"

An optional service that can be implemented to return a form for submitting additional details about the external researcher upon requesting access.

h3(service). "hres_external_researchers:handle_details"

If you implement the above, you should probably implement this service. It handles the details passed into the form returned above on a POST.

h3(service). "hres_external_researchers:setup_account_for_user_object"

Service that allows for automatic account setup with access for a created user object. 
Parameters: userObject and document (optional). Document parameter should be used if additional document is defined over `hres_external_researchers:details_form`. 

h3(service). "hres_external_researchers:customise_new_user_email"

Service that allows modification of the generic email template sent for new users. Custom email templates can also be sent for new users, in this case the service MUST return a spec object containing 'view' and 'template'.

Parameters: userObject, welcomeUrl, workflowFullName

Unless this email is being changed across an entire system then you must check against workflowFullName to ensure the correct service implementation is in use.

template (optional) - this MUST include welcomeUrl for the user
toName (optional) - the first name of the user
view (optional) - this will contain the welcomeUrl by default

View properties:
> replaceWelcomeToText (optional) - string - default welcome text is 'Welcome to [applicationName]' and is the first line of the email.
> removeWelcomeText (optional) - removes default welcome text if replaceWelcomeText is not used
> deferredRenderTop (optional) - deferred render - deferred render to be shown after the introductory and welcome text 
> deferredRenderBottom (optional) - deferred render - deferred render to be shown after the welcome Link 
> introductoryText (optional) - string - introductory text to be shown after the welcome text
> subject (optional) - email subject

h2. Log in

If you use this plugin, you should make sure that you make it possible for external researchers to log in with their email.

The standard way of doing this is to add the following to the client's login page template and css in the static folder:

h4. HSVT

<pre>language=javascript
std:plugin:resources("login.css")

(Client authentication option)

<div id="login-externals">
  <h3>"External researchers"</h3>
  <p><a href="/do/authentication/login?auth=haplo">"Log in with your email address&nbsp;&raquo;"</a></p>
</div>
</pre>

h4. CSS

<pre>language=javascript

#login-externals {
    margin-top: 3em;
    border-left: 4px solid #f00;
    padding: 2px 0px 8px 8px;
}

#login-externals h3 {
    margin: 0;
}

#login-externals p {
    margin: 3px 0 0 0;
}

</pre>