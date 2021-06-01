title: Researcher profiles
--

This plugin allows researchers to store information about themselves using forms split into sections, each able to be displayed (or not) on a publication. Plugins can define their own profile sections which may not require a form to display, these can all be exported into a CV pdf (optionally with different sections ofr different purposes). 

To use this plugin: 

- Depend on hres_researcher_profile
- Ensure all action panels on people objects have category: "hres:person"
- Annotate all types which should have profiles with "hres:annotation:researcher-profile:active"
- Include all profile providers for the things you're interested in, their the hres defaults or implement client specific versions.
- Set up permission levels. 

*Note: Any permission levels that restrict access & prevent publication access have their labels denied using @hUserPermissionRules@ for the group with access to publication*

<pre>language=javascript
P.hook('hUserPermissionRules', function(response, user) {
    if(user.isMemberOf(Group.PublicRepositoryAccess)) {
        response.rules.rule(Label.InternalUsersOnly, O.STATEMENT_DENY, O.PERM_ALL);
    }
});
</pre>

h2. Creating sections

h3(feature). "hres:researcher-profile"

Provides 3 functions to the using plugin: 

h3. formSection

Creates a section in the profile with a form for data entered by the user.

Delegate keys: 

|@name@|The name of section|
|@title@|The title to display over the section in the UI|
|@sort@|The sort value of the section|
|@showOnObject@|(boolean) Whether or not to show the section on the researcher's object|
|@includeInExport@|(boolean) Whether or not to include in the CV download|
|@types@|(Ref array) A list of type refs (defined with T.) for which this section is applicable to, if not defined the section applies to all|
|@form@|The "form description":https://docs.haplo.org/plugin/interface/form-description object to use for this form section|
|@prepareFormInstance@|The prepareFormInstance function that would usually be defined in the document store for this form|
|@deferredRenderForExport@|@function(profile)@ which returns a deferredRender of the section given a profile for use on exporting to a CV|
|@deferredRenderPublished@|@function(profile)@ as above but for use on a web publication|


h3. renderedFormSection

Creates a section in the profile with a form for data entered by the user. Has an additional function which allows for a custom deferredRender for the section to be provided, instead of simply outputting the document.

Delegate keys: 

|@name@|The name of section|
|@title@|The title to display over the section in the UI|
|@sort@|The sort value of the section|
|@showOnObject@|(boolean) Whether or not to show the section on the researcher's object|
|@includeInExport@|(boolean) Whether or not to include in the CV download|
|@types@|(Ref array) A list of type refs (defined with T.) for which this section is applicable to, if not defined the section applies to all|
|@form@|The "form description":https://docs.haplo.org/plugin/interface/form-description object to use for this form section|
|@prepareFormInstance@|The prepareFormInstance function that would usually be defined in the document store for this form|
|@deferredRender@|@function(profile)@ which returns a deferredRender of the section given a profile|
|@deferredRenderForExport@|@function(profile)@ as above but for use on exporting to a CV|
|@deferredRenderPublished@|@function(profile)@ as above but for use on a web publication|


h3. renderedSection

Delegate keys: 

|@name@|The name of section|
|@title@|The title to display over the section in the UI|
|@sort@|The sort value of the section|
|@showOnObject@|(boolean) Whether or not to show the section on the researcher's object|
|@includeInExport@|(boolean) Whether or not to include in the CV download|
|@types@|(Ref array) A list of type refs (defined with T.) for which this section is applicable to, if not defined the section applies to all|
|@deferredRender@|@function(profile)@ which returns a deferredRender of the section given a profile|
|@deferredRenderForExport@|@function(profile)@ as above but for use on exporting to a CV|
|@deferredRenderPublished@|@function(profile)@ as above but for use on a web publication|
|@editLink@|@function(profile)@ - for implementing a custom edit page for this section.
*NOTE* This should be used for modifying display options for data held within the application. If you need to edit the underlying data, consider using a @formSection@ or @renderedFormSection@ instead|

<br>

h4. Example usage of creation functions

