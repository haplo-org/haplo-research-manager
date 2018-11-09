title: Project Journal
--

Project journal is a record of when events concerning the project took place, a subset of which can be seen in "Project history" for Doc Res projects, for example.
Use "hres:project_journal:save" with entry spec to save an entry to the project journal
Can do custom rendering by giving the entry an implementation and implementing "hres:project_journal:get_implementation:IMPL"
A row is uniquely identified with project, ref and identifier - if these three match then a previous entry will be replaced with the current one.

Project dates manages the deadlines for certain events. Deadlines can be set manually or through rules.
Use P.hresProjectDates.register({dateSpec}) to register a date.


----


h3(table). "journal"

| *key* | *type* | *description* | *extra info* |
| datetime | "datetime" | when the event actual |
| academicYear | "ref" | which academic year the event was in |
| kind | "text" | what kind of event it is |
| implementation | "text" | what is implementing this event |
| project | "ref" | what project it's about | indexed:true, indexedWith:["datetime"] |
| ref | "ref" | an (optional) object representing this event |
| identifier | "text" | an (optional) identifier for deduplicating events (if object is null) |
| user | "user" | which user caused the event to happen (optional) |
| data | "json" | optional additional data |

@data@ can include:

* plain word keys: should be well known and shared between implementations for a given kind, things using them should be careful to cope with them being absent.
* keys containing ':' character: data specific to the implementation, use implementation name as the namespace.


The journal is meant as a *historical* record of activities and dates relating to a project. Each new event should get its own entry in the journal.


h2. Services (to implement journal entry types)

h3(service). "hres:project_journal:get_implementation:"+implementation

Implement this service to provide an implementation for the journal.

h3(service). "hres:project_journal:get_implementation"

Fallback service, if an implementation specific service is not implemented. Use this when you need to define lots of different implementations at once.


h2. Services (to edit and query journal)

h3(service). "hres:project_journal:select"

Takes a specification, which is an object with keys:

* project
* kind (optional)
* implementation (optional - handled for you when kind is @PDATE@)
* academicYear (optional)
* identifier (optional)
* modify (optional) - function called with the 'select' object as first parameter to apply arbitrary clauses to the select statement where access isn't available to callers, eg: with hres:project_journal:render

Returns a databaseQuery object. Used for searching the journal for events related to a project.

h3(service). "hres:project_journal:load"

Takes a single argument: the databaseRowId for a row of the journal database

Used to load data directly from the journal database

h3(service). "hres:project_journal:save"

Takes an entry, which is an object with keys for all of the journal database fields, and:
* discardIfDuplicate (optional) - only save if this is not a duplicate event
* id (optional) - Database row ID for an existing journal entry

Used for saving to the journal. Creates or updates entries in the table, with discardIfDuplicate used if you don't want duplicate entries for the same event


h3(service). "hres:project_journal:render"

Takes a specification, which is an object. Used for both UI details and to select which journal entries to display. Has all the keys of "hres:project_journal:select", plus UI options:
* style (optional) - defaults to 'table'
* columnService (optional) - services to allow custom column rednering implementations. Is passed the ui object as an argument
* withHeaders

Returns a deferredRender object of the journal entries selected by the specification object. Used for rendering journal entries.

h3(service). "hres:project_journal:notify:update"

h3(service). "hres:project_journal:notify:update:"+kind

Takes a single argument: the database row of the journal that has been updated

Used to notify other plugins of changes to the journal. Implementing plugins should specify a @kind@ if possible.

h3(service). hres:project_journal:get_last_action_by_researcher

Takes 2 arguments: a specification for @hres:project_journal:select@ and a @SecurityPricipal@, preferably of the project researcher.

Returns the value of the @datetime@ field of the journal entry it finds as a point of contact in the system. Point of contact minimum criteria:

# entries where @datetime@ field is in the past;
# the entry's implementation property @isEntryActionByResearcher(row)@ returns @true@, or
# the @user@ field of the entry matches the user argument.
