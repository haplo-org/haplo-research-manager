/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


P.element("profile", "Display key sections of Researcher Profile",
    function(L) {
        var profile = new P.Profile(L.object);
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
        builder.panel(1).link("default", "/do/researcher-profile/view/"+display.object.ref, "Researcher profile");
    }
});

// --------------------------------------------------------------------------

P.respond("GET", "/do/researcher-profile/view", [
    {pathElement:0, as:"object"}
], function(E, researcher) {
    var profile = new P.Profile(researcher);
    var canEdit = profile.userCanEdit(O.currentUser);
    if(canEdit) {
        E.renderIntoSidebar({
            elements: [{href:"/do/researcher-profile/edit-section/"+researcher.ref, label:"Edit profile", indicator:"primary"}]
        }, "std:ui:panel");
    }
    E.render({
        researcher: researcher,
        sections: _.map(profile.applicableSections(), function(section) {
            var display = section.deferredRender(profile);
            return {
                show: display || canEdit,
                section: section,
                display: display
            };
        })
    });
});

// --------------------------------------------------------------------------

P.respond("GET,POST", "/do/researcher-profile/edit-section", [
    {pathElement:0, as:"object"}
], function(E, researcher) {
    var profile = new P.Profile(researcher);
    if(!profile.userCanEdit(O.currentUser)) { O.stop("Not permitted"); }
    E.render({
        researcher: researcher,
        sections: _.map(profile.applicableSections(), function(section) {
            return {
                section: section,
                editLink: section.editLink(profile),
                display: section.deferredRender(profile)
            };
        })
    }, "edit");
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
    if(!(section instanceof P.SectionForm)) { O.stop("Not a form"); }
    var document = profile.document[section.name] || {};
    var form = section.form.handle(document, E.request);
    if(form.complete) {
        // TODO: This is ugly
        profile.updateDocument(sectionName, document);
        return E.response.redirect("/do/researcher-profile/view/"+profile.ref);
    }
    E.render({
        profile: profile,
        section: section,
        form: form
    }, "edit-section-form");
});
