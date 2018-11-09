/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2018            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


P.implementService("hres:development:generate-test-data-start", function(generator) {
    generator.addUsersInGroups(2, Group.ITSupport, Group.AdminStaff);
});

P.implementService("hres:development:generate-test-data-end", function(action) {
    action(100, function(generator) {

        console.log("Generating research projects...");
        _.each(O.query().link(T.Researcher, A.Type).execute(), function(researcher) {
            var project = O.object();
            project.appendType(T.Project);
            project.appendTitle(generator.randomProjectName());
            // principal investigator
            project.append(researcher, A.Researcher, Q.PrincipalInvestigator);
            // co-investigators on a few proposals
            if(Math.random() < 0.2) {
                var sharedInstitute = researcher.first(A.ResearchInstitute);
                if(sharedInstitute) {
                    var ci = generator.randomPersonFromInstitute(sharedInstitute, T.Researcher);
                    if(ci.ref != researcher.ref) { project.append(ci, A.Researcher, Q.CoInvestigator); }
                }
            }
            project.save();
        });

    });
});
