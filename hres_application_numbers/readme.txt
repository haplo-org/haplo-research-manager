title: Application numbers
--

This plugin provides a service for generating application numbers. 

h3(service). "hres:application_numbers:new_application_id_for_academic_year"
function(prefix, academicYearRef)

Returns an application number (text identifier) of the format PREFIXyear-num e.g. (RES1819-0039). 

h3(service). "hres:application_numbers:new_application-id_for_calendar_year"
function(prefix, fullYear)

Returns an application number (text identifier) of the format PREFIXyear-num e.g. (APP21-0039)