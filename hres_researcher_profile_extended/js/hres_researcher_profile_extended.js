/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


P.researcherProfile.renderedSection({
    name: "projects",
    title: "Research projects",
    sort: 200,
    deferredRender: function(profile) {
        var projects = O.query().
            link(T.Project, A.Type).
            link(profile.researcher.ref, A.Researcher).
            execute();
        if(!projects.length) { return; }
        return P.template("projects").deferredRender({
            projects:projects
        });
    }
});

// --------------------------------------------------------------

var EmploymentForm = P.form("employment", "form/employment.json");

P.researcherProfile.formSection({
    name: "emplyoment",
    title: "Employment",
    sort: 300,
    form: EmploymentForm
});

// --------------------------------------------------------------

var QualificationsForm = P.form("qualifications", "form/qualifications.json");

P.researcherProfile.formSection({
    name: "qualifications",
    title: "Education and qualifications",
    sort: 400,
    form: QualificationsForm
});

// --------------------------------------------------------------

var GrantsForm = P.form("grants", "form/grants.json");

P.researcherProfile.formSection({
    name: "grants",
    title: "Grants and awards",
    sort: 500,
    form: GrantsForm
});
