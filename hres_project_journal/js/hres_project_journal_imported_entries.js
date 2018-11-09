/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2018            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */

/*HaploDoc
node: /hres_project_journal/imported_entries
title: Imported journal entries
sort: 1
--

h3(feature). @hres:project_journal_imported_entries@

For many clients, we want to import historical events, such as suspensions, exams, and progress meetings. These should appear in the project history, despite no workflow existing for them in the system.

The standard way of displaying these is to have a short entry in the project history, with a form displayed with extras details on clicking through. This feature deals with all of the boiler plate for setting this up.

Call @P.hresImportedJournalEntries(spec)@ where spec has:

| @prefix@ | The prefix for all implementations, e.g. @example_import@ |
| @implementations@ | A list of implementation objects |

Implementations should have:

| @kind@ | The kind of entry they are, e.g. exam |
| @kindDisplayName@ | The displable version of the kind name, e.g. Examination |
| @form@ | A form definition to display when clicking through |
| @renderSmall@ | A function which takes a row object, and returns a deferred render suitable for the project history page |
| @link@ | (optional) A function which takes a row object and returns a link. The default behaviour is to return a link to a page displaying the form with the data from this entry. In most circumstances this will be suitable. If you want, for example, to link to a different entry, provide a link function. |

h3. Example usage

<pre>
P.hresImportedJournalEntries({
    prefix: "example_import",
    implementations: [
        {
            kind: "exam",
            kindDisplayName: "Examination",
            form: P.form("exampleExamForm", "form/imported_exam.json"),
            renderSmall(row) {
                return P.template("journal/exam").deferredRender();
            }
        }
    ]
});
</pre>

*/

var forms = {};

var getLinkFunction = function(kind) {
    return function(row) {
        return "/do/hres-project-journal/imported-journal-entry/"+kind+"/"+row.project+"/"+row.identifier;
    };
};

P.provideFeature("hres:project_journal_imported_entries", function(plugin) {
    plugin.hresImportedJournalEntries = function(spec) {
        let prefix = spec.prefix;
        _.each(spec.implementations, (implementation) => {
            let fullName = prefix+":"+implementation.kind;
            forms[fullName] = implementation.form;
            let link = implementation.link || getLinkFunction(implementation.kind);
            plugin.implementService("hres:project_journal:get_implementation:"+fullName, function() {
                return {
                    kindDisplayName: implementation.kindDisplayName,
                    link: link,
                    renderSmall: implementation.renderSmall
                };
            });
        });
    };
});

var getJournalRow = function(project, kind, identifier) {
    let select = O.service("hres:project_journal:select", {
        project:project.ref,
        kind:kind
    });
    select.where("identifier", "=", identifier);
    return select[0];
};

var getForm = function(implementation) {
    let form = forms[implementation];
    if(!form) {
        O.stop("Unknown implementation.");
    }
    return form;
};

P.respond("GET", "/do/hres-project-journal/imported-journal-entry", [
    {pathElement:0, as:"string"},
    {pathElement:1, as:"object"},
    {pathElement:2, as:"string"}
], function(E, kind, project, identifier) {
    let row = getJournalRow(project, kind, identifier);
    let document = row.data;
    let form = getForm(row.implementation);
    let instance = form.instance(document);
    E.render({
        kind: kind,
        date: row.datetime,
        project: project,
        form: instance
    });
});