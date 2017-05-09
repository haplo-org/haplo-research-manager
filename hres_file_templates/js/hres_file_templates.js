/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


P.db.table("fileTemplates", {
    name:       { type:"text" },    // unique name for the file set
    document:   { type:"json" }     // the uploaded files
});

var CanConfigureTemplates = O.action("hres_file_templates:configure").
    title("Can configure templates").
    allow("group", Group.Administrators);

// TODO: put it in a different section
P.hook('hGetReportsList', function(response) {
    if(O.currentUser.allowed(CanConfigureTemplates)) {
        response.reports.push(["/do/hres-file-templates/admin", "Template configuration"]);
    }
});

P.respond("GET", "/do/hres-file-templates/admin", [
], function(E) {
    CanConfigureTemplates.enforce();
    var fileTemplates = [{name: "DEFAULT", title: "Default template"}];
    O.serviceMaybe("hres_file_templates:discover", function(name, title) {
        fileTemplates.push({name: name, title: title});
    });
    E.render({ fileTemplates: fileTemplates });
});

P.dataSource("ris", "object-lookup", [T.ResearchInstitute]);

var editTemplateForm = P.replaceableForm("fileTemplates", "form/file_templates_form.json");

var DEFAULT_MARGINS = {
    marginLeft: 96,
    marginRight: 96,
    marginTop: 96,
    marginBottom: 96
};

P.respond("GET,POST", "/do/hres-file-templates/show", [
    {pathElement:0, as:"string"}
], function(E, templateName) {
    CanConfigureTemplates.enforce();
    var fileTemplates = P.db.fileTemplates.select().where("name", "=", templateName);
    var document = fileTemplates.length ? fileTemplates[0].document : {};
    var form = editTemplateForm.instance(document);
    E.render({form:form});
    E.renderIntoSidebar({elements:[{
        href: "/do/hres-file-templates/edit/"+templateName,
        label: "Edit", indicator: "primary"
    }]}, "std:ui:panel");
});

P.respond("GET,POST", "/do/hres-file-templates/edit", [
    {pathElement:0, as:"string"}
], function(E, templateName) {
    CanConfigureTemplates.enforce();
    var fileTemplates = P.db.fileTemplates.select().where("name", "=", templateName);
    var row = fileTemplates.length ? fileTemplates[0] : P.db.fileTemplates.create({name:templateName,document:{}});
    var document = row.document || {};
    var form = editTemplateForm.handle(document, E.request);
    if(form.complete) {
        row.document = document;
        row.save();
        E.response.redirect("/do/hres-file-templates/show/"+templateName);
    }
    E.render({form:form, templateName:templateName});
});

P.implementService("hres_file_templates:get_template", function(userRef, templateSearchPath) {
    var search = _.compact(_.map(templateSearchPath, function(templateName) {
        var t = P.db.fileTemplates.select().where("name", "=", templateName);
        return t.length ? t[0].document.templates : undefined;
    }));
    var template;
    _.find(search, function(templateList) {
        var ri = userRef.load().first(A.ResearchInstitute);
        var safety = 256;
        var riStr, testFn = function(t) { return t.ri === riStr; };
        while(ri && --safety) {
            riStr = ri.toString();
            template = _.find(templateList, testFn);
            if(template) { break; }
            ri = ri.load().firstParent();
        }
        if(!template) { template = _.find(templateList, function(t) { return !t.ri; }); }
        return template;
    });
    if(template) {
        var margin = template.margin;
        _.each(DEFAULT_MARGINS, function(value, key) {
            if(!margin[key]) { margin[key] = value; }
        });
        return {file:O.file(template.template), margin:margin};
    }
    O.stop("Cannot find the template necessary to generate this document. Please contact your administrator for assistance.");
});
