title: Development Test Data
--
h2. Institute structure

You can express institute structure as a string in the (read in order) form of:

* each institute name is on its own line;
* prefixed with institute depth as @*@ times depth level number (whitespace characters are ignored);
* where no institute depth is given that is interpreted as top of tree.

h2. Support for generating anonymised systems

h3(service). hres_development_test_data:custom_institute_structure

**REQUIRED**: Return the institute structure of your system expressed as a (valid) string.

h3(service). hres_development_test_data:additional_institute_structure_options

To add an option to confirm when choosing what data to generate begin by registering the service like:

<pre>language=javascript
P.implementService("hres_development_test_data:additional_institute_structure_options", function(addOption) {
    addOption(..., ...);
});
</pre>

where the @serviceFunction@ takes a function as an argument used to add options.

Arguments for the 'add option' function are:

# a string to use as label of option - use to specify what is going to be generated and at which maximum depth;
# an @int@ saying the maximum depth of your institute structure tree.

Suitable default options will be listed for maximum depths of 1, 2, and 3.

Call 'add option' function as many times as needed in your implementation.

h2. Generator

Many services will be passed @generator@ in order to provide some common functions required when generating data.

| randomDistributedValue | Function that returns a random value from an array of arrays that contains the probability that the value should be chosen at idx 0 and the value at idx 1 |
| randomListMember | Returns a random value from the passed in list |
| randomDateInPeriod | Function that takes three arguments: @startMonthsFromNow@, @endMonthsFromNow@, @precision@. The first two should be numbers, precision should be one of year, month, day. Returns a random date in that period. |
| instituteStructureDepth | The depth of the institution as an integer. |
| addInstituteRole | Function to declare a role on an institute defined by your plugin. Pass in @desc@, @qual@, @type@, and @max@ (defaults to 1). This will make sure that important roles are added to RIs when the data is generated. |
| addUsersInGroups | Function that takes @count@, @destinationGroup@, @sourceGroup@. Adds @count@ members from @sourceGroup@ to @destinationGroup@. |
| addCommitteeType | Function that takes @type@, @instituteType@, @titleSuffix@, @probability@. Maybe creates a committee for an institution type. |
| addPersonFromInstitute | Function that takes @institutionRef@, @typeOfPerson@, @object@, @desc@, @qual@. Adds a random person from an RI to an object. |
| addSomePeopleFromInstitute | Similar to @addPersonFromInstitute@ but additionally takes @min@ and @max@ arguments before the other arguments to add multiple people to one attribute. |
| randomProjectName | Returns a randomly generated project name |
| randomParagraphText | Returns randomly generated paragraph text separated by @\n\n@ |
| randomParagraphTextAsDocumentText | Returns randomly generated paragraph text as O.T_TEXT_DOCUMENT text type. |

If you don't see what you need in these docs, please check the code.

h2. Developing and debugging

When you need to create new test data generation functions, you can use the debug tools provided by this plugin.

The @generator@ object passed to many services provided by this plugin has a debug flag property that will be true or false depending on whether data is being generated in debug mode (see below).

h3. /do/hres-development-test-data/generate?debug=1

With the debug flag on, data is only generated for one RI, and a maximum of 5 people of each type will be generated for that RI. This significantly reduces the number of objects created to speed up generation.

This handler can be run as many times as there are RIs at the lowest level before having to delete data, since each time it adds people to an RI that doesn't have people on it.

Funders and taxonomies controlled by this plugin are only added once.

h3. /do/hres-development-test-data/delete-data

This handler deletes all objects generated after the first time data was generated via the generation handler, or after a custom time. This does not revert objects that may have been modified during the data generation process, for example RIs will continue to have deleted people assigned to roles.

This handler takes an optional parameter @from@ which takes a date string in the format @YYYY-MM-ddTHH-mm-SS@. If you pass in a string, make sure it is a valid date by checking that the message displayed in the confirmation screen has the expected date in it.