<pre>language=javascript
P.researcherProfile.formSection({
    name: "biography",
    title: "Biography",
    sort: 100,
    showOnObject: true,
    form: BiographyForm,
    includeInExport: true,
    prepareFormInstance(key, form, instance, context) {
        let researcher = O.ref(key);
        let orcid = researcher.load().first(A.ORCID);
        instance.document.orcidId = orcid ? P.ORCID.url(orcid) : undefined;
    }
});
</pre>


h3. addPermissionLevel

Adds a possible permission level for granting access to the profile. These are self service by the user.

Delegate keys: 

|@label@|The Label ref (defined with Label.) to be applied to the user object if this permission level is selected. *Note: default options won't add a label*|
|@permitted@|function(user, profile) to return whether or not the given @user@ is permitted to view the given @profile@|
|@defaultFor@|(Ref array) A list of type refs(defined with T.) for which this permission level is the default option|
|@types@|(Ref array) A list of type refs (defined with T.) for which this permission level applies to specifically, if not defined then permission is available for all types|

h3. removeSectionWithName

Removes a section from a given implementation of the profiles. Should only be used for client specification modifications to the implementation. This takes a section name as an argument e.g. @removeSectionWithName("biography")@

h3. modifySectionWithName

Allows modifications to be made to a given section, to be used for client specific modifications of common code defined sections. E.g. adjusting the sort, or updating the form used, for significant changes the common code section should be removed (as above) and then a client specific section implemented.

<br>

h2. Using the profile

h3(service). "hres_researcher_profile:profile_for_researcher"

Simple retrieval service to return the profile object for a given researcher object

*Note: returns undefined if object provided isn't a type annotated with "hres:annotation:researcher-profile:active"*

Arguments: 

|@object@|The researcher object you wish to retrieve the profile for|

h3(function). userCanEdit(user)

Function which returns true if the provided user has the appropriate permissions to edit this profile.

Arguments:

|@user@|A user security principal object, typically used as @O.currentUser@|

h3(function). applicableSections(spec)

Function which returns the sections applicable to the @spec@ (if one is provided, otherwise returns all sections).

Arguments:

|@spec@|(Optional)String key which relates to an entry in the @applicableTo@ array from one of the sections, returns empty array if no sections match the spec provided|

h3(function). getSection(sectionName)

Getter function which returns the section with the provided @sectionName@ if a section with that name isn't found O.stop is called.

Arguments:

|@sectionName@|String name relating to the @name@ key in a defined section|

h3(property). document

Returns the whole document for a given profile, that is the document created by any formSections that have been filled by a user with edit permissions. This document is split into the sections by their @name@.

h4. Example usage (given section defined in creation part above)

<pre>language=javascript
let profile = O.service("hres_researcher_profile:profile_for_researcher", researcher);
let biographySection = profile.document.biography;
console.log(JSON.stringify(biographySection, null, 2));
</pre>

h3(property). history

Returns the history of the profile this behaves identically to @DocstoreInstance.history@, versioning in profiles is explained below in @updateDocument@.

h3(function). updateDocument(section, subDocument)

Updates the document for a given @section@ to the provided @subDocument@.

Arguments:

|@section@|The name of the section which the document is being updated for|
|@subDocument@|The document as appropriate for the form in the section you are updating|


h4. Example usage (given section defined in creation part above)

<pre>language=javascript
let profile = O.service("hres_researcher_profile:profile_for_researcher", researcher);
profile.updateDocument("biography", {
    preferredName: "Jonathan Doe",
    interestingFact: "Have 4 PhDs"
});
</pre>

NOTE: using @updateDocument@ will check the time of the last commit to the docstore and if there isn't a committed version or if it's been over a day since the last commit it will commit the existing current document as the current user before updating the currentDocument to the one provided to this function. 

This decision was made to enable documents to be committed relatively accurately with no further interaction from the user, as usage of the standard docstore form gathering and committing on finish editing isn't possible with profiles due to the way that they are collected/displayed.

