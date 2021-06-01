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
        * Configure permission levels

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

P.implementService("hres_researcher_profile:profile_for_researcher", function(object, withoutPermissionEnforcement) {
    if(P.typesWithProfile.get(object.firstType())) {
        var profile = new Profile(object);
        if(withoutPermissionEnforcement || profile.userCanView(O.currentUser)) {
            return profile;
        }
    }
});

// --------------------------------------------------------------------------

P.provideFeature("hres:researcher-profile", function(plugin) {
    plugin.researcherProfile = FEATURE;
});

// --------------------------------------------------------------------------

var gatherSections = [];
var gatherPermissionLevels = {};
var removeSections = [];
var modifySections = {};

var FEATURE = {
    formSection: function(delegate) {
        var section = new SectionForm(delegate);
        gatherSections.push(section);
    },
    renderedSection: function(delegate) {
        var section = new SectionRendered(delegate);
        gatherSections.push(section);
    },
    renderedFormSection: function(delegate) {
        var section = new SectionFormRendered(delegate);
        gatherSections.push(section);
    },
    removeSectionWithName: function(name) {
        removeSections.push(name);
    },
    modifySectionWithName: function(name, delegate) {
        if(!(name in modifySections)) { modifySections[name] = []; }
        modifySections[name].push(delegate);
    },
    addPermissionLevel: function(delegate) {
        gatherPermissionLevels[delegate.label] = delegate;
    }
};

var sections; // sorted version of gathered sections
var permissionLevels;
P.onLoad = function() {
    permissionLevels = gatherPermissionLevels;
    sections = _.chain(gatherSections).
        reject((section) => _.contains(removeSections, section.name)).
        map((section) => {
            if(section.name in modifySections) {
                var newDelegate = section._delegate;
                _.each(modifySections[section.name], function(delegate) {
                    newDelegate = _.extend(newDelegate, delegate);
                });
                if(section instanceof SectionForm) {
                    return new SectionForm(newDelegate);
                } else if(section instanceof SectionRendered) {
                    return new SectionRendered(newDelegate);
                } else if(section instanceof SectionFormRendered) {
                    return new SectionFormRendered(newDelegate);
                }
            }
            return section;
        }).
        sortBy('sort').
        value();
    Object.freeze(sections);
    Object.freeze(permissionLevels);
    if(_.isEmpty(permissionLevels)) { console.log("WARNING: No permission levels defined, using person object read permissions instead."); }
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
    return _.filter(sections, (section) => {
        // No types defined: Applicable to all types
        return !section.types || _.find(section.types, (type) => this.researcher.isKindOf(O.ref(type)));
    });
};
Profile.prototype.applicablePermissionLevels = function() {
    return _.filter(permissionLevels, (level) => {
        // No types defined: Applicable to all types
        return !level.types || _.find(level.types, (type) => this.researcher.isKindOf(O.ref(type)));
    });
};
Profile.prototype.getSection = function(sectionName) {
    var section = _.find(this.applicableSections(), function(s) { return s.name === sectionName; });
    if(!section) { O.stop("Profile section not known"); }
    return section;
};
Profile.prototype.__defineGetter__("document", function() {
    if("_document" in this) { return this._document; }
    var document = ProfileDocumentStore.instance(this.ref).currentDocument;
    this._document = document;
    return document;
});
Profile.prototype.updateDocument = function(section, subDocument) {
    var instance = ProfileDocumentStore.instance(this.ref);
    if(!instance.hasCommittedDocument ||
        (new XDate(instance.committedVersionNumber).clearTime().getTime() < XDate.today().getTime())) {
            instance.commit(O.currentUser);
    }
    var document = instance.currentDocument;
    document[section] = subDocument || {};
    instance.setCurrentDocument(document, true);
    O.serviceMaybe("hres_researcher_profile:notify:section_updated", this, section, document);
};
Profile.prototype.__defineGetter__("history", function() {
    if("_history" in this) { return this._history; }
    var instance = ProfileDocumentStore.instance(this.ref);
    this._history = instance.history;
    return instance.history;
});
Profile.prototype.defaultPermissionLevel = function() {
    return _.find(permissionLevels, (level, label) => {
        var levelIsDefaultForResearcher = _.any(level.defaultFor, (type) => {
            return this.researcher.isKindOf(type);
        });
        return levelIsDefaultForResearcher;
    });
};
Profile.prototype.permissionLevel = function() {
    var chosenLevelForProfile = _.find(permissionLevels, (level, label) => {
        return this.researcher.labels.includes(O.ref(label));
    });
    return chosenLevelForProfile || this.defaultPermissionLevel();
};
Profile.prototype.userCanView = function(user) {
    var permissionLevelsConfigured = !_.isEmpty(permissionLevels);
    var canView = permissionLevelsConfigured ?
        this.permissionLevel().permitted(user, this) :
        // Default to object read permission if no profile permission levels are configured
        user.canRead(this.researcher);
    return !!(this.userCanEdit(user) || canView);
};

// --------------------------------------------------------------------------

