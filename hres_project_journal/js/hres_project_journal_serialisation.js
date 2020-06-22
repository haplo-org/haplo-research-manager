/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2020            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


P.implementService("std:serialiser:discover-sources", function(source) {
    source({
        name: "hres:project-journal:dates",
        sort: 2050,
        setup() { },
        apply(serialiser, object, serialised) {
            let dates = O.service("hres:project_journal:dates", object.ref);
            if(dates.list.length) {
                let serialisedDates = {};
                dates.list.forEach((d) => {
                    serialisedDates[d.name] = {
                        requiredMin: serialiser.formatDate(d.requiredMin),
                        requiredMax: serialiser.formatDate(d.requiredMax),
                        requiredIsFixed: d.requiredIsFixed,
                        scheduled: serialiser.formatDate(d.scheduled),
                        actual: serialiser.formatDate(d.actual),
                        actualIndex: d.actualIndex,
                        previous: (d.previousActuals || []).map((p) => serialiser.formatDate(p))
                    };
                });
                serialised.projectJournalDates = serialisedDates;
            }
        }
    });
});

