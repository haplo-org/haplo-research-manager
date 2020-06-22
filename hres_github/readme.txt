title: Github integration
--

h2. Configuration data

h3(config). "hres_github:credential_name"

h4. Expected type: String - Default value: "GitHub Service"

Configuration data to set the name of the keychain entry to lookup for the GitHub OAuth credentials.

h3(config). "hres_github:requested_scope"

h4. Expected type: String - Default value: "repo"

Set to the scope of access your system needs to a user's github profile (multiple scopes can be comma separated), default is repo to allow full read/write access to repositories, including setting of webhooks. More information on GitHub scopes is available "here":https://developer.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/.

h3(config). "hres_github:safety_application_hostname"

h4. Expected type: String - No default value

This is a safety check to prevent linking of accounts to development environments, this should be set to the application hostname upon set up in a live system.

h2. Services

h3(service). "hres:github:integration:url_to_start_obtain"

Uses the Github keychain entry to create the url to start the external authentication of their github profile.

h3(service). "hres:github:integration:token_for_user"

Takes a user as an argument, and will return their GitHub access token, if and only if they have correctly authenticated with GitHub and connected their account to their Haplo profile.

h3(service). "hres:github:integration:redirect_to_access_review"

Uses the GitHub keychain entry to redirect the user to the GitHub access review page for this integration.