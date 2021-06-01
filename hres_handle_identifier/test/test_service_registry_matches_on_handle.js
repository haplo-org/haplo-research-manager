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

    let createObjectWithHandle = function(handle) {
        return O.object().
            appendType(TYPE["std:type:book"]).
            append(handle, A.Handle);
    };

    let handleOne = P.Handle.create(Math.random().toString());
    let handleTwo = P.Handle.create(Math.random().toString());
    let handleThree = P.Handle.create(Math.random().toString());

    let objectOne = createObjectWithHandle(handleOne);
    let objectTwo = createObjectWithHandle(handleTwo);
    let testList = [objectOne, objectTwo];
    let shouldMatch = createObjectWithHandle(handleTwo);
    // --------------------------------------------------------------------------

    // --------------------------------------------------------------------------
    // Matching on first Handle
    matchServices.eachService((matcher) => {
        if(matchObject) { return; }
        matchObject = O.service(matcher.name, shouldMatch, testList);
    });
    t.assert(matchObject.ref == objectTwo.ref);
    matchObject = null;
    // --------------------------------------------------------------------------

    // --------------------------------------------------------------------------
    // Matching on multiple Handles
    objectOne.append(handleTwo, A.Handle);
    matchServices.eachService((matcher) => {
        if(matchObject) { return; }
        matchObject = O.service(matcher.name, shouldMatch, testList);
    });
    t.assert(matchObject.ref == objectOne.ref);
    matchObject = null;
    // --------------------------------------------------------------------------

    // --------------------------------------------------------------------------
    // No false matching
    let shouldNotMatch = createObjectWithHandle(handleThree);
    matchServices.eachService((matcher) => {
        if(matchObject) { return; }
        matchObject = O.service(matcher.name, shouldNotMatch, testList);
    });
    t.assert(!matchObject);
    matchObject = null;
    // --------------------------------------------------------------------------
});