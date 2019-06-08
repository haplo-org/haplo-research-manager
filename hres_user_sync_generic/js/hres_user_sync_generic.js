/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2019            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


P.implementService("haplo_user_sync_generic:gather_groups_and_people_types", function(groups) {
    groups.push({
        code: "hres:group:researchers",
        typeActive: T.Researcher,
        typePast: T.ResearcherPast
    });
    groups.push({
        code: "hres:group:admin-staff",
        typeActive: T.Staff,
        typePast: T.StaffPast
    });
    groups.push({
        code: "hres:group:external-researchers",
        typeActive: T.ExternalResearcher,
        typePast: T.ExternalResearcher // same type as Active because "past" doesn't make sense for externals who are not employed or enroled at the institution
    });
});

// --------------------------------------------------------------------------

var CanAdministrateDataImport = O.action("haplo:data-import-framework:can-administrate");

P.implementService("haplo:data-import-framework:admin-ui:add-options", function(options) {
    options.push({
        action: "/do/hres-user-sync-generic/generate-structure",
        label: "Institution structure",
        notes: "Generate schema requirements to set up the institution's organisational structure.",
        indicator: "standard"
    });
});

P.implementService("haplo:data-import-framework:admin-ui:add-documentation-links", function(options) {
    options.push({
        action: "https://docs.haplo.org/app/research/setup/user-sync",
        label: "Research Framework user sync",
        notes: "Documentation for setting up user sync for research organisations.",
        indicator: "standard"
    });
});

var InstitutionsForm = P.form("institutions", "form/institutions.json");

P.respond("GET,POST", "/do/hres-user-sync-generic/generate-structure", [
], function(E) {
    CanAdministrateDataImport.enforce();
    let spec = {},
        output,
        form = InstitutionsForm.handle(spec, E.request);
    if(form.complete) {
        let prefix = spec.prefix,
            structure = _.strip(spec.structure).split(/[\r\n]+/),
            parents = [],
            requirements = [];
        let types = [
            "hres:type:research-institute:university",
            "hres:type:research-institute:faculty",
            "hres:type:research-institute:department",
            "hres:type:research-institute:school"
        ];
        _.each(structure, function(line) {
            let m = line.match(/^([\*\s]*)\s*(.+)\s*$/);
            if(m) {
                let level = m[1].replace(/\s+/g,"").length;
                let name = m[2];

                let behaviour = (level === 0 && requirements.length === 0) ?
                    prefix+":research-institute:university" :
                    prefix+":research-institute:"+(name.toLowerCase().replace(/[^a-z]+/g,'-'));
                requirements.push(
                    "object "+behaviour,
                    "    type "+types[level],
                    "    title: "+name);
                if(level > 0) { requirements.push("    parent "+parents[level-1]); }
                requirements.push("");
                parents[level] = behaviour;
            }
        });
        output = requirements.join("\n");
    }
    E.render({
        form: form,
        output: output
    });
});
