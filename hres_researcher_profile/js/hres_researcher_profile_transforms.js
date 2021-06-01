/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2018            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */

const MARGINS = {
    marginTop: 35,
    marginBottom: 35,
    marginLeft: 35,
    marginRight: 35
};
var GENERIC_CV = {
    kind: "generic",
    title: "Generic",
    setupPipelineForExport(profile, pipeline, mimeType) {
        let universities = O.query().link(T.University, A.Type).execute();
        let sections = _.compact(_.map(profile.applicableSections(), (s) => {
            if(s.includeInExport && s.deferredRenderForExport(profile)) {
                return {
                    title: s.title,
                    deferredRender: s.deferredRenderForExport(profile)
                };
            }
        }));
        
        // TODO: Delete? Not used
        // O.serviceMaybe("hres_researcher_profile:export:add_remove_sections", researcher, sections, downloadSpec);
        
        let view = {
            sections: sections,
            researcher: profile.researcher,
            role: profile.researcher.first(A.JobTitle),
            email: profile.researcher.first(A.Email),
            department: profile.researcher.first(A.ResearchInstitute),
            university: universities.length ? universities[0] : undefined
        };
        O.serviceMaybe("hres:researcher_profile:alter_download_view", profile, view);
        pipeline.transform("std:generate:formatted_text", {
            output: "output",
            mimeType: mimeType,
            html: P.template("download-cv-formatted").render(view),
            css: P.loadFile("cv.css").readAsString(),
            marginTop: MARGINS.marginTop,
            marginBottom: MARGINS.marginBottom,
            marginLeft: MARGINS.marginLeft,
            marginRight: MARGINS.marginRight
        });
    }
};

var layouts;
var cvLayoutsByKind;
var _ensureLayouts = function() {
    if(layouts) { return; }
    layouts = [GENERIC_CV];
    O.serviceMaybe("hres_researcher_profile:discover:cv_layouts", layouts);

    cvLayoutsByKind = {};
    _.each(layouts, (p) => {
        cvLayoutsByKind[p.kind] = p;
    });
};

// --------------------------------------------------------------------------

P.implementService("std:action_panel:category:hres:person", function(display, builder) {
    if(O.application.config["hres:researcher_profile:prevent_cv_download"]) { return; }
    _ensureLayouts();
    if(P.typesWithProfile.get(display.object.firstType())) {
        if((new P.Profile(display.object)).userCanView(O.currentUser)) {
            if(layouts.length === 1) {
                builder.panel(1).link(800, "/do/researcher-profile/download-cv/"+
                    display.object.ref, "Download CV");
            } else {
                builder.panel(1).link(800, "/do/researcher-profile/choose-cv-layout/"+
                    display.object.ref, "Download CV");
            }
        }
    }
});

// --------------------------------------------------------------------------

P.respond("GET,POST", "/do/researcher-profile/choose-cv-layout", [
    {pathElement:0, as:"object"}
], function(E, researcher) {
    _ensureLayouts();
    let baseURL = "/do/researcher-profile/download-cv/"+researcher.ref;
    E.render({
        pageTitle: "Download CV",
        backLink: researcher.url(),
        options: _.map(layouts, (layout) => {
            return {
                action: baseURL+"?kind="+layout.kind,
                label: layout.title,
                note: layout.notes
            };
        })
    }, "std:ui:choose");
});

P.respond("GET,POST", "/do/researcher-profile/download-cv", [
    {pathElement:0, as:"object"},
    {parameter:"kind", as:"string", optional:true}
], function(E, researcher, kind) {
    _ensureLayouts();
    if(!kind) { kind = "generic"; }
    let cvLayout = cvLayoutsByKind[kind];
    if(!cvLayout) { O.stop("Bad CV kind requested."); }
    let profile = new P.Profile(researcher);
    if(!profile.userCanView(O.currentUser)) { O.stop("Not permitted."); }

    if(E.request.method === "POST") {
        let pipeline = O.fileTransformPipeline();
        // Setup pipeline
        let asWordFile = !!(E.request.parameters.word);
        let mimeType = asWordFile ? "application/msword" : "application/pdf";
        cvLayout.setupPipelineForExport(profile, pipeline, mimeType);
        // Download file
        let filename = researcher.title.replace(/[^a-zA-Z0-9]+/g,'-')+"-researcher-cv";
        filename = asWordFile ? filename+".doc" : filename+".pdf";
        let urlForOutput = pipeline.urlForOutputWaitThenDownload("output", filename, {
            pageTitle: "Download CV: "+researcher.title,
            backLink: researcher.url(),
            backLinkText: "Back"
        });
        pipeline.execute();
        return E.response.redirect(urlForOutput);
    }
    let options = [
        { label: "as PDF" },
        { label: "as MS Word file", parameters: {word:"1"} }
    ];
    // TODO: Delete? Not used
    // O.serviceMaybe("hres_researcher_profile:export:change_options", options);
    E.render({
        researcher: researcher,
        backLink: researcher.url(),
        text: "Would you like download your CV as a PDF or Microsoft Word file?",
        options: options
    });
});
