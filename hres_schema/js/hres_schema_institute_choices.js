
// TODO: Store data in document store, Add user interface for each set of choices
P.implementService("hres:schema:institute_choices", function(choiceSet, ref) {
    var configuredOptions = (O.application.config.instituteChoices || {})[choiceSet] || {};
    // Find all options which apply by scanning up institute tree
    var scan = ref, safety = 256;
    var applicableOptions = [];
    while(safety-- && scan) {
        var o = configuredOptions[scan.toString()];
        if(o) { applicableOptions.push(o); }
        scan = scan.load().firstParent();
    }
    // Apply in reverse order so most specific wins
    var options = {};
    applicableOptions.reverse().forEach(function(o) {
        _.extend(options, o);
    });
    return options;
});