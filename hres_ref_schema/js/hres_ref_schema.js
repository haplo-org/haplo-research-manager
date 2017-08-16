/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */



P.implementService("std:reporting:discover_collections", function(discover) {
    discover("ref_unit_of_assessment", "Research Institutes", ["hierarchical"]);
});

P.implementService("std:reporting:collection:ref_unit_of_assessment:setup", function(collection) {
    collection.currentObjectsOfType(T.REFUnitOfAssessment);
});

// -------------------------------------------------------------
// Installation schema setup

P.onInstall = function() {
    // Add panel objects to     
    var uoa;
    ["hres:list:ref-unit-of-assessment:1:clinical-medicine",
    "hres:list:ref-unit-of-assessment:2:public-health-health-services-and-primary-care",
    "hres:list:ref-unit-of-assessment:3:allied-health-professions-dentistry-nursing-and-pharmacy",
    "hres:list:ref-unit-of-assessment:4:psychology-psychiatry-and-neuroscience",
    "hres:list:ref-unit-of-assessment:5:biological-sciences",
    "hres:list:ref-unit-of-assessment:6:agriculture-veterinary-and-food-science"].forEach(function(behaviour) {
        uoa = O.behaviourRef(behaviour).load();
        if(!uoa.first(A.REFPanel)) {
            var m = uoa.mutableCopy();
            m.append(O.behaviourRef("hres:list:ref-panel-a"), A.REFPanel);
            m.save();
        }
    });
    ["hres:list:ref-unit-of-assessment:7:earth-systems-and-environmental-sciences",
    "hres:list:ref-unit-of-assessment:8:chemistry",
    "hres:list:ref-unit-of-assessment:9:physics",
    "hres:list:ref-unit-of-assessment:10:mathematical-sciences",
    "hres:list:ref-unit-of-assessment:11:computer-science-and-informatics",
    "hres:list:ref-unit-of-assessment:12:aeronautical-mechanical-chemical-and-manufacturing-engineering",
    "hres:list:ref-unit-of-assessment:13:electrical-and-electronic-engineering-metallurgy-and-materials",
    "hres:list:ref-unit-of-assessment:14:civil-and-construction-engineering",
    "hres:list:ref-unit-of-assessment:15:general-engineering"].forEach(function(behaviour) {
        uoa = O.behaviourRef(behaviour).load();
        if(!uoa.first(A.REFPanel)) {
            var m = uoa.mutableCopy();
            m.append(O.behaviourRef("hres:list:ref-panel-b"), A.REFPanel);
            m.save();
        }
    });
    ["hres:list:ref-unit-of-assessment:16:architecture-built-environment-and-planning",
    "hres:list:ref-unit-of-assessment:17:geography-environmental-studies-and-archaeology",
    "hres:list:ref-unit-of-assessment:18:economics-and-econometrics",
    "hres:list:ref-unit-of-assessment:19:business-and-management-studies",
    "hres:list:ref-unit-of-assessment:20:law",
    "hres:list:ref-unit-of-assessment:21:politics-and-international-studies",
    "hres:list:ref-unit-of-assessment:22:social-work-and-social-policy",
    "hres:list:ref-unit-of-assessment:23:sociology",
    "hres:list:ref-unit-of-assessment:24:anthropology-and-development-studies",
    "hres:list:ref-unit-of-assessment:25:education",
    "hres:list:ref-unit-of-assessment:26:sport-and-exercise-sciences-leisure-and-tourism"].forEach(function(behaviour) {
        uoa = O.behaviourRef(behaviour).load();
        if(!uoa.first(A.REFPanel)) {
            var m = uoa.mutableCopy();
            m.append(O.behaviourRef("hres:list:ref-panel-c"), A.REFPanel);
            m.save();
        }
    });
    ["hres:list:ref-unit-of-assessment:27:area-studies",
    "hres:list:ref-unit-of-assessment:28:modern-languages-and-linguistics",
    "hres:list:ref-unit-of-assessment:29:english-language-and-literature",
    "hres:list:ref-unit-of-assessment:30:history",
    "hres:list:ref-unit-of-assessment:31:classics",
    "hres:list:ref-unit-of-assessment:32:philosophy",
    "hres:list:ref-unit-of-assessment:33:theology-and-religious-studies",
    "hres:list:ref-unit-of-assessment:34:art-and-design-history-practice-and-theory",
    "hres:list:ref-unit-of-assessment:35:music-drama-dance-and-performing-arts",
    "hres:list:ref-unit-of-assessment:36:communication-cultural-and-media-studies-library-and-information-management"].forEach(function(behaviour) {
        uoa = O.behaviourRef(behaviour).load();
        if(!uoa.first(A.REFPanel)) {
            var m = uoa.mutableCopy();
            m.append(O.behaviourRef("hres:list:ref-panel-d"), A.REFPanel);
            m.save();
        }
    });
};
