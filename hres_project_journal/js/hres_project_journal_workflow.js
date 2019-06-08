/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */

/*HaploDoc
node: /hres_project_journal/workflow
title: Workflow integration
--

h3(feature). "hres:project_journal:workflow_integration"

Takes a specification with properties:

* baseName - base name of date, otherwise uses name of workflow (project dates are baseName + ':start' & ':finish')
* start - selector for state considered the start of the workflow, omit to use the start of the workflow itself
* projectEntityName - the name of the entity of the project, defaults to "project"
* sortStart, sortFinish - specify exact sorting, otherwise uses sort as below
* sort - for date, with sortStart:sort, sortFinish:(sort+5)
* categories - categories of project to which this date applies
* editRequired - function(action) - passes in Action for editing the deadlines for thiis date (optional)
* canRepeat - allows the date to repeat, using .nextOccurrence() (optional)

Note: Probably can get away with just specifying a sort order for simple workflows

*/

P.workflow.registerWorkflowFeature("hres:project_journal:workflow_integration",
    function(workflow, spec) {
        spec = spec || {};
        var baseName = (spec.baseName || workflow.fullName)+':';
        var defaultSort = spec.sort || 10;
        P.registerDateDefinition({
            name: baseName+'start',
            sort: spec.sortStart || defaultSort,
            displayName: spec.customStartDisplayName || 
                    ((spec.displayName || workflow.description)+', submission'),
            categories: spec.categories,
            editRequired: spec.editRequired
        });
        P.registerDateDefinition({
            name: baseName+'finish',
            sort: spec.sortFinish || (defaultSort+5),
            displayName: spec.customFinishDisplayName || 
                    ((spec.displayName || workflow.description)+', completion'),
            categories: spec.categories,
            editRequired: spec.editRequired
        });

        var getDates = function(M) {
            var project = M.entities[(spec.projectEntityName || 'project')+'_refMaybe'];
            return project ? O.service("hres:project_journal:dates", project) : undefined;
        };

        // Update dates when started (either a start, or something matching a selector)
        var startHandler = function(M) {
            var dates = getDates(M);
            if(dates) {
                var d = dates.date(baseName+"start");
                d.setActual(new Date());
                // Commit changes
                dates.requestUpdatesThenCommitIfChanged({action:baseName+"_start"});
            }
        };
        if(spec.start) {
            workflow.observeEnter(spec.start, startHandler);
        } else {
            workflow.start(startHandler);
        }
        // Update dates when it finishes
        workflow.observeFinish({}, function(M) {
            var dates = getDates(M);
            if(dates) {
                dates.date(baseName+"finish").setActual(new Date());
                if(spec.canRepeat) {
                    // May need to update the finish date
                    // Add next occurrences here, so that deadlines can calculate based off the "previousActual"
                    // which only exists after nextOccurrence is called
                    dates.date(baseName+"finish").nextOccurrence();
                    dates.date(baseName+"start").nextOccurrence();
                }
                dates.requestUpdatesThenCommitIfChanged({action:baseName+"_finish"});
            }
        });
    }
);

// This generally should not be used. It was implemented to handle the above feature being inappropriately
// used in change requests for live clients.
P.workflow.registerWorkflowFeature("hres:project_journal:register_legacy_dates",
    function(workflow, spec) {
        spec = spec || {};
        var baseName = (spec.baseName || workflow.fullName)+':';
        var defaultSort = spec.sort || 10;
        P.registerDateDefinition({
            name: baseName+'start',
            sort: spec.sortStart || defaultSort,
            displayName: spec.customStartDisplayName || 
                    ((spec.displayName || workflow.description)+', submission'),
            categories: spec.categories,
            editRequired: spec.editRequired,
            notForDisplay: true
        });
        P.registerDateDefinition({
            name: baseName+'finish',
            sort: spec.sortFinish || (defaultSort+5),
            displayName: spec.customFinishDisplayName || 
                    ((spec.displayName || workflow.description)+', completion'),
            categories: spec.categories,
            editRequired: spec.editRequired,
            notForDisplay: true
        });
});