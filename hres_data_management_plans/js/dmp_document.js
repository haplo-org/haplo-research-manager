/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2019            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */



P.implementService("hres:data_management_plans:get_dmp", function(project) {
    return getDMPDocument(project);
});

var getDMPDocument = P.getDMPDocument = function(projectRef) {
    let project = projectRef.load();
    let instance = P.dmpDocstore.instance(project);
    if(!project.isKindOf(T.Project) || !instance) { return; }
    let document = instance.lastCommittedDocument;
    let history = instance.history;
    if(!document || 1 > history.length) { return; }

    addEthicsIssues(document, project);
    document.created = history[0].date;
    document.modified = history[history.length-1].date;
    document.project = [getProjectInfo(project)];
    document.contact = getContactInfo(project);
    document.datasets = getDatasetInfo(document);
    return document;
};

var addEthicsIssues = function(document, project) {
    if("EthicsApplication" in T) {
        let ethics = O.query().link(T.EthicsApplication, A.Type).link(project.ref, A.Project).execute();
        if(ethics.length) {
            let ethicsInfo = O.service("hres:ethics:get_application_info", ethics[0].ref);
            document.ethical_issues_exist = (ethicsInfo.ethicsClass === "hres:list:risk-level:unknown") ? "unknown" : "yes";
            document.ethical_issues_report = ethics[0].url(true);
            document.ethical_issues_description = ethicsInfo.document.strategies;
        }
    }
    if(!document.ethical_issues_exist) {
        document.ethical_issues_exist = "unknown";
    }
};

var getDatasetInfo = function(document) {
    _.each(document.datasets, (dataset) => {
        if(dataset.datasetTitle) {
            let datasetRef = O.ref(dataset.datasetTitle);
            if(!datasetRef) { return; }
            let datasetObject = datasetRef.load();

            dataset.title = datasetObject.title;
            dataset.distribution = [getDatasetDistributions(datasetObject)];

            let doi = datasetObject.first(A.DOI);
            if(doi) {
                dataset.dataset_id = {
                    identifier: P.DOI.url(doi),
                    identifierType: "HTTP-DOI"
                };
            }
            delete dataset.datasetTitle;
        }
    });
    return document.datasets;
};

var getDatasetDistributions = function(dataset) {
    let description = dataset.first(A.DistributionDescription);
    let availableTill = dataset.first(A.AvailableUntil);
    let accessLevel = dataset.first(A.AccessLevel);
    let files = dataset.first(A.File);

    let distribution = {
        title: dataset.title,
        description: description ? description.toString() : undefined
    };

    let file = files ? O.file(files) : null;
    if(!file) { return distribution; }

    distribution.format = file.mimeType;
    distribution.byteSize = file.fileSize;
    distribution.download_url = file.url({asFullURL: true});
    distribution.access_url = dataset.url(true);

    distribution.data_access = accessLevel ? accessLevel.load().title : undefined; 
    distribution.available_till = availableTill ? availableTill.toString() : undefined;
    return distribution;
};

var getProjectInfo = function(project) {
    let description = project.every(A.ProjectDescription);
    return {
        title: project.title,
        description: description ? description.toString() : null,
        funding: getFundingInfo(project)
    };
};

var getFundingInfo = function(project) {
    let fundingInfo = [];
    if("Proposal" in T) {
        O.query().link(T.Proposal, A.Type).link(project.ref, A.Project).execute().each((proposal) => {
            let statusMaybe = O.service("hres_funding_schema:proposal:retrieve_ordered_stages", 
                proposal, A.ProposalStage, 'desc')[0];
            fundingInfo.push({
                grantID: {
                    identifier: proposal.first(A.GrantId) ? proposal.first(A.GrantId).toString() : "",
                    identifierType: "custom"
                },
                funderID: {
                    identifier: proposal.first(A.Funder) ? proposal.first(A.Funder).toString() : "",
                    identifierType: "custom"    // TODO: should support FUNDREF identifiers in Funding schema
                },
                fundingStatus: statusMaybe ? SCHEMA.getQualifierInfo[statusMaybe.qualifier] : ""
            });
        });
    }
    return fundingInfo;
};

var getContactInfo = function(project) {
    let researcher = project.first(A.Researcher).load();
    let emailAddress = researcher.first(A.EmailAddress);
    let orcid = researcher.first(A.Orcid);
    return {
        name: researcher.title,
        mail: emailAddress ? emailAddress.toString() : undefined,
        contact_id: orcid ? {
            identifier: "https://orcid.org/"+orcid.toString(),
            identifierType: "HTTP-ORCID"
        } : undefined
    };
};
