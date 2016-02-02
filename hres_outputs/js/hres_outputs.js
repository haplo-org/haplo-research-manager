/* Haplo Research Manager                             http://haplo.org
 * (c) Haplo Services Ltd 2006 - 2016    http://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


var OUTPUT_TYPES = [
    T.Book,
    T.BookChapter,
    T.ConferenceItem,
    T.JournalArticle,
    T.Artefact,
    T.Audio,
    T.Composition,
    T.Dataset,
    T.Design,
    T.DevicesAndProducts,
    T.DigitalOrVisualMedia,
    T.Exhibition,
    T.OnlineEducationalResource,
    T.Patent,
    T.Performance,
    T.Report,
    T.Software,
    T.Thesis,
    T.Video
];

var OUTPUTS_TYPE_LOOKUP = O.refdictHierarchical();
OUTPUT_TYPES.forEach(function(type) { OUTPUTS_TYPE_LOOKUP.set(type, true); });

// --------------------------------------------------------------------------

P.implementService("hres:outputs:store_query", function() {
    var q = O.query();
    var sq = q.or();
    OUTPUT_TYPES.forEach(function(type) { sq.link(type, A.Type); });
    return q;
});

P.implementService("hres:outputs:each_output_type", function(iterator) {
    OUTPUT_TYPES.forEach(iterator);
});

P.implementService("hres:outputs:is_output", function(object) {
    var isOutput = true;
    object.each(A.Type, function(t) {
        if(OUTPUTS_TYPE_LOOKUP.get(t)) { isOutput = true; }
    });
    return isOutput;
});
