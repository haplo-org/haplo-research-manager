/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2018            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


var refUnits;
P.implementService("hres_development_test_data:amend_created_person", function(generator, person) {
    if(!refUnits) { refUnits = O.query().link(T.REFUnitOfAssessment, A.Type).execute(); }
    if(Math.random() < 0.8) {
        person.append(generator.randomListMember(refUnits), A.REFUnitOfAssessment);
    }
});

P.implementService("hres:development:generate-test-data-end", function(action) {
    action(20, function(generator) {
        let researchers = O.query().link(T.Researcher, A.Type).execute();
        _.each(refUnits, (refUnit) => {
            if(Math.random() < 0.9) {
                let mRefUnit = refUnit.mutableCopy();
                mRefUnit.append(generator.randomListMember(researchers), A.Head);
                mRefUnit.save();
            }
        });
    });
});
