/* Haplo Research Manager                             http://haplo.org
 * (c) Haplo Services Ltd 2006 - 2016    http://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */

t.test(function() {

    var doi0 = P.DOI.create("12.2345");
    t.assert(doi0.toString() === "https://doi.org/12.2345");

    // ------------------------------------------------------------------------------

    var testBadDOI = function(doi) {
        var exception = false;
        try {
            P.DOI.create(doi);
        } catch(e) {
            exception = true;
        }
        t.assert(exception === true);
    };

    testBadDOI();
    testBadDOI(null);
    testBadDOI("");
    testBadDOI([]);
    testBadDOI({});
    testBadDOI(" 10.43.");
    testBadDOI("10.42. ");
    testBadDOI("10\n239");

});