**All functionality should user the currentDocument to ensure accuracy of data.**

h3(function). applicablePermissionLevels()

Returns the permission levels applicable to the profile.

h3(function). defaultPermissionLevel()

Returns the default permission level for the type of person object the profile belongs to

h3(function). userCanView(user)

Returns true if the given @user@ can has permission to view the profile.

Arguments:

|@user@|SecurityPrincipal object of the user to check permissions for, usually O.currentUser|

h2. Other services

h3(service). "hres_researcher_profile:user_can_edit_profile_permissions"

Implement this service to override the default permissions around who can set a user's profile permission level, omitting this service allows researcher's to self-service the profile permissions.

Arguments:

|@profile@|The profile for the researcher to check permissions for|
|@user@|The user to check the permissions for|

Example usage:

<pre>language=javascript
var CanEditProfilePermissions = O.action("example:action:can-edit-profile-permissions").
    title("Can edit profile permissions").
    allow("role", "Chief of Researcher Profile");

P.implementService("hres_researcher_profile:user_can_edit_profile_permissions", function(profile, user) {
    return user.allowed(CanEditProfilePermissions);
});
</pre>

h3(service). "hres:researcher_profile:alter_download_view"

Implement this service to alter the view passed to the download template. Not to return anything just change/add items inside the view object.

Arguments:

|@profile@|The profile for the researcher to alter the download view for|
|@view@|The default view for the given profile|

Default view:

<pre>language=javascript
let view = {
    sections: sections, // Sections applicable to this download
    researcher: researcher, // The researcher who's profile is being exported
    role: researcher.first(A.JobTitle),
    email: researcher.first(A.Email),
    department: researcher.first(A.ResearchInstitute),
    university: universities.length ? universities[0] : undefined // The institution
};
</pre>

h3(service). "hres:researcher_profile:should_prevent_publication"

Implement this service to interrupt to publication of a profile, this service is only called when an attempt to make a profile public using the AllUsers label is made, return true if theres a reason to prevent publication (taking a intermediate action such as starting an approval workflow).

Arguments:
|@profile@|The profile object that is being made public using the AllUsers label|

<pre>language=javascript
P.implementService("hres:researcher_profile:should_prevent_publication", function(profile) {
    let existingWu = O.work.query(WORK_TYPE).tag("ref", profile.ref.toString()).isEitherOpenOrClosed().latest();
    if(existingWu) {
        // If profile has been previously approved no need to prevent publication
        if(existingWu.closed && existingWu.tags.approved === "1") { return; }
        // If waiting for approval prevent publication.
        if(!existingWu.closed) { return true; }
    }
});
</pre>

h3(service). "hres:researcher_profile:act_on_permission_change"

Implement this service to take some form of action when a user changes their permissions.

Arguments:

|@researcher@|The researcher object that has had it's permissions level changed|
|@label@|The label that has been applied to enforce that permission (or would've been applied if it wasn't the default)|

h3(service). "hres:researcher_profile:notify:section_updated"

Implement this service to take some form of action when a user updates a section of their profile

Arguments:

|@profile@|The profile that has been updated|
|@section@|The section of the profile that was updated|
|@document@|The profile's current document (after the update)|

h3(service). "hres_researcher_profile:retrieve_static_file_deferred_renders"

Implement this service to provide static files to the edit page.

Arguments:

|@staticDeferreds@|The array of deferredRenders which include static files for the editing page|
|@context@|The context for the deferredRenders (view/edit) which affects which page the statics will be rendered on|

Example usage:

<pre>language=javascript
P.implementService("hres_researcher_profile:retrieve_static_file_deferred_renders", function(staticDeferreds, context) {
    if(context === "edit") {
        staticDeferreds.push(P.template("include-edit-custom-css").deferredRender());
    }
});
</pre>

Where include-edit-custom-css.hsvt contains:

<pre>std:plugin:resources("custom-edit.css")</pre>

This @custom-edit.css@ will now be loaded into the formSection editing page. Useful for poking css tweaks/jQuery into the form page.