/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


/*

    To use web profiles in an application:
    
        * Depend on hres_researcher_profile
        * Ensure action panels on people objects have "category":"hres:person" (the default in the schema)
        * Annotate all the types which should use profiles with hres:annotation:researcher-profile:active
        * Include all the profile providers for the things you're interested in (not included by default)

*/

// --------------------------------------------------------------------------

var CanEditAllProfiles = O.action("hres:action:researcher-profile:can-edit-all-profiles").
    title("Can edit all Researcher Profiles").
    allow("group", Group.ResearcherProfileEditors);

// --------------------------------------------------------------------------

// Which types have a profile?
P.typesWithProfile = O.refdictHierarchical();
SCHEMA.getTypesWithAnnotation('hres:annotation:researcher-profile:active').forEach(function(t) {
    P.typesWithProfile.set(t, true);
});

// --------------------------------------------------------------------------

P.implementService("hres_researcher_profile:profile_for_researcher", function(object) {
    if(P.typesWithProfile.get(object.firstType())) {
        return new Profile(object);
    }
});

// --------------------------------------------------------------------------

P.provideFeature("hres:researcher-profile", function(plugin) {
    plugin.researcherProfile = FEATURE;
});

// --------------------------------------------------------------------------

var gatherSections = [];

var FEATURE = {
    formSection: function(delegate) {
        var section = new SectionForm(delegate);
        gatherSections.push(section);
    },
    renderedSection: function(delegate) {
        var section = new SectionRendered(delegate);
        gatherSections.push(section);
    }
};

var sections; // sorted version of gathered sections
P.onLoad = function() {
    sections = _.sortBy(gatherSections, 'sort');
    Object.freeze(sections);
};

// --------------------------------------------------------------------------

// Document store for versioned JSON data (eg forms)
var ProfileDocumentStore = P.defineDocumentStore({
    name: "profile",
    keyIdType: "ref",
    formsForKey: function(key) { return []; }
});

// --------------------------------------------------------------------------

// Represents a researcher's profile
var Profile = P.Profile = function(researcher) {
    this.researcher = researcher;
    this.ref = researcher.ref;
};
Profile.prototype.userCanEdit = function(user) {
    return (user.ref == this.ref) || user.allowed(CanEditAllProfiles);
};
Profile.prototype.applicableSections = function() {
    return sections;
};
Profile.prototype.getSection = function(sectionName) {
    var section = _.find(this.applicableSections(), function(s) { return s.name === sectionName; });
    if(!section) { O.stop("Profile section not known"); }
    return section;
};
Profile.prototype.__defineGetter__("document", function() {
    if("_document" in this) { return this._document; }
    var document = ProfileDocumentStore.instance(this.ref).currentDocument; // TODO: Versions & committed documents
    this._document = document;
    return document;
});
Profile.prototype.updateDocument = function(section, subDocument) {
    var instance = ProfileDocumentStore.instance(this.ref);
    var document = instance.currentDocument;
    document[section] = subDocument || {};
    instance.setCurrentDocument(document, true);
};

// --------------------------------------------------------------------------

var Section = function() {};
Section.prototype._init = function(delegate) {
    this._delegate = delegate;
    this._checkedDelegateProperty('name');
    this._checkedDelegateProperty('title');
    this._checkedDelegateProperty('sort');
    this._showOnObject = delegate.showOnObject;
};
Section.prototype._checkedDelegateProperty = function(name) {
    var value = this._delegate[name];
    if(!value) { throw new Error("Expected property for "+name+" for researcher profile section delegate"); }
    this[name] = value;
};

Section.prototype.deferredRender = function(profile) {
    // Don't display anything by default
};
Section.prototype.deferredRenderPublished = function(profile) {
    // Don't display anything by default
};
Section.prototype.editLink = function(profile) {
    // Not editable by default
};

// --------------------------------------------------------------------------

var SectionForm = P.SectionForm = function(delegate) {
    this._init(delegate);
    this._checkedDelegateProperty('form');
};
SectionForm.prototype = new Section();

SectionForm.prototype.deferredRender = function(profile) {
    var document = profile.document[this.name];
    if(document !== undefined) {
        return this.form.instance(document).deferredRenderDocument();
    }
};

SectionForm.prototype.deferredRenderPublished = function(profile) {
    return this.deferredRender(profile);    // exactly the same rendering
};

SectionForm.prototype.editLink = function(profile) {
    return "/do/researcher-profile/edit/"+this.name+"/"+profile.ref;
};

// --------------------------------------------------------------------------

var SectionRendered = function(delegate) {
    this._init(delegate);
};
SectionRendered.prototype = new Section();

SectionRendered.prototype.deferredRender = function(profile) {
    if(this._delegate.deferredRender) {
        return this._delegate.deferredRender(profile);
    }
};

SectionRendered.prototype.deferredRenderPublished = function(profile) {
    if(this._delegate.deferredRenderPublished) {
        return this._delegate.deferredRenderPublished(profile);
    }
    return this.deferredRender(profile);
};
