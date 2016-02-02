/* Haplo Research Manager                             http://haplo.org
 * (c) Haplo Services Ltd 2006 - 2016    http://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


// https://github.com/dylang/node-xml
// MIT License
P.implementService("hres_thirdparty_libs:generate_xml", function(/* arguments */) {
    return P.xml.apply(this, arguments);
});


// https://github.com/isaacs/sax-js
// ISC License + MIT License
P.implementService("hres_thirdparty_libs:sax_parser", function() {
    return P.sax.parser(true/* strict */);
});
