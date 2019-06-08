/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2019            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */

P.implementService("hres:schema:collect_indicators_project_is_current", function(project, indicators) {
    let projectIsPast = project.isKindOfTypeAnnotated("hres:annotation:past-project");
    indicators.push({
        id: "hres_schema:project_past_anotation",
        isCurrent: !projectIsPast
    });
    let anyResearcherIsPast = false;
    project.every(A.Researcher, (r) => {
        if(r.load().isKindOfTypeAnnotated("hres:annotation:past-person")) {
            anyResearcherIsPast = true;
        }
    });
    indicators.push({
        id: "hres_schema:person_past_anotation",
        isCurrent: !anyResearcherIsPast
    });
});

//TODO: Add similar reporting to collect indicators about "past" people