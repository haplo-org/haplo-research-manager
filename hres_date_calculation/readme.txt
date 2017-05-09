
Handles project deadlines, using calculations from haplo_date_rule_engine

- On update to the project journal, recalculates project deadlines based on institutional rules.
- Calculated dates are saved back into the project journal as Required dates.
- Rules should be defined in uni_application plugins.
- Inputs to the calculation engine will be automatically loaded form the project journal entries of the same name
    - tries Actual date, then Required (if required has been fixed)
- also uses the previousActual as an input to the engine, as name+":previous", if the date has repeated
    - a "has:"+name+":previous" flag is set for each of these (flags are used in calculation rules - see haplo_date_rule_engine)
- If multiple rulesets apply last wins. They should be independent anyway by design, as otherwise they'd be 
    one ruleset conceptually


Service:
    "hres_date_calculation:add_input_information"
Args:
    project, inputDates, flags

    - Allows other plugins to add flags or dates for use in the calculation. Useful examples include: 
        * The date a notification was sent. This would not normally be saved in the journal, but could be used for calculating a submission deadline
        * The outcome of a process, eg. a committee decision.

Service
    "hres_date_calculate:collect_input_modifications"
Args:
    project, modifications

    - Allows other plugins to push structured modifications to input dates.
    - 'Modifications' are things that affect the project dates that cannot be expressed in rules defined in code. For example Suspensions and Extensions. As these can have arbitrary length and start date they cannot be defined in a ruleSet.
    - Called after "add_input_information" to ensure all inputs have been gathered before they are modified.

    modification data structure:
    {
        extendBy: [length, unit],   // length is a number, unit is a string eg. "month", "year"
        effectiveFrom: date         // date the extension applies from. eg. Suspension approval date
    }
