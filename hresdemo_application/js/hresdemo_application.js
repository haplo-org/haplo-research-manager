/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


var HomePageInstructions = P.guidanceNote("repository", "home-page-instructions", "Home page instructions", "home.xml");

P.element("home", "Home page introduction",
    function(L) {
        // Choose some researchers to suggest the user impersonates
        var researchers = P.data.impersonateResearchers || [];
        if(researchers.length === 0) {
            var researcherProfiles = O.query().link(T.Researcher, A.Type).execute();
            if(researcherProfiles.length) {
                var safety = 256;
                while(--safety > 0 && (researchers.length < 3)) {
                    var researcher = researcherProfiles[Math.floor(researcherProfiles.length * Math.random())];
                    if(researcher && -1 === researchers.indexOf(researcher.ref.toString())) {
                        researchers.push(researcher.ref.toString());
                    }
                }
                P.data.impersonateResearchers = researchers;
            }
        }

        L.render({
            instructions: HomePageInstructions.deferredRender(),
            tryImpersonating: {
                researchers: _.map(researchers, function(r) { return O.ref(r); })
            }
        });
    }
);