var Section = function() {};
Section.prototype._init = function(delegate) {
    this._delegate = delegate;
    this._checkedDelegateProperty('name');
    this._checkedDelegateProperty('title');
    this._checkedDelegateProperty('sort');
    this._showOnObject = delegate.showOnObject;
    this.includeInExport = delegate.includeInExport;
    this.types = delegate.types;
    this.guidanceNoteDeferred = delegate.guidanceNoteDeferred;
};
Section.prototype._checkedDelegateProperty = function(name) {
    var value = this._delegate[name];
    if(!value) { throw new Error("Expected property for "+name+" for researcher profile section delegate"); }
    this[name] = value;
};

Section.prototype.deferredRender = function(profile) {
    // Don't display anything by default
};
Section.prototype.deferredRenderForExport = function(profile) {
    // Don't display anything by default
};
Section.prototype.deferredRenderPublished = function(profile, context, options) {
    // Don't display anything by default
};
Section.prototype.editLink = function(profile) {
    // Not editable by default
};
Section.prototype.makeView = function(profile) {
    // No view returned by default
};

// --------------------------------------------------------------------------

var SectionForm = P.SectionForm = function(delegate) {
    this._init(delegate);
    this._checkedDelegateProperty('form');
    this.prepareFormInstance = delegate.prepareFormInstance;
};
SectionForm.prototype = new Section();

SectionForm.prototype.deferredRender = function(profile) {
    var document = profile.document[this.name];
    if(document !== undefined) {
        var instance = this.form.instance(document);
        if(this.prepareFormInstance) {
            this.prepareFormInstance(profile.ref, this.form, instance, "document");
        }
        return instance.deferredRenderDocument();
    }
};

SectionForm.prototype.deferredRenderForExport = function(profile) {
    return this._delegate.deferredRenderForExport ?
        this._delegate.deferredRenderForExport(profile, profile.document[this.name]) :
        this.deferredRender(profile);       // fallback to default
};

SectionForm.prototype.deferredRenderPublished = function(profile, context, options) {
    // Publisher is always special, so this can be overridden.
    if(this._delegate.deferredRenderPublished) {
        return this._delegate.deferredRenderPublished(profile, context, options);
    }
    return this.deferredRender(profile);    // exactly the same rendering
};

SectionForm.prototype.makeView = function(profile) {
    var document = profile.document[this.name];
    if(document !== undefined) {
        var instance = this.form.instance(document);
        if(this.prepareFormInstance) {
            this.prepareFormInstance(profile.ref, this.form, instance, "document");
        }
        return instance.makeView();
    }
};

SectionForm.prototype.editLink = function(profile) {
    return "/do/researcher-profile/edit/"+this.name+"/"+profile.ref;
};

// --------------------------------------------------------------------------

var SectionFormRendered = P.SectionFormRendered = function(delegate) {
    this._init(delegate);
    this._checkedDelegateProperty('form');
};
SectionFormRendered.prototype = new Section();

SectionFormRendered.prototype.deferredRender = function(profile) {
    var document = profile.document[this.name];
    if(document !== undefined) {
        return this._delegate.deferredRender(profile, document, this);
    }
};

SectionFormRendered.prototype.deferredRenderPublished = function(profile, context, options) {
    var document = profile.document[this.name];
    if(document !== undefined) {
        if(this._delegate.deferredRenderPublished) {
            return this._delegate.deferredRenderPublished(profile, document, context, options);
        }
        return this.deferredRender(profile);
    }
};

SectionFormRendered.prototype.deferredRenderForExport = function(profile) {
    return this._delegate.deferredRenderForExport ?
        this._delegate.deferredRenderForExport(profile, profile.document[this.name]) :
        this.deferredRender(profile);       // fallback to default
};

SectionFormRendered.prototype.makeView = function(profile) {
    var document = profile.document[this.name];
    if(document !== undefined) {
        var instance = this.form.instance(document);
        if(this.prepareFormInstance) {
            this.prepareFormInstance(profile.ref, this.form, instance, "document");
        }
        return instance.makeView();
    }
};

SectionFormRendered.prototype.editLink = function(profile) {
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

SectionRendered.prototype.deferredRenderForExport = function(profile) {
    return this._delegate.deferredRenderForExport ?
        this._delegate.deferredRenderForExport(profile) :
        this.deferredRender(profile);       // fallback to default
};

SectionRendered.prototype.deferredRenderPublished = function(profile, context, options) {
    if(this._delegate.deferredRenderPublished) {
        return this._delegate.deferredRenderPublished(profile, context, options);
    }
    return this.deferredRender(profile);
};

SectionRendered.prototype.editLink = function(profile) {
    // Not editable by default, unless implemented specifically in the delegate
    if(this._delegate.editLink) {
        return this._delegate.editLink(profile);
    }
};

// --------------------------------------------------------------------------
// Migration service
// --------------------------------------------------------------------------

P.implementService("hres_researcher_profile:migrate:add_document_to_profile", function(researcherRef, document) {
    var instance = ProfileDocumentStore.instance(researcherRef);
    instance.setCurrentDocument(document, true);
});
