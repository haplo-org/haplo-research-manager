/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2020            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


var CanViewAndEditOverride = O.action("hres:data_management_plans:can_view_and_edit").
    title("Can view and edit DMPs");

if("RepositoryEditors" in Group) {
    CanViewAndEditOverride.allow("group", Group.RepositoryEditors);
}

var canViewAndEditDMP = P.canViewAndEditDMP = function(projectRef) {
    if(!O.isRef(projectRef)) { return false; }
    return projectRef.load().has(O.currentUser.ref, A.Researcher) || O.currentUser.allowed(CanViewAndEditOverride);
};

var getDMPForProject = P.getDMPForProject = function(key) {
    if(!key) { return; }
    let instance = P.dmpDocstore.instance(key);
    return instance.lastCommittedDocument;
};

P.implementService("hres:data_management_plans:get_dmp_for_project", getDMPForProject);

var projectHasDMP = P.projectHasDMP = function(key) {
    if(!key) { return; }
    return P.dmpDocstore.instance(key).hasCommittedDocument;
};

P.implementService("hres:data_management_plans:project_has_dmp", projectHasDMP);

var addRefToDMPDatasetWithIndex = P.addRefToDMPDatasetWithIndex = function(key, datasetIndex, datasetRef) {
    if(!(O.isRef(key) && O.isRef(datasetRef))) { return; }
    if(!canViewAndEditDMP(key)) { O.stop("Not permitted"); }
    let instance = P.dmpDocstore.instance(key),
        currentDoc = instance.currentDocument;
    if(currentDoc.dataset[datasetIndex]) {
        currentDoc.dataset[datasetIndex].linkedDataset = datasetRef.toString();
        instance.setCurrentDocument(currentDoc, true);
        instance.commit(O.currentUser);
        return true;
    } else {
        return false;
    }

};

P.implementService("hres:data_management_plans:add_ref_to_dmp_dataset_for_index", addRefToDMPDatasetWithIndex);

var datasetLinkedToDMP = P.datasetLinkedToDMP = function(datasetRef, key) {
    let datasets = getDMPForProject(key).dataset;
    return !!_.find(datasets, (dataset,index) => {
        return dataset.linkedDataset && dataset.linkedDataset === datasetRef.toString();
    });
};

var getAttributeMaybe = function(attributeString, object) {
    if(attributeString in A) {
        return object.every(A[attributeString]);
    }
    return [];
};

P.addDMPHiddens = function(instance) {
    let document = instance.currentDocument,
        projectRef = instance.key;
    if(!O.ref(projectRef)) { return; }
    let project = O.ref(projectRef).load(),
        history = instance.history;
    document.created = document.created || new Date();
    _.extend(document, {
        dmp_id: {
            // Can only have one dmp per project
            identifier: projectRef.toString(),
            type: "other"
        },
        modified: history.length > 0 ? history[history.length-1].date : document.created,
        project: [getProjectInfo(project)],
        contact: getContactInfo(project)
    });
    _.each(document.dataset, (dataset, index) => {
        if(!dataset.dataset_id) {
            dataset.dataset_id = {
                identifier: projectRef+":"+index,    // To ensure system-wide uniqueness
                type: "other"
            };
        }
    });
    instance.setCurrentDocument(document, true);
};

P.checkFileSizes = function(instance) {
    let document = instance.currentDocument;
    _.each(document.dataset, (dataset) => {
        if(P.isLargeFile(dataset.expected_size) && "RepositoryEditors" in Group) {
            let project = O.isRef(instance.key) ? instance.key.load() : undefined;
            O.service("std:workflow_emails:send_email", {
                template: P.template("big-files-expected"),
                to: [Group.RepositoryEditors],
                view: {
                    emailSubject: "Large file expected for project",
                    user: O.currentUser,
                    project: project
                }
            }, []);
        }
    });
};

P.addEthicsIssues = function(instance) {
    if("EthicsApplication" in T) {
        let document = instance.currentDocument,
            projectRef = O.isRef(instance.key) ? instance.key : undefined;
        if(!projectRef) { return; }
        let ethics = O.query().link(T.EthicsApplication, A.Type).link(projectRef, A.Project).execute();

        if(ethics.length) {
            document.ethical_issues_exist = "unknown";
            let ethicsInfo = O.service("hres:ethics:get_application_info", ethics[0].ref);
            if(ethicsInfo.ethicsClass !== "hres:list:risk-level:unknown") { document.ethical_issues_exist = "yes"; }
            document.ethical_issues_report = ethics[0].url(true);
            document.ethical_issues_description = ethicsInfo.document.strategies;
            document.ethicalIssuesPrefilled = true;
        }
    }
};

P.hasPrefilledCosts = function(document) {
    return !!_.find(document.cost, (cost) => {
        return cost.prefilled;
    });
};

P.addCostingInformation = function(instance) {
    if("Proposal" in T) {
        let document = instance.currentDocument,
            projectRef = O.isRef(instance.key) ? instance.key : undefined,
            costFormatter = O.numberFormatter("#.00");
        if(!projectRef) { return; }
        let proposals = O.query().link(T.Proposal, A.Type).link(projectRef, A.Project).execute();
        if(!document.cost) { document.cost = []; }
        if(proposals.length) {
            _.each(proposals, (proposal) => {
                let costing = O.serviceMaybe("hres:funding:costing-tool:get-costing", proposal),
                    ledger = costing ? costing.runLedger() : undefined,
                    total = ledger ? ledger.total : undefined;

                document.cost.push({
                    title: proposal.title,
                    description: proposal.first(A.Objectives) ? proposal.first(A.Objectives).toString() : undefined,
                    value: total ? parseFloat(costFormatter(total.base)) : undefined,
                    prefilled: true
                });
            });
        }
    }
};

