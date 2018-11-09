title: Date calculation
--

This plugin handles project deadlines, using calculations from @haplo_date_rule_engine@.

On update to the project journal it recalculates project deadlines based on the institutional rules.  Rules should be defined in @uni_application@ plugins.

Calculated dates are saved back into the project journal as deadlines.

Inputs to the calculation engine will be automatically loaded form the project journal entries of the same name. It will try to load an @actual@ date, then a @required@ date that has been manually entered.

It will automatically uses any @previousActual@ dates as an input to the engine, as @name+":previous"@, if the date has repeated. A @"has:"+name+":previous"@ flag is set for each of these (flags are used in calculation rules - see @haplo_date_rule_engine@).


h2. Services

h3(function). "hres_date_calculation:add_input_information"
function(project, inputDates, flags)

Allows other plugins to add flags or dates for use in the calculation. Useful examples include: 
* The date a notification was sent. This would not normally be saved in the journal, but could be used for calculating a submission deadline
* The outcome of a process, eg. a committee decision.

