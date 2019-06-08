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

h3(service). hres_date_calculation:gather_year_recurring_implementations

Calculate project dates that repeat on the same date and month every year. To declare rules do:

<pre>language=javascript
P.implementService("hres_date_calculation:gather_year_recurring_implementations", function(project, start, yearRecurringImpl) {
    yearRecurringImpl({
        ...
    });
});
</pre>

where the implementation specification has the properties:

h3(property). deployedOn

**REQUIRED**: string in the form @yyyy-mm-dd@ of the date the rule is effective from.

h3(property). name

**REQUIRED**: string of the project date name.

h3(property). date

**REQUIRED**: if not using property @fromProjectDate@, the number value of the day of the month.

h3(property). month

**REQUIRED**: if not using property @fromProjectDate@, lower-case string of the first 3 letters of the month.

h3(property). fromProjectDate

A string of the project date name to use to get the @date@ and @month@ properties.

h3(property). alertMonthsBeforeRequiredMax

List of numbers. For example if you wish to send an alert 2 and 1 months before the deadline of the project date write @[2, 1]@ (make sure 2 alerts are declared for the project date).

h3(property). untilProjectDates

List of string project date names. The next date won't be calculated if it's after any of the projects dates in the list.

**DEFAULT**: @["project-end"]@
