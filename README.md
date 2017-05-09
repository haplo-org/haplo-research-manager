
# Haplo Research Manager

Plugins to the [Haplo Platform](http://haplo.org) which implement the [Haplo Research Manager](http://www.research-manager.co.uk) product.

This repository contains the basic schema and records keeping for Haplo Research Manager, along with functionality that's common to all applications. To get something more interesting, you should install one or more modules, such as the Academic Repository. These modules have their own source code repositories.


### Setup

Create blank Haplo application on the server with:

`db/init_app.sh haplo HOSTNAME "Haplo Research Manager" minimal XXXXXX`

where `XXXXX` is a random integer no longer than 9 digits, and `HOSTNAME` is a valid hostname on your server.

Log in as a SUPPORT user using the developer portal application on your development server.

Auth your server with the [Haplo Plugin Tool](http://docs.haplo.org/dev/tool/plugin), by running:
	
`haplo-plugin auth HOSTNAME`

locally on your machine, from this directory.

Push all plugins with:

`haplo-plugin -p hresdemo_application`

Follow the links on the right of the home page to populate the system with some test data (requires administrative privileges).


### License

Haplo Research Manager is licensed under the Mozilla Public License Version 2.0. See the LICENSE file for full details.

### Copyright

Haplo Research Manager is copyright [Haplo Services Ltd](http://www.haplo-services.com). See the COPYRIGHT file for full details.
