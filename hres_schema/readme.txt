title: HRES Schema
--

h3. Fetching committee entities

The @_hresMakeCommitteeEntityGetter@ function can be called with @type@ and @instituteEntities@ arguments in an entity getter function in order to avoid having to write the code to fetch committees every time. See PhD Schema for an example of this use. 

h2. Calendar Navigation

h3(feature). hres:schema:calendar_year_navigation

Use this feature on a dashboard to enable calendar year navigation. Parameters are currentYear, fact, startDate and endDate. Don't use startDate and endDate. 

Example:
<pre>dashboard.use("hres:schema:calendar_year_navigation", 2018, "year");</pre>

h3(feature). hres:schema:calendar_year_navigation_for_json_columns

Use this feature on a dashboard to enable calendar year navigation for json columns. Need to provide the calendar year when using. 

Example:
<pre>dashboard.use("hres:schema:calendar_year_navigation_for_json_columns", 2018);</pre>

h3(feature). hres:schema:calendar_month_navigation

Use this feature on a dashboard to enable calendar month navigation. Months are 0 to 12, and should probably be passed through the url. Parameters are currentYear, currentMonth (0 indexed), fact, startDate and endDate. Don't use startDate and endDate. 

Example:
<pre>dashboard.use("hres:schema:calendar_month_navigation", 2018, 3, "year");</pre>

h3(feature). hres:schema:calendar_quarter_navigation

Use this feature on a dashboard to enable quarter navigation. Quarters are 1, 2, 3, and 4, and should be passed through the url. Q1 is January to March. Parameters are currentYear, currentQuarter, fact, startDate and endDate. Don't use startDate and endDate. 

Example:
<pre>dashboard.use("hres:schema:calendar_quarter_navigation", 2018, 1, "year");</pre>


h3(feature). hres:schema:academic_quarter_navigation

Use this feature on a dashboard to enable quarter navigation where quarters line up with the academic year. Quarters are 1, 2, 3, and 4, and should be passed through the url. Q1 is August to October. Parameters are currentYear, currentQuarter, fact, startDate and endDate. Don't use startDate and endDate. 

Example:
<pre>dashboard.use("hres:schema:academic_quarter_navigation", [Ref of relevant Academic year], 1, "year");</pre>
