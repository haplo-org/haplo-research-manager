title: HRES Development Test Data
--
h2. Institure structure

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
