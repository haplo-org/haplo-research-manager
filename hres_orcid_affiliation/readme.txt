title: ORCID Affiliation
module_owner: Tom
--

Adds affiliation information to ORCID profiles through the ORCID data integration, API version 3.0.

h3. System setup

The ORCID schema requires a certain set of information, so for this plugin to add affiliation data you need to ensure:

* There is only one University object in the system (NB. This assumption is made in several places throughout the codebase, which will need to be amended slightly to properly handle application multi-tenancy)
* The University record has an address listed
* The University record has a valid organisational identifier

h3. Organisational Identifiers

The ORCID API accepts RINGGOLD, GRID, FUNDREF, LEI as the only valid kinds of organisational ID (at time of writing - "check here":https://github.com/ORCID/ORCID-Source/blob/master/orcid-core/src/main/java/org/orcid/core/orgs/OrgDisambiguatedSourceType.java for updates).

These will be added to the system as their own plugin, and should then be added to the University object.
