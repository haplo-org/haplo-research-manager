/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2019            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


P.implementService("hres:orcid:integration:obtained_orcid", function(user, orcid) {
    pushAffiliationDataForUser(user);
});

var UPDATE_IF_CHANGED = [A.JobTitle, A.ResearchInstitute];
P.hook('hPostObjectChange', function(response, object, operation, previous) {
    if(object.isKindOf(T.Person)) {
        let user = O.user(object.ref);
        if(user) {
            let needsUpdate = false;
            _.each(UPDATE_IF_CHANGED, (desc) => {
                if(!object.valuesEqual(previous, desc)) {
                    needsUpdate = true;
                }
            });
            if(needsUpdate) {
                pushAffiliationDataForUser(user);
            }
        }
    }
});

// --------------------------------------------------------------------------

var pushAffiliationDataForUser = function(user) {
    if(!user.ref) { return; }
    // Some users may not be "employed" by the university - eg. Doctoral Researchers (education)
    let kind = O.serviceMaybe("hres:orcid:integration:affiliation_kind_for_user", user);
    if(!kind) { kind = "employment"; }
    O.service("hres:orcid:integration:push_data", user, {
        apiVersion: "3.0",
        kind: kind,
        // TODO: This will need to be migrated if we are able to add start/end dates later,
        // as we will want to be able to identify multiple affiliation entries per user
        identifier: user.ref.toString(),
        xml: getAffiliationXML(user.ref.load(), kind)
    });
};

var getAffiliationXML = function(person, kind) {

    const singleElement = function(c, el, desc) {
        const v = person.first(desc);
        if(v) {
            const text = O.isRef(v) ? v.load().title : v.toString();
            c.element(el).text(text).up();
        }
    };

    const xmlDocument = O.xml.document();
    const affiliation = xmlDocument.cursor().
        cursorSettingDefaultNamespace("http://www.orcid.org/ns/"+kind).
        element(kind).
            addNamespace("http://www.orcid.org/ns/common", "common").
            addSchemaLocation("http://www.orcid.org/ns/common", "../common_3.0/common-3.0.xsd").
            addSchemaLocation("http://www.orcid.org/ns/"+kind, "../"+kind+"-3.0.xsd");

    const common = affiliation.cursorWithNamespace("http://www.orcid.org/ns/common");
    singleElement(common, "department-name", A.ResearchInstitute);
    singleElement(common, "role-title", A.JobTitle);

    // TODO: If the university HR system can supply it, a start and end date of
    // the employment is highly recommended (and very useful!)
    // Alternatively - could set a start date for when the object is created and an
    // end date when it's deactivated...? Not ideal though for obvious reasons.

    // Assumes single tenancy - ie. anyone authenticating can only be affiliated with this 
    // institution. OK for now, since the ORCID credentials are issued to the institution, but
    // will need to be amended for multi-tenant systems.
    const university = O.query().link(T.University, A.Type).execute()[0];
    if(university && university.first(A.Address)) {
        common.element("organization");
        common.element("name").
            text(university.title).
            up();
        const address = university.first(A.Address).toFields();
        common.element("address");
        common.element("city").
            text(address.city).
            up();
        if(address.county) {
            common.element("region").
                text(address.county).
                up();
        }
        // TODO: ORCID spec prefers an ISO-3166 two letter country code, which we
        // don't currently support
        common.element("country").
            text(address.country).
            up();
        common.up();
        if(("GridID" in A) && university.first(A.GridID)) {
            common.element("disambiguated-organization");
            common.element("disambiguated-organization-identifier").
                text(university.first(A.GridID).toString()).
                up();
            common.element("disambiguation-source").
                text("GRID").
                up();
            common.up();
        }
    }
    return xmlDocument;
};
