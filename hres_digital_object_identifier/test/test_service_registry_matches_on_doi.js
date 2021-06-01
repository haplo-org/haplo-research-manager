/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2021            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */

t.test(function() {
    // --------------------------------------------------------------------------
    // Setup
    let matchObject;
    let matchServices = O.service("haplo:service-registry:query", [
        "conforms-to hres:repository:match-item-to-existing-in-list",
        "list-of repository-items"
    ]);

    let createObjectWithDOI = function(doi) {
        return O.object().
            appendType(TYPE["std:type:book"]).
            append(doi, A.DigitalObjectIdentifierDOI);
    };

    let doiOne = P.DOI.create(Math.random().toString());
    let doiTwo = P.DOI.create(Math.random().toString());
    let doiThree = P.DOI.create(Math.random().toString());

    let objectOne = createObjectWithDOI(doiOne);
    let objectTwo = createObjectWithDOI(doiTwo);
    let testList = [objectOne, objectTwo];
    let shouldMatch = createObjectWithDOI(doiTwo);
    // --------------------------------------------------------------------------

    // --------------------------------------------------------------------------
    // Matching on first DOI
    matchServices.eachService((matcher) => {
        if(matchObject) { return; }
        matchObject = O.service(matcher.name, shouldMatch, testList);
    });
    t.assert(matchObject.ref == objectTwo.ref);
    matchObject = null;
    // --------------------------------------------------------------------------

    // --------------------------------------------------------------------------
    // Matching on multiple DOIs
    objectOne.append(doiTwo, A.DigitalObjectIdentifierDOI);
    matchServices.eachService((matcher) => {
        if(matchObject) { return; }
        matchObject = O.service(matcher.name, shouldMatch, testList);
    });
    t.assert(matchObject.ref == objectOne.ref);
    matchObject = null;
    // --------------------------------------------------------------------------

    // --------------------------------------------------------------------------
    // No false matching
    let shouldNotMatch = createObjectWithDOI(doiThree);
    matchServices.eachService((matcher) => {
        if(matchObject) { return; }
        matchObject = O.service(matcher.name, shouldNotMatch, testList);
    });
    t.assert(!matchObject);
    matchObject = null;
    // --------------------------------------------------------------------------
});