P.hasPrefilledDatasets = function(document) {
    return !!_.find(document.dataset, (dataset) => {
            if(dataset.prefilled) { return true; }
        });
};

P.addDatasets = function(instance, dmpDatasets) {
    let datasets = instance.currentDocument.dataset;
    let document = dmpDatasets.currentDocument;
    if(!document.dataset) {
        document.dataset = [];
    }
    _.each(datasets, (datasetRef, index) => {
        let dataset = O.ref(datasetRef).load();
        document.dataset.push({
            dataset_id: {
                identifier: instance.key.toString()+":"+index,
                type: "other"
            },
            title: dataset.title,
            description: getAttributeMaybe("Abstract", dataset).join("\n"),
            keywords: _.map(getAttributeMaybe("Keywords", dataset), (keyword) => {
                return keyword.toString();
            }),
            distribution: [getDatasetDistributions(dataset)],
            prefilled: true
        });
    });
    return document;
};

var getDatasetDistributions = function(dataset) {
    let accessBehaviourMap = {
            "hres:list:file-access-level:open": "Open",
            "hres:list:file-access-level:restricted": "Closed",
            "hres:list:file-access-level:safeguarded": "Closed",
            "hres:list:file-access-level:controlled": "Closed"
        },
        description = getAttributeMaybe("Abstract", dataset).join("\n"),
        availableTill = getAttributeMaybe("RetentionReviewDate", dataset)[0],
        accessLevel = getAttributeMaybe("FileAccessLevel", dataset).join("\n"),
        files = [];

    dataset.every(A.File, (v) => {
        files.push(v);
    });

    if(files.length < 1) { return; }

    let distribution = {
        title: dataset.title,
        description: description ? description.toString() : undefined
    };
    let file = O.file(files[0]);
    distribution.format = file.mimeType;
    distribution.byteSize = file.fileSize;
    distribution.download_url = file.url({asFullURL: true});
    distribution.access_url = dataset.url(true);

    distribution.data_access = O.isRef(accessLevel) ? accessBehaviourMap[accessLevel.behaviour] : undefined; 
    distribution.available_till = availableTill ? availableTill.toString() : undefined;
    return distribution;
};

var getProjectInfo = function(project) {
    let description = project.every(A.Objectives),
        dates = O.serviceMaybe("hres:project_journal:dates", project.ref),
        start,
        end;
    if(!dates) {
        dates = getAttributeMaybe("ProjectDates", project)[0];
        if(dates) {
            start = dates.start;
            end = dates.end;
        }
    } else {
        start = dates.date("project-start");
        end = dates.date("project-end");
        start = start.actual || start.requiredMin || start.requiredMax;
        end = end.actual || end.requiredMin || end.requiredMax;
    }
    // fallback options, as start and end are required
    if(!start) {
        start = project.creationDate;
    }
    if(!end) {
        end = new XDate("2100-01-01");
    }

    return {
        title: project.title,
        description: description ? description.toString() : null,
        start: new XDate(start).toString("yyyy-MM-dd"),
        end: new XDate(end).toString("yyyy-MM-dd"),
        funding: getFundingInfo(project)
    };
};

var getFundingInfo = function(project) {
    let fundingInfo = [];
    if("Proposal" in T) {
        O.query().link(T.Proposal, A.Type).link(project.ref, A.Project).execute().each((proposal) => {
            let statusMaybe = "ProposalStage" in A ? O.service("hres_funding_schema:proposal:retrieve_ordered_stages", 
                proposal, A.ProposalStage, 'desc')[0] : undefined;
            fundingInfo.push({
                grant_id: "GrantId" in A ? {
                    identifier: proposal.first(A.GrantId) ? proposal.first(A.GrantId).toString() : "",
                    type: "other"
                } : undefined,
                funder_id: "Funder" in A ? {
                    identifier: proposal.first(A.Funder) ? proposal.first(A.Funder).toString() : "",
                    type: "other"    // TODO: should support FUNDREF identifiers in Funding schema
                } : undefined,
                funding_status: getFundingStatus(proposal)
            });
        });
    }
    return fundingInfo;
};

var getFundingStatus = function(proposal) {
    // OPTIONAL schema checked already in getFundingInfo, no need to re-check here
    if(proposal.first(A.ProposalStage, Q.Won)) {
        return "granted";
    } else if(proposal.first(A.ProposalStage, Q.Lost)) {
        return "rejected";
    } else if(proposal.first(A.ProposalStage, Q.Submitted)) {
        return "applied";
    } else {
        return "planned";
    }
};

var getContactInfo = function(project) {
    let researcher = project.first(A.Researcher);
    let emailAddress = researcher ? researcher.load().first(A.EmailAddress) : O.currentUser.email;
    let orcid = researcher ? getAttributeMaybe("Orcid", researcher.load())[0] : undefined;
    let contact = {
        name: researcher ? researcher.load().title : O.currentUser.name,
        mbox: emailAddress.toString()
    };
    if(orcid) {
        contact.contact_id = {
            identifier: "https://orcid.org/"+orcid.toString(),
            type: "orcid"
        };
    } else {
        contact.contact_id = {
            identifier: researcher.toString(),
            type: "other"
        };
    }
    return contact;
};
