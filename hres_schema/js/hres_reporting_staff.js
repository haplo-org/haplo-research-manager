/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2021            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


P.implementService("std:reporting:discover_collections", function(discover) {
    discover("staff", "Staff", ["hres:people"]);
});

P.implementService("std:reporting:collection:staff:setup", function(collection) {
    collection.
        currentObjectsOfType(T.Staff).
        fact("researchInstitute",       "ref",          NAME("Research Institute")).
        fact("contactCategory",         "ref",          NAME("Contact category")).
        fact("jobTitle",                "text",         "Job title");
});

P.implementService("std:reporting:collection:staff:get_facts_for_object", function(object, row, collection) {
    row.researchInstitute = object.first(A.ResearchInstitute);
    row.contactCategory = object.first(A.Type);

    let jobTitleMaybe = object.first(A.JobTitle);
    row.jobTitle = jobTitleMaybe ? jobTitleMaybe.s() : null;
});