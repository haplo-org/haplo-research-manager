/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */

/*HaploDoc
node: /hres_schema/institute_choices
title: Institute choices
sort: 1
--
h3(service). hres:schema:institute_choices

Returns the configuration data that a particular institute points to and inherits from its parent.

Inheritence will not override the institute's choices of the same name.

This is the preferred way of checking if something should occur for people/things in a certain institute.

h4. Usage

Call the service with:

* **REQUIRED**: @arg1@ being a string representing the name of a set of choices and
* **REQUIRED**: @arg2@ being the institute @Ref@ we want to select the configuration data for.

Configuration data looks like:

<pre>language=javascript
"instituteChoices": {
    "instituteRefStr": {
        "visaRegulations": {
            "noVisaCheck": true,
            ...
        },
        ...
    },
    ...
}
</pre>
*/
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
