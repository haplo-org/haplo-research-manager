title: HRES Calendar subscriptions
--

Depends on "@haplo_calendar_access@":/haplo-plugins/haplo_calendar_access

h3(service). "hres:calendar:discover_calendar_sources"

Implement this service when you want to extend the options for calendar sources.

The function passed to the service implementation handler takes one argument, @discover@, which is a function that takes three strings, a unique name of the source, a display title for the source, and a description of the source.

h3(service). "hres:calendar:source:" @name@ ":events"

Implement this service when you extend the options for calendar sources, using the @name@ as passed to the discover function.

Return an array of @event@ objects, as defined here: "@haplo_icalendar_support@":/haplo-plugins/haplo_icalendar_support
