/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */

// -------------------------------------------------------------

P.hook("hNavigationPosition", function(response, name) {
    if(name === "hres:ref-units-of-assessment" && !O.application.config["hres_ref_schema:hide_uoa_navigation"]) {
        let navigation = response.navigation;
        navigation.separator();
        navigation.link("/do/hres-ref/units-of-assessment", "REF Units of Assessment");
    }
});

P.respond("GET,POST", "/do/hres-ref/units-of-assessment", [
], function(E) {
    E.render({
        uoas: O.query().link(T.REFUnitOfAssessment, A.Type).sortByTitle().execute()
    });
});

// -------------------------------------------------------------
// TODO: Should this be on all list types?
// TODO: Replace with restriction

P.hook('hObjectRender', function(response, object) {
    if(object.first(A.ConfiguredBehaviour)) {
        response.hideAttributes.push(A.ConfiguredBehaviour);
    }
});

// -------------------------------------------------------------

P.hook('hComputeAttributes', function(response, object) {
    if(object.isKindOfTypeAnnotated('hres:annotation:ref-unit-of-assessment:copy-from-researcher')) {
        let toAdd = {};
        object.every(A.Researcher, (v,d,q) => {
            let researcher = v.load();
            researcher.every(A.REFUnitOfAssessment, (vv,dd,qq) => {
                toAdd[vv.toString()] = true;
            });
        });
        // To avoid reordering attributes unnecessarily
        let existing = {};
        object.every(A.REFUnitOfAssessment, (v,d,q) => {
            existing[v.toString()] = true;
        });
        if(!_.isEqual(toAdd, existing)) {
            O.withoutPermissionEnforcement(() => {
                object.remove(A.REFUnitOfAssessment);
                _.each(_.keys(toAdd), function(str) {
                    object.append(O.ref(str), A.REFUnitOfAssessment);
                });
            });
        }
    }
});

P.hook('hPostObjectChange', function(response, object, operation, previous) {
    if(object.isKindOf(T.Person)) {
        if(!(previous && object.valuesEqual(previous, A.REFUnitOfAssessment))) {
            O.background.run("hres_ref_schema:copy_uoa_to_linked_records", {
                ref: object.ref.toString()
            });
        }
    }
});

P.backgroundCallback("copy_uoa_to_linked_records", function(data) {
    O.withoutPermissionEnforcement(() => {    
        O.query().
            link(SCHEMA.getTypesWithAnnotation('hres:annotation:ref-unit-of-assessment:copy-from-researcher'), A.Type).
            link(O.ref(data.ref), A.Researcher).
            execute().each((obj) => {
                let mObj = obj.mutableCopy();
                mObj.computeAttributesForced();
                if(!obj.valuesEqual(mObj)) {
                    mObj.save();
                }
            });
    });
});

// -------------------------------------------------------------
// Installation schema setup

var assignPanel = function(behaviour, panel) {
    var uoa = O.behaviourRef(behaviour).load();
    if(!uoa.first(A.REFPanel)) {
        var m = uoa.mutableCopy();
        m.append(O.behaviourRef(panel), A.REFPanel);
        m.save();
    }
};

P.onInstall = function() {
    var panelA = ["hres:list:ref-unit-of-assessment-2021:1:clinical-medicine",
    "hres:list:ref-unit-of-assessment-2021:2:public-health-health-services-and-primary-care",
    "hres:list:ref-unit-of-assessment-2021:3:allied-health-professions-dentistry-nursing-and-pharmacy",
    "hres:list:ref-unit-of-assessment-2021:4:psychology-psychiatry-and-neuroscience",
    "hres:list:ref-unit-of-assessment-2021:5:biological-sciences",
    "hres:list:ref-unit-of-assessment-2021:6:agriculture-veterinary-and-food-science"];
    panelA.forEach(function(behaviour) { assignPanel(behaviour, "hres:list:ref-panel-a"); });

    var panelB = ["hres:list:ref-unit-of-assessment-2021:7:earth-systems-and-environmental-sciences",
    "hres:list:ref-unit-of-assessment-2021:8:chemistry",
    "hres:list:ref-unit-of-assessment-2021:9:physics",
    "hres:list:ref-unit-of-assessment-2021:10:mathematical-sciences",
    "hres:list:ref-unit-of-assessment-2021:11:computer-science-and-informatics",
    "hres:list:ref-unit-of-assessment-2021:12:engineering"];
    panelB.forEach(function(behaviour) { assignPanel(behaviour, "hres:list:ref-panel-b"); });

    var panelC = ["hres:list:ref-unit-of-assessment-2021:13:architecture-built-environment-and-planning",
    "hres:list:ref-unit-of-assessment-2021:14:geography-and-environmental-studies",
    "hres:list:ref-unit-of-assessment-2021:15:archaeology",
    "hres:list:ref-unit-of-assessment-2021:16:economics-and-econometrics",
    "hres:list:ref-unit-of-assessment-2021:17:business-and-management-studies",
    "hres:list:ref-unit-of-assessment-2021:18:law",
    "hres:list:ref-unit-of-assessment-2021:19:politics-and-international-studies",
    "hres:list:ref-unit-of-assessment-2021:20:social-work-and-social-policy",
    "hres:list:ref-unit-of-assessment-2021:21:sociology",
    "hres:list:ref-unit-of-assessment-2021:22:anthropology-and-development-studies",
    "hres:list:ref-unit-of-assessment-2021:23:education",
    "hres:list:ref-unit-of-assessment-2021:24:sport-and-exercise-sciences-leisure-and-tourism"];
    panelC.forEach(function(behaviour) { assignPanel(behaviour, "hres:list:ref-panel-c"); });
    
    var panelD = ["hres:list:ref-unit-of-assessment-2021:25:area-studies",
    "hres:list:ref-unit-of-assessment-2021:26:modern-languages-and-linguistics",
    "hres:list:ref-unit-of-assessment-2021:27:english-language-and-literature",
    "hres:list:ref-unit-of-assessment-2021:28:history",
    "hres:list:ref-unit-of-assessment-2021:29:classics",
    "hres:list:ref-unit-of-assessment-2021:30:philosophy",
    "hres:list:ref-unit-of-assessment-2021:31:theology-and-religious-studies",
    "hres:list:ref-unit-of-assessment-2021:32:art-and-design-history-practice-and-theory",
    "hres:list:ref-unit-of-assessment-2021:33:music-drama-dance-and-performing-arts",
    "hres:list:ref-unit-of-assessment-2021:34:communication-cultural-and-media-studies-library-and-information-management"];
    panelD.forEach(function(behaviour) { assignPanel(behaviour, "hres:list:ref-panel-d"); });
    

    var allCurrentUoAs = panelA.concat(panelB).concat(panelC).concat(panelD);
    var allUoAs = O.query().link(T.REFUnitOfAssessment, A.Type).execute();
    _.chain(allUoAs).filter((uoa) => {
        var isCurrent = _.contains(allCurrentUoAs, uoa.ref.behaviour);
        return !isCurrent;
    }).each((uoa) => {
        uoa.relabel(O.labelChanges([Label.ARCHIVED]));
    });
};
