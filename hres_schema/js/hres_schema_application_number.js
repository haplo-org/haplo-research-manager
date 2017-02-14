
var createAppIdValue = P.implementTextType("hres:appid", "Application ID", {
    string: function(value) {
        return value[0];
    },
    indexable: function(value) {
        return value[0];
    },
    identifier: function(value) {
        return value[0].toUpperCase();
    },
    render: function(value) {
        return P.template("application-id").render({
            id: value[0]
        });
    },
    $setupEditorPlugin: function(value) {
        // hack to include client side support
        P.template("include_application_id_editor_plugin").render();
    }
});

// --------------------------------------------------------------------------

P.implementService("hres:schema:new_application_id_for_academic_year", function(prefix, yearRef) {
    var year = yearRef.load().first(A.Date);
    var yearNumber = year.start.getFullYear() - 2000;
    var dataProperty = "appID_Next_"+prefix;
    var nexts = P.data[dataProperty] || {};
    var nextProperty = yearRef.toString();
    if(!(nextProperty in nexts)) { nexts[nextProperty] = 1; }
    var appId = prefix+_.sprintf("%02d%02d-%04d", yearNumber, yearNumber+1, nexts[nextProperty]);
    nexts[nextProperty]++;
    P.data[dataProperty] = nexts;
    return createAppIdValue([appId]);
});

// --------------------------------------------------------------------------

var APPLICATION_ID_REGEXP = /^\s*([A-Za-z]{3}[0-9]{4}-[0-9]{4,6})\s*$/;

P.hook("hPreSearchUI", function(response, query, subset) {
    if(query) {
        var m = APPLICATION_ID_REGEXP.exec(query);
        if(m) {
            var q = O.query().identifier(createAppIdValue([m[1].toUpperCase()])).execute();
            if(q.length > 0) {
                response.redirectPath = q[0].url();
            }
        }
    }
});
