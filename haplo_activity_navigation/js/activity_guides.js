
var USE_BUILT_IN_GUIDES = !(O.application.config["haplo_activity_navigation:disable_built_in_guides"]);

if(USE_BUILT_IN_GUIDES) {

    P.db.table("guides", {
        activity: {type:"text"},
        title: {type:"text"},
        sort: {type:"int"},
        user: {type:"user"},        // which user saved this
        latest: {type:"boolean"},   // whether this is the latest version
        replacesId: {type:"int", nullable:true},
        document: {type:"json"}
    });

    var guidesForActivity = function(activityName) {
        return P.db.guides.select().
            where("activity","=",activityName).
            where("latest","=",true).
            order("sort").order("title");
    };

    var checkedActivity = function(activityName) {
        var activity = P.getActivity(activityName);
        if(!activity || !O.currentUser.allowed(activity.editAction)) { O.stop("Not permitted"); }
        return activity;
    };

    // ----------------------------------------------------------------------

    var SCREEN_LINK_OPTIONS = {authenticationSignature:true};
    var PRINT_LINK_OPTIONS =  {authenticationSignature:true, forceDownload:true};

    P.implementService("haplo_activity_navigation:overview", function(activity, add) {
        add(100, P.template("guides/overview-guides").deferredRender({
            activity: activity,
            sections: _.map(guidesForActivity(activity.name), function(section) {
                var document = section.document;
                return {
                    section: section,
                    document: document,
                    guides: _.map(document.guides || [], function(f) {
                        return {
                            title: f.title,
                            screen: f.screen ? O.file(f.screen).url(SCREEN_LINK_OPTIONS) : undefined,
                            print: f.print   ? O.file(f.print).url(PRINT_LINK_OPTIONS)   : undefined
                        };
                    }),
                    files: _.map(document.files || [], function(f) {
                        return {
                            title: f.title,
                            file: f.file ? O.file(f.file).url(SCREEN_LINK_OPTIONS) : undefined
                        };
                    })
                };
            }),
            canEdit: O.currentUser.allowed(activity.editAction)
        }));
    });

    // ----------------------------------------------------------------------

    P.respond("GET", "/do/activity/guides/edit-guides", [
        {pathElement:0, as:"string"}
    ], function(E, activityName) {
        var activity = checkedActivity(activityName);
        E.render({
            activity: activity,
            sections: guidesForActivity(activityName)
        }, "guides/list");
    });

    var EditForm = P.form("guides", "form/guides/edit-guides.json");

    P.respond("GET,POST", "/do/activity/guides/edit-guide-section", [
        {pathElement:0, as:"string"},
        {pathElement:1, as:"db", table:"guides", optional:true}
    ], function(E, activityName, existingRow) {
        var activity = checkedActivity(activityName);
        var document = existingRow ? existingRow.document : {};
        var form = EditForm.handle(document, E.request);
        if(form.complete) {
            var row = P.db.guides.create({
                activity: activity.name,
                title: document.title,
                sort: 1000,
                user: O.currentUser,
                latest: true,
                document: document
            });
            if(existingRow) { row.replacesId = existingRow.id; }
            row.save();
            if(existingRow) {
                existingRow.latest = false;
                existingRow.save();
            }
            E.response.redirect("/do/activity/guides/edit-guides/"+activity.name);
        }
        E.render({
            activity: activity,
            row: existingRow,
            form: form
        }, "guides/edit-section");
    });
}
