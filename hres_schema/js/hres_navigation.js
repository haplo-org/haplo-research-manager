/* Haplo Research Manager                             http://haplo.org
 * (c) Haplo Services Ltd 2006 - 2016    http://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


var MAX_INSTITUTES_ON_INSTITUTE_NAVIGATION = 7;

// --------------------------------------------------------------------------

P.hook('hNavigationPosition', function(response, name) {
    if(name === "hres:institutes") {
        var navigation = response.navigation;

        var exclude = (O.application.config["hres_navigation:remove_institutes_from_navigation"] || []);

        var doneFirst = false;
        _.each(O.query().link(T.Faculty, A.Type).sortByTitle().execute(), function(institute) {
            if(-1 === exclude.indexOf(institute.ref.toString())) {
                if(!doneFirst) {
                    navigation.separator();
                    var parentRef = institute.firstParent();
                    if(parentRef) {
                        var parent = parentRef.load();
                        navigation.link(parent.url(), parent.title);
                    }
                }
                doneFirst = true;
                navigation.link(institute.url(), institute.title);
            }
        });
    }
});

P.onResearchInstituteChange.push(function() {
    O.reloadNavigation();
});

// --------------------------------------------------------------------------

P.implementService("std:action_panel:faculty_navigation", function(display, builder) {
    if(P.INSTITUTE_DEPTH > 1) {
        var departments = O.query().
            link(T.Department, A.Type).
            link(display.object.ref, A.Parent).
            sortByTitle().execute();
        if(departments.length) {
            var exclude = (O.application.config["hres_navigation:remove_institutes_from_navigation"] || []);
            var numberOfLinks = 0;
            builder.panel(300).element("default", {title:NAME('+Department')});
            _.each(departments, function(dept) {
                if(exclude.indexOf(dept.ref.toString()) === -1) {
                    numberOfLinks++; 
                    if(numberOfLinks < MAX_INSTITUTES_ON_INSTITUTE_NAVIGATION) {
                        builder.panel(300).link("default", dept.url(), dept.title);
                    }
                }
            });
            if(numberOfLinks > MAX_INSTITUTES_ON_INSTITUTE_NAVIGATION) { 
                builder.panel(300).link("default",
                    display.object.url()+'/linked/'+T.ResearchInstitute+'?sort=title&type='+T.Department,
                    "More..."
                );
            }
        }
    }
    var researchGroups = O.query().
        link(T.ResearchGroup, A.Type).
        or(function(sq) {
            sq.link(display.object.ref, A.ResearchInstitute).
                link(display.object.ref, A.Parent);
        }).
        sortByTitle().limit(MAX_INSTITUTES_ON_INSTITUTE_NAVIGATION+1).execute();
    if(researchGroups.length) {
        builder.panel(400).element("default", {title:NAME('+ResearchGroup')});
        _.each(researchGroups, function(rg) {
            builder.panel(400).link("default", rg.url(), rg.title);
        });
        if(researchGroups.length > MAX_INSTITUTES_ON_INSTITUTE_NAVIGATION) { 
            builder.panel(400).link("default",
                display.object.url()+'/linked/'+T.ResearchInstitute+'?sort=title&type='+T.ResearchGroup,
                "More..."
            ); 
        }
    }
});
