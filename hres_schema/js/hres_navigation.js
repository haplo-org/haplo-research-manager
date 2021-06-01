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
        var collapsable = O.application.config["hres_navigation:collapse_institutes"];

        var doneFirst = false;
        _.each(O.query().link(T.Faculty, A.Type).sortByTitle().execute(), function(institute) {
            if(-1 === exclude.indexOf(institute.ref.toString())) {
                if(!doneFirst) {
                    if(collapsable) {
                        navigation.collapsingSeparator();
                    } else {
                        navigation.separator();
                    }
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

var institutePeopleLinks;

var canSeeInstitutePeopleLinks = O.action("hres_navigation:can_see_institute_people_links").
    title("Can see institute people links").
    allow("group", Group.Everyone);

var researchInstituteLinksActionPanel = function(name, childType, childTitle, level) {
    P.implementService(name, function(display, builder) {
        if(O.currentUser.allowed(canSeeInstitutePeopleLinks)) {
            // People
            if(!institutePeopleLinks) {
                institutePeopleLinks = [
                    {sort:1000, type:T.Researcher, name:NAME("+Researcher")},
                    {sort:9000, type:T.Staff,      name:NAME("+Staff")}
                ];
                O.serviceMaybe("hres:navigation:people_types_for_research_institute_navigation", institutePeopleLinks);
            }
            var searchBase = display.object.url()+'/linked/';
            var subtypeParameters = '?sort=title&type=';
            var peoplePanel = builder.panel(200);
            institutePeopleLinks.forEach(function(p) {
                // TODO: Make this check for people a bit quicker?
                var q = O.query().link(display.object.ref).link(p.type,A.Type).limit(1).setSparseResults(true).execute();
                var rootType = SCHEMA.getTypeInfo(p.type).rootType;
                if(q.length) {
                    peoplePanel.link(p.sort, searchBase+((rootType != p.type) ? rootType+subtypeParameters : "")+p.type, p.name);
                }
            });
            if(!peoplePanel.empty) { peoplePanel.element(0, {title:"People"}); }
        }
        // Child institute
        if(childType && (P.INSTITUTE_DEPTH > level)) {
            var childInstitutes = O.query().
                link(childType, A.Type).
                link(display.object.ref, A.Parent).
                sortByTitle().execute();
            if(childInstitutes.length) {
                var exclude = (O.application.config["hres_navigation:remove_institutes_from_navigation"] || []);
                var numberOfLinks = 0;
                builder.panel(300).element("default", {title:NAME(childTitle)});
                _.each(childInstitutes, function(inst) {
                    if(exclude.indexOf(inst.ref.toString()) === -1) {
                        numberOfLinks++; 
                        if(numberOfLinks <= MAX_INSTITUTES_ON_INSTITUTE_NAVIGATION) {
                            builder.panel(300).link("default", inst.url(), inst.title);
                        }
                    }
                });
                if(numberOfLinks > MAX_INSTITUTES_ON_INSTITUTE_NAVIGATION) { 
                    builder.panel(300).link("default",
                        display.object.url()+'/linked/'+T.ResearchInstitute+'?sort=title&type='+childType,
                        "More..."
                    );
                }
            }
        }
        // Research groups
        var researchGroups = O.query().
            link(T.ResearchGroup, A.Type).
            or(function(sq) {
                sq.link(display.object.ref, A.ResearchInstitute).
                    link(display.object.ref, A.Parent);
            }).
            sortByTitle().limit(MAX_INSTITUTES_ON_INSTITUTE_NAVIGATION+1).execute();
        if(researchGroups.length) {
            builder.panel(400).element("default", {title:NAME('+Research Group')});
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
};

researchInstituteLinksActionPanel("std:action_panel:faculty_navigation", T.Department, "+Department", 1);
researchInstituteLinksActionPanel("std:action_panel:department_navigation", T.School, "+School", 2);
researchInstituteLinksActionPanel("std:action_panel:school_navigation");
researchInstituteLinksActionPanel("std:action_panel:research_group_navigation");
