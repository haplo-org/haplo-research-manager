title: REF Schema
module_owner: Tom R
--

This plugin provides schema relating to the REF - in particular objects for REF units of assessment (UoAs). 
"More information about the REF":http://www.ref.ac.uk/about/whatref/
"More information about units of assessment":https://www.ref.ac.uk/about/uoa/

h3. Historical units of assessment

The REF (or, previously RAE) is carried out periodically. The next REF is in 2021, and the previous three were 2014, 2008, and 2001. The precise list of UoAs used in each of these has differed. We sometimes get historical REF information from universities, and to be able to interpret it accurately, we need to know what the list of UoAs was at the time that the data was created.

However, going forward, we only want the current UoAs (2021) to be able to be chosen in the system when, for example, you are adding an attribute. For this reason, each REF has it's own subtype of @hres:type:ref-unit-of-assessment@. This plugin has a list of the current UoAs, and sets every other UoA to archived. This allows them to be added programatically, but not be otherwise visible in the system. 