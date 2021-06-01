title: REF Submission System Integration
--

This plugin generates an exportable spreadsheet valid for submission into the REF submission system.

h3. EXPORT_BUILDER variable

This variable warrants documentation as it is responsible for the entire generation of the export. An array of objects with keys that run a specific function to get values for the submission spreadsheet, each key represents a column in (possibly multiple sheets).

NOTE: It is allowed to have multiple entries in EXPORT_BUILDER for a single column if they are conceptually different, have different restrictions or expected types, or this allows for using of a standard retrieval method over @getValue@.

Objects have keys:

|@columnTitle@|The title of the column in the sheet.|
|/3. @sheets@|An array of objects representing the sheets this column belongs to. The object keys are:|
|@name@: The name of the sheet as it shows in @SHEET_NAMES_TO_QUERY@ or @SPECIAL_SHEET_NAMES.ALL@ which represents every sheet in the export.|
|@columnIndex@: The index of this column in the sheet (this allows for columns to go in different places in each sheet.|
|@getValue@|A function to retrieve the cell value from the object. Function has parameters (object, rowIndex) which represent the object to get the value from and the row this object will be in the sheet.|
|@collection@|The name of a reporting collection to retrieve a fact value from|
|@fact@|The name of a fact to return the value for from the @collection@ provided above. NOTE: any ref value facts will return the descriptiveTitle of the object they represent. If you require something else from the fact you will need to use a @getValue()@ property instead using the function @getFactFromCollectionForObject@ to retrieve the fact.|
|@descName@|The string local schema name of an attribute, e.g. "Author", to return the value for. This string will be checked to ensure it exists before using it, so this is safe for OPTIONAL attributes. This takes the first attribute and returns it's string value, if you need to manipulate the value at all then you should use @getValue@|
|@restrict@|A function to restrict the output before adding to the export. Takes parameters (value) which represent the value to be added to the sheet. This is commonly used to truncate strings to the max allowed length.|

NOTE: You should only use one of: @getValue@, @fact@ and @collection@, or @desc@ per column, the first of @getValue@, @fact@ and @collection@, or @desc@ (in that order) will be used if there are multiple defined.
