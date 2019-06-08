title: HRES External researchers
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