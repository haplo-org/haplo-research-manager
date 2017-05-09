

//---------------------------------------------------------
# Journal

P.db.table("journal", {
    datetime:       {type:"datetime"},              // when the event actual
    academicYear:   {type:"ref"},                   // which academic year the event was in
    kind:           {type:"text"},                  // what kind of event it is
    implementation: {type:"text"},                  // what is implementing this event
    project:        {type:"ref",                    // what project it's about
            indexed:true, indexedWith:["datetime"]},
    ref:            {type:"ref",    nullable:true}, // an (optional) object representing this event
    identifier:     {type:"text",   nullable:true}, // an identifier for deduplicating events (if object is null)
    user:           {type:"user",   nullable:true}, // which user caused the event to happen
    data:           {type:"json",   nullable:true}  // optional additional data:
                                                    //   plain word keys: should be well known and shared between
                                                    //       implementations for a given kind, things using them should
                                                    //       be careful to cope with them being absent.
                                                    //   keys containing ':' character: data specific to the
                                                    //       implementation, use implementation name as the namespace.
});


The journal is meant as a *historical* record of activities and dates relating to a project. Each new event should get its own entry in the journal.

## Services

    "hres:project_journal:select"
Args
    specification   // an object with keys:
                    //      project
                    //      kind  (optional)
                    //      academicYear    (optional)
                    //      modify (optional) - function called with the 'select' object as first parameter
                    //          to apply arbitrary clauses to the select statement where access isn't available to callers
                    //          eg: with hres:project_journal:render
Usage
    Returns a databaseQuery object. Used for searching the journal for events related to a project


    "hres:project_journal:load"
Args
    id          // The databaseRowId for a row of the journal databse
Usage
    To load data directly from the journal database


    "hres:project_journal:save"
Args
    entry       // an object with keys for all of the journal database fields, and:
                //      discardIfDuplicate (optional) - only save if this is not a duplicate event
                //      id (optional) - Database row ID for an existing journal entry
Usage
    Used for saving to the journal. Creates or updates entries in the table, with discardIfDuplicate used if you don't want duplicate entries for the same event


    "hres:project_journal:render"
Args
    specification   // object. Used for both UI details and to select which journal entries to display. Has all the 
                    // keys of "hres:project_journal:select", plus UI options:
                    //      style (optional) - defaults to 'table'
                    //      columnService (optional) - services to allow custom column rednering implementations. Is
                    //                  passed the ui object as an argument
                    //      withHeaders
Usage
    Returns a deferredRender object of the journal entries selected by the specification object. Used for rendering journal entries.


    "hres:project_journal:notify:update"
    "hres:project_journal:notify:update:"+kind
Args
    row  // The database row of the journal that has been updated
Usage
    To notify other plugins of changes to the journal. Implementing plugins should specify a @kind@ if possible.


