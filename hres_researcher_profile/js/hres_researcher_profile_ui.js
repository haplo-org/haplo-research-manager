/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


P.element("profile", "Display key sections of Researcher Profile",
    function(L) {
        var profile = new P.Profile(L.object);
        if(!profile.userCanView(O.currentUser)) { return; }
        var sections = [];
        _.each(profile.applicableSections(), function(section) {
            if(section._showOnObject) {
                sections.push(section.deferredRender(profile));
            }
        });
        L.render({sections:sections}, "key-profile-sections");
    }
);

// --------------------------------------------------------------------------

P.implementService("std:action_panel:category:hres:person", function(display, builder) {
    if(P.typesWithProfile.get(display.object.firstType())) {
        var profile = new P.Profile(display.object);
        if(profile.userCanView(O.currentUser)) {
            let label = profile.userCanEdit(O.currentUser) ? NAME("hres:researcher_profile:link_to_edit", "Edit researcher profile") :
                NAME("hres:researcher_profile:link_to_view", "Researcher profile");
            builder.panel(1).link("default", "/do/researcher-profile/view/"+display.object.ref, label);
        }
        var userCanEditProfilePermissions = profile.userCanEdit(O.currentUser);
        if(O.serviceImplemented("hres_researcher_profile:user_can_edit_profile_permissions")) {
            userCanEditProfilePermissions = userCanEditProfilePermissions &&
                O.service("hres_researcher_profile:user_can_edit_profile_permissions", profile, O.currentUser);
        }
        if(userCanEditProfilePermissions && _.size(profile.applicablePermissionLevels()) > 1) { // Only show if user can change level
            builder.panel(1).link("default", "/do/researcher-profile/change-permission-level/"+display.object.ref, "Change profile visibility");
        }
    }
});

// --------------------------------------------------------------------------

P.respond("GET", "/do/researcher-profile/view", [
    {pathElement:0, as:"object"}
], function(E, researcher) {
    var profile = new P.Profile(researcher);
    if(!profile.userCanView(O.currentUser)) { O.stop("Not permitted"); }
    var canEdit = profile.userCanEdit(O.currentUser);
    var staticDeferreds = [];
    O.serviceMaybe("hres_researcher_profile:retrieve_static_file_deferred_renders", staticDeferreds, "view");
    E.render({
        researcher: researcher,
        canEdit: canEdit,
        sections: _.map(profile.applicableSections(), function(section) {
            var display = section.deferredRender(profile);
            var editLink = section.editLink(profile);
            return {
                show: display || (canEdit && editLink),
                section: section,
                display: display,
                editLink: canEdit ? editLink : undefined
            };
        }),
        staticDeferreds: staticDeferreds
    });
});

// --------------------------------------------------------------------------

// This is for editing form sections only
P.respond("GET,POST", "/do/researcher-profile/edit", [
    {pathElement:0, as:"string"},
    {pathElement:1, as:"object"}
], function(E, sectionName, researcher) {
    var profile = new P.Profile(researcher);
    if(!profile.userCanEdit(O.currentUser)) { O.stop("Not permitted"); }
    var section = profile.getSection(sectionName);
    if(!(section instanceof P.SectionForm || section instanceof P.SectionFormRendered)) { O.stop("Not a form"); }
    var document = profile.document[section.name] || {};
    var instance = section.form.instance(document);
    if(section.prepareFormInstance) {
        section.prepareFormInstance(researcher.ref, section.form, instance, "document");
    }
    instance.update(E.request);
    if(instance.complete) {
        // TODO: This is ugly
        profile.updateDocument(sectionName, document);
        return E.response.redirect("/do/researcher-profile/view/"+profile.ref);
    }
    var staticDeferreds = [];
    O.serviceMaybe("hres_researcher_profile:retrieve_static_file_deferred_renders", staticDeferreds, "edit");
    E.render({
        profile: profile,
        guidanceNote: section.guidanceNoteDeferred,
        section: section,
        form: instance,
        staticDeferreds: staticDeferreds
    }, "edit-section-form");
});

// --------------------------------------------------------------------------

P.respond("GET", "/do/researcher-profile/change-permission-level", [
    {pathElement:0, as:"object"}
], function(E, researcher) {
    var profile = new P.Profile(researcher);
    var userCanEditProfilePermissions = profile.userCanEdit(O.currentUser);
    if(O.serviceImplemented("hres_researcher_profile:user_can_edit_profile_permissions")) {
        userCanEditProfilePermissions = userCanEditProfilePermissions &&
            O.service("hres_researcher_profile:user_can_edit_profile_permissions", profile, O.currentUser);
    }
    if(!userCanEditProfilePermissions) { O.stop("Not permitted"); }
    var permissions = profile.applicablePermissionLevels();
    // Under 2 applicable levels means there's no room to change
    if(_.size(permissions) < 2) { O.stop("Not permitted."); }
    var currentPermissionLevelLabel = profile.permissionLevel().label.load();
    var chosenNotes = currentPermissionLevelLabel.first(A.Notes);

    E.render({
        pageTitle: "Change access level to your profile",
        backLink: "/"+researcher.ref,
        chosen: {
            label: currentPermissionLevelLabel,
            description: chosenNotes
        },
        options: _.chain(permissions).
            map((level) => {
                var label = level.label.load();
                if(currentPermissionLevelLabel.ref == label.ref) { return; }
                return {
                    action: "/do/researcher-profile/confirm-permission-change/"+researcher.ref+"/"+label.ref,
                    label: level.title || label.title,
                    indicator: "default",
                    notes: label.first(A.Notes)
                };
            }).
            compact().
            value()
    });
});

P.respond("GET,POST", "/do/researcher-profile/confirm-permission-change", [
    {pathElement:0, as:"object"},
    {pathElement:1, as:"object"}
], function(E, researcher, label) {
    if(E.request.method === "POST") {
        var profile = new P.Profile(researcher);
        if(label.ref == Label.AllUsers) {
            var shouldPrevent = O.serviceMaybe("hres:researcher_profile:should_prevent_publication", profile);
            if(shouldPrevent) { return E.response.redirect("/"+researcher.ref); }
        }
        var changes = O.labelChanges();
        _.each(profile.applicablePermissionLevels(), (level) => {
            changes.remove(level.label);
        });
        // Don't add label for default
        if(profile.defaultPermissionLevel().label != label.ref) { changes.add(label.ref); }
        O.withoutPermissionEnforcement(() => { researcher.relabel(changes); });
        O.serviceMaybe("hres:researcher_profile:act_on_permission_change", researcher, label);
        return E.response.redirect("/"+researcher.ref);
    }

    E.render({
        pageTitle: "Confirm permission change",
        backLink: "/do/researcher-profile/change-permission-level/"+researcher.ref,
        text: "Are you sure you want to change your permission level to: " + label.title + "?",
        options: [
            {
                action: "/do/researcher-profile/confirm-permission-change/"+researcher.ref+"/"+label.ref,
                label: "Change permissions"
            }
        ]
    }, "std:ui:confirm");
});
