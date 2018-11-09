/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


var researchTypes = SCHEMA.getTypesWithAnnotation("hres:repository:repository-item");
researchTypes.push(T.Project);
if("Impact" in T) {
    researchTypes.push(T.Impact);
}
P.dataSource("underpinningResearch", "object-lookup", researchTypes);

var deferredRenderProjects = function(researcher, template) {
    var projects = O.query().
        link(T.Project, A.Type).
        link(researcher, A.Researcher).
        execute();
    if(!projects.length) { return; }
    return P.template(template).deferredRender({
        projects: projects
    });
};

P.researcherProfile.renderedSection({
    name: "projects",
    title: "Research projects",
    sort: 200,
    deferredRender: function(profile) {
        return deferredRenderProjects(profile.researcher.ref, "projects");
    },
    deferredRenderPublished: function(profile) {
        return deferredRenderProjects(profile.researcher.ref, "projects-published");
    }
});

// --------------------------------------------------------------

var EmploymentForm = P.form("employment", "form/employment.json");

P.researcherProfile.formSection({
    name: "emplyoment",
    title: "Employment",
    sort: 300,
    form: EmploymentForm,
    includeInExport: true,
    deferredRenderForExport: (profile, document) => {
        return P.template("export/employment").deferredRender(document);
    }
});

// --------------------------------------------------------------

var QualificationsForm = P.form("qualifications", "form/qualifications.json");

P.researcherProfile.formSection({
    name: "qualifications",
    title: "Education and qualifications",
    sort: 400,
    form: QualificationsForm,
    includeInExport: true,
    deferredRenderForExport: (profile, document) => {
        return P.template("export/qualifications").deferredRender(document);
    }
});

// --------------------------------------------------------------

var GrantsForm = P.form("grants", "form/grants.json");

P.researcherProfile.formSection({
    name: "grants",
    title: "Grants",
    sort: 500,
    form: GrantsForm
});

// --------------------------------------------------------------

var PrizesForm = P.form("prizes", "form/prizes.json");

P.researcherProfile.renderedFormSection({
    name: "prizes",
    title: "Prizes and awards",
    sort: 600,
    form: PrizesForm,
    includeInExport: true,
    deferredRender(profile, document, section) {
        return P.template("prizes").deferredRender({
            prizes: document.prizes,
            href: section.editLink(profile)
        });
    },
    deferredRenderPublished(profile, document) {
        return P.template("prizes").deferredRender({
            prizes: document.prizes
        });
    },
    deferredRenderForExport(profile, document) {
        return P.template("export/prizes").deferredRender(document);
    }
});

// --------------------------------------------------------------

var EvidenceForm = P.form("evidence", "form/evidence.json");

P.researcherProfile.formSection({
    name: "evidence",
    title: "Evidence to public body",
    sort: 700,
    form: EvidenceForm
});

// --------------------------------------------------------------

var ReviewForm = P.form("review", "form/review.json");

P.researcherProfile.formSection({
    name: "review",
    title: "External peer review",
    sort: 800,
    form: ReviewForm
});

// --------------------------------------------------------------

var ExaminationForm = P.form("examination", "form/examination.json");

P.researcherProfile.formSection({
    name: "examination",
    title: "External examination",
    sort: 900,
    form:ExaminationForm
});