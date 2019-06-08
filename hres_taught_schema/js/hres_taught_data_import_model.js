/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2019            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


P.implementService("haplo_user_sync_generic:gather_groups_and_people_types", function(groups) {
    groups.push({
        code: "hres:group:undergraduate-students",
        typeActive: T.UndergraduateStudent,
        typePast: T.UndergraduateStudentPast
    });
    groups.push({
        code: "hres:group:postgraduate-taught-students",
        typeActive: T.PostgraduateTaughtStudent,
        typePast: T.PostgraduateTaughtStudentPast
    });
});
