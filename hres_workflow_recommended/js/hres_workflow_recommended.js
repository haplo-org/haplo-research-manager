/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2021            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


P.workflow.registerWorkflowFeature("hres:workflow:recommended", function(workflow) {

    // Bypass transitions should start with ~
    workflow.hasBypassTransition(/^~\w+/);

    // Default text
    workflow.text({
        // Default text for the button for actioning a task
        "action-label": "Continue"
    });

    // Standard headings in action panels, with string priority names for clarity
    workflow.panelHeading("hres:application",   "Application");
    workflow.panelHeading("hres:assessment",    "Assessment");

});

// --------------------------------------------------------------------------

P.implementService("std:action_panel_priorities", function(priorities) {
    priorities["hres:application"] = 150;
    priorities["hres:assessment"] = 300;
});

// --------------------------------------------------------------------------

// A library of recommended forms for use in workflows
var RecommendedWorkflowForms = {
    Comments: P.form("comments", "form/comments.json")
};
Object.seal(RecommendedWorkflowForms);

P.provideFeature("hres:workflow:recommended:forms", function(plugin) {
    plugin.RecommendedWorkflowForms = RecommendedWorkflowForms;
});

