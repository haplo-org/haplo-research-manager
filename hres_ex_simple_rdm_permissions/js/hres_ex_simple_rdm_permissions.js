/* Haplo Research Manager                             http://haplo.org
 * (c) Haplo Services Ltd 2006 - 2016    http://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


/*

    This is an example permission system which uses code to describe the
    access rules for a very simple RDM application.

    A real Haplo application will contain many different activities,
    so will want to use a pluggable permission system. This, however,
    illustrates the basics of labelling and permission rules.

    The rules are:

    * Everyone can see everything apart from Datasets.

    * Anyone can see and edit items that they submitted, or for which they're
      listed as an author.

    * Everyone can see Datasets if they have have been accepted into the
      repository.

    * Datasets that have been accepted into the Repository can only be
      edited by members of the Research Data Managers group.

    * Everyone can see classfication objects (eg Subject taxonomies),
      and members of the Classification Editors groups can maintain the
      taxonomies.

*/

// --------------------------------------------------------------------------

// How to label objects in this permissions scheme
var addLabels = function(changes, object) {
    // Label object with Type and Author
    // Use the with-parents option on each, so type hierarchy is respected,
    // and on author, so corporate authors include the organisation hierarchy
    object.every(A.Type,   function(type)   { changes.add(type, "with-parents"); });
    object.every(A.Author, function(author) { changes.add(author, "with-parents"); });
    // Label object with creator
    var creationUser = O.user(object.creationUid);
    if(creationUser.ref) {
        changes.add(creationUser.ref);
    }
    // Type specific labelling
    if(object.isKindOf(T.Dataset)) {
        // No other labels needed for datasets, access is controlled
        // via the Type and AcceptedIntoRepository labels
    } else {
        // Label with Output if it's an output
        if(O.service("hres:outputs:is_output", object)) {
            changes.add(Label.Output);
        }
    }
};

// Rules for access control using the labels
P.hook("hUserPermissionRules", function(response, user) {
    // Explicitly state rules for system and classification (eg Subject) objects
    response.rules.add(Label.STRUCTURE, O.STATEMENT_ALLOW, O.PERM_READ);
    response.rules.add(Label.CONCEPT, O.STATEMENT_ALLOW, O.PERM_READ);
    // Allow classification editors to edit taxonomies etc
    if(user.isMemberOf(Group.ClassificationEditors)) {
        response.rules.add(Label.CONCEPT, O.STATEMENT_ALLOW, O.PERM_ALL);
    }
    // Allow user to read/write anything they created
    if(user.ref) {
        response.rules.add(user.ref, O.STATEMENT_ALLOW, O.PERM_ALL);
    }
    // Special rules for Dataset
    if(user.isMemberOf(Group.ResearchDataManagers)) {
        // Repo managers: do anything with datasets
        response.rules.add(T.Dataset, O.STATEMENT_ALLOW, O.PERM_ALL);
    } else {
        // Others: allow creation of datasets (read will be permitted by the person labels)
        response.rules.add(T.Dataset, O.STATEMENT_ALLOW, O.PERM_CREATE);
        // Just allow accepted items submitted by other users to be read
        response.rules.add(Label.AcceptedIntoRepository, O.STATEMENT_ALLOW, O.PERM_READ);
    }
    // Everyone can create outputs
    response.rules.add(Label.Output, O.STATEMENT_ALLOW, O.PERM_READ | O.PERM_CREATE);
    // Everyone can read people and organisations
    response.rules.add(T.Person, O.STATEMENT_ALLOW, O.PERM_READ);
    response.rules.add(T.Organisation, O.STATEMENT_ALLOW, O.PERM_READ);
});

// --------------------------------------------------------------------------

// Mechanics to apply labels and keep them updated.

// Haplo labelling, by default, labels on creation and then requires explicit relabelling.
// However, in this permission scheme, we need to be relabel on update to keep author
// labels up-to-date when changed.
var replaceLabels = function(changes, object) {
    // Keep the 'label' labels only
    var keep = object.labels.filterToLabelsOfType([T.Label]);
    // Respect any explicit requests to change the labels by using the given changes to change the keep list
    keep = changes.change(keep);
    // Then change the changes to remove all the current labels except the keep labels
    changes.remove(object.labels);
    changes.add(keep);
    // Add all the 'content' labels configured by the other plugins
    addLabels(changes, object);
};

P.hook("hLabelObject", function(response, object) {
    addLabels(response.changes, object);
});

P.hook("hLabelUpdatedObject", function(response, object) {
    replaceLabels(response.changes, object);
});

