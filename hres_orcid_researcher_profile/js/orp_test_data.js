/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2018            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


var randomORCIDlikeNumber = function() {
    var orcid = "";
    for(var x = 0; x < 4; x++) {
        for(var y = 0; y < 4; y++) {
            orcid = orcid+Math.floor(Math.random()*10);
        }
        if(x !== 3) {
            orcid = orcid+"-";
        }
    }
    return orcid;
};

P.implementService("hres_development_test_data:amend_created_person", function(generator, person) {
    
    var p = 0.3;
    if("hres:type:person:researcher" in TYPE) {
        if(person.isKindOf(TYPE["hres:type:person:researcher"])) {
            p = 0.75;
        }
    }
    if(Math.random() < p) {
        person.append(P.ORCID.create(randomORCIDlikeNumber()), A.ORCID);
    }
    
});
