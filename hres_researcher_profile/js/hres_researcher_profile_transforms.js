/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2018            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


P.implementService("std:action_panel:category:hres:person", function(display, builder) {
    if(P.typesWithProfile.get(display.object.firstType())) {
        builder.panel(1).link(800, "/do/researcher-profile/download-cv/"+
            display.object.ref, "Download CV");
    }
});

// --------------------------------------------------------------------------

P.respond("GET,POST", "/do/researcher-profile/download-cv", [
    {pathElement:0, as:"object"}
], function(E, researcher) {
    if(E.request.method === "POST") {
        let withBranding = !!(E.request.parameters.branding);
        let pipeline = O.fileTransformPipeline();
        // Setup pipeline
        setupPipelineForExport(researcher, pipeline, "output", withBranding);
        // Download file
        let urlForOutput = pipeline.urlForOutputWaitThenDownload("output",
            researcher.title.replace(/[^a-zA-Z0-9]+/g,'-')+"-researcher-cv.pdf", {
                pageTitle: "Download CV as PDF: "+researcher.title,
                backLink: researcher.url(),
                backLinkText: "Back"
            }
        );
        pipeline.execute();
        return E.response.redirect(urlForOutput);
    }
    E.render({
        researcher: researcher,
        backLink: researcher.url(),
        text: "Would you like download your CV as a PDF with, or without, university branding?",
        options: [
            { label: "CV only" },
            { label: "CV with branding", parameters: {branding:"1"} }
        ]
    });
});

// --------------------------------------------------------------------------

const MARGINS = {
    marginTop: 35,
    marginBottom: 35,
    marginLeft: 35,
    marginRight: 35
};

var setupPipelineForExport = function(researcher, pipeline, outputName, withBranding) {
    let profile = new P.Profile(researcher);
    let universities = O.query().link(T.University, A.Type).execute();

    let sections = _.compact(_.map(profile.applicableSections(), (s) => {
        if(s.includeInExport) {
            return {
                title: s.title,
                deferredRender: s.deferredRenderForExport(profile)
            };
        }
    }));
    
    O.serviceMaybe("hres_researcher_profile:export:additional_sections", researcher, sections);
    
    let view = {
        sections: sections,
        researcher: researcher,
        role: researcher.first(A.JobTitle),
        email: researcher.first(A.Email),
        department: researcher.first(A.ResearchInstitute),
        university: universities.length ? universities[0] : undefined
    };

    pipeline.transform("std:generate:formatted_text", {
        output: outputName,
        mimeType: "application/pdf",
        html: P.template("download-cv-formatted").render(view),
        css: P.loadFile("cv.css").readAsString(),
        marginTop: MARGINS.marginTop,
        marginBottom: MARGINS.marginBottom,
        marginLeft: MARGINS.marginLeft,
        marginRight: MARGINS.marginRight
    });

    if(withBranding) {
        // TODO
    }
};
