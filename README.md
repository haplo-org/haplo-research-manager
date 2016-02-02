
# Haplo Research Manager

Plugins to the [Haplo Platform](http://haplo.org) which implement the [Haplo Research Manager](http://www.research-manager.co.uk) product.


### Setup

Create blank Haplo application on the server with:

`db/init_app.sh haplo HOSTNAME "Haplo Research Manager" minimal XXXXXX`

where `XXXXX` is a random integer no longer than 9 digits, and `HOSTNAME` is a valid hostname on your server.

Auth your server with the [Haplo Plugin Tool](http://docs.haplo.org/dev/tool/plugin), by running:
	
`haplo-plugin auth HOSTNAME`

locally on your machine, from this directory.

Push all plugins with:

`haplo-plugin -p ALL`

Follow the links on the right of the home page to populate the system with some test data.

To use the example workflow and reporting dashboards, add users to the Research Data Managers group via **System mangement -> Groups -> Research Data Managers -> Members of this group -> Edit**. This will give those users the ability to approve datasets via the example Ingest Approval workflow.

Users added to the Classification Editors group can edit taxonomies.

#### OAI Setup

To activate the OAI-PMH endpoint, manually add a user with no group membership to act as the OAI service user, via 
**System management -> Users -> New user**. Then add

`"oai:service_user": "SERVICE_USER_EMAIL"`

to **System management -> Configuration -> Configuration data** to active the endpoint, at HOSTNAME/api/oai2

To view the OAI debugging options, also add

`"oai:debug": true`

to the same JSON configuration data. This adds an **OAI Export** button to object pages, allowing you to see the generated xml for that record.


### License

Haplo Research Manager is licensed under the Mozilla Public License Version 2.0. See the LICENSE file for full details.

### Copyright

Haplo Research Manager is copyright [Haplo Services Ltd](http://www.haplo-services.com). See the COPYRIGHT file for full details.
