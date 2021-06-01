/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2021            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


var CanExportREFSubmission = O.action("hres:action:can-export-ref-submission").
    title("Can export REF submission spreadsheet").
    allow("group", Group.REFManagers);

var UKPRN = O.application.config["hres_ref_submission:institution_ukprn"];

// --------------------------------------------------------------------------
// Utility
// --------------------------------------------------------------------------

var SPECIAL_SHEET_NAMES = {
    ALL: "all_sheets"
};

var getFactFromCollectionForObject = function(object, collectionName, factName) {
    let collection = P.reporting.collection(collectionName);
    if(!collection) {
        throw new Error("Collection: '"+collectionName+"' does not exist. "+
            "Please check your column definition.");
    }
    let query = collection.selectAllCurrentRows().where("ref", "=", object.ref);
    if(query.length > 0) {
        let row = query[0];
        if(factName in row) {
            return row[factName];
        }
    }
};

var OUTPUT_TYPE_MAP = {
    "Artefact": "L",
    "Book": "A",
    "BookChapter": "C",
    "Composition": "J",
    "ConferenceItem": "E",
    "Dataset": "S",
    "Design": "K",
    "DevicesAndProducts": "P",
    "DigitalOrVisualMedia": "Q",
    "Exhibition": "M",
    "JournalArticle": "D",
    "Other": "T",
    "Patent": "F",
    "Performance": "I",
    "Report": "N",
    "Software": "G",
    "Website": "H",
    "WorkingPaper": "U"
};

var HAPLO_TO_REF_TYPES = O.refdictHierarchical();
_.each(OUTPUT_TYPE_MAP, (value, key) => {
    if(key in T) {
        HAPLO_TO_REF_TYPES.set(T[key], value);
    }
});

var normaliseTitle = function(title) {
    return title.replace(/[^a-zA-Z0-9]/g, "");
};

var HAPLO_RESEARCH_GROUP_CODES = O.refdictHierarchical();
var _ensureResearchGroupCodes = function() {
    if(!HAPLO_RESEARCH_GROUP_CODES.length) {
        let alphaNumericCharacters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let researchInstituteCodes = alphaNumericCharacters.split("");
        let researchGroups = SHEET_NAMES_TO_QUERY.ResearchGroup();
        let seen = {};
        _.each(researchGroups, (group) => {
            if(researchInstituteCodes.length) {
                let normalisedTitle = normaliseTitle(group.title);
                let code;
                if(normalisedTitle in seen) {
                    code = HAPLO_RESEARCH_GROUP_CODES.get(seen[normalisedTitle]);
                }
                else {
                    seen[normalisedTitle] = group.ref;
                }
                HAPLO_RESEARCH_GROUP_CODES.set(group.ref, code || researchInstituteCodes.shift());
            }
        });
    }
};

var EXPORT_BUILDER = [
    {
        columnTitle: "UKPRN",
        sheets: [{name: SPECIAL_SHEET_NAMES.ALL, columnIndex: 0}],
        getValue() { return UKPRN; }
    },
    {
        columnTitle: "UnitOfAssessment",
        sheets: [{name: SPECIAL_SHEET_NAMES.ALL, columnIndex: 1}],
        getValue(object) {
            let collection = "repository_items";
            if(object.isKindOf(T.Person)) { collection = "researchers"; }
            let uoa = getFactFromCollectionForObject(object, collection, "refUnitOfAssessment") || object.first(A.REFUnitOfAssessment);
            if(!uoa) { return; }
            let behaviourSplit = uoa.behaviour.split(":");
            // The uoa behaviours are of form hres:list:ref-unit-of-assessment-2021:[UoA Number]:[UoA Title]
            return parseInt(behaviourSplit[3], 10);
        },
        restrict(value) {
            if(value >= 1 && value <= 34) {
                return value;
            }
        }
    },
    {
        columnTitle: "MultipleSubmission",
        sheets: [{name: SPECIAL_SHEET_NAMES.ALL, columnIndex: 2}]
    },
    {
        columnTitle: "Code",
        sheets: [{name: "ResearchGroup", columnIndex: 3}],
        getValue(object) {
            _ensureResearchGroupCodes();
            return HAPLO_RESEARCH_GROUP_CODES.get(object.ref);
        },
        restrict(value) {
            // Must be an alpha or numeric character
            let validTypeRegExp = new RegExp(/[A-Z0-9]/);
            if(validTypeRegExp.test(value)) {
                return value;
            }
        }
    },
    {
        columnTitle: "Name",
        sheets: [
            {name: "ResearchGroup", columnIndex: 4},
            {name: "ImpactCaseStudyContacts", columnIndex: 5}
        ],
        getValue(object) { return object.title; },
        restrict(value) { return value.substr(0,128); }
    },
    {
        columnTitle: "HESAStaffIdentifier",
        sheets: [
            {name: "CurrentStaff", columnIndex: 3},
            {name: "FormerStaffContract", columnIndex: 4},
            {name: "StaffOutputLink", columnIndex: 3},
            {name: "RemoveMinimumOfOneRequests", columnIndex: 3},
            {name: "OutputReductionRequests",columnIndex: 3}
        ],
        collection: "researchers",
        fact: "hesaIdentifier",
        restrict(value) {
            if(value.length === 13) {
                return value;
            }
        }
    },
    {
        columnTitle: "StaffIdentifier",
        sheets: [
            {name: "CurrentStaff", columnIndex: 4},
            {name: "FormerStaff", columnIndex: 3},
            {name: "FormerStaffContract", columnIndex: 3},
            {name: "StaffOutputLink", columnIndex: 4},
            {name: "RemoveMinimumOfOneRequests", columnIndex: 4},
            {name: "OutputReductionRequests", columnIndex: 4}
        ],
        // REF Guidance: "Staff reference code: a code determined by the HEI"
        getValue(object) { return O.serviceMaybe("hres_ref_submission:staff_identifier_for_object", object) || object.ref.toString(); },
        restrict(value) { return value.substr(0,24); }
    },
    {
        columnTitle: "Surname",
        sheets: [
            {name: "CurrentStaff", columnIndex: 5},
            {name: "FormerStaff", columnIndex: 4}
        ],
        getValue(object) { return object.firstTitle().toFields().last; },
        restrict(value) { return value.substr(0,64); }
    },
    {
        columnTitle: "Initials",
        sheets: [
            {name: "CurrentStaff", columnIndex: 6},
            {name: "FormerStaff", columnIndex: 5}
        ],
        getValue(object) {
            let titleFields = _.defaults(object.firstTitle().toFields(), { first: "", middle: "", last: "" });
            let allNames = titleFields.first.split(" ").
                concat(titleFields.middle.split(" ")).
                concat(titleFields.last.split(" "));
            return _.map(allNames, (name) => name.charAt(0).toUpperCase()).join("");
        },
        restrict(value) { return value.substr(0,12); }
    },
    {
        columnTitle: "DateOfBirth",
        sheets: [
            {name: "CurrentStaff", columnIndex: 7},
            {name: "FormerStaff", columnIndex: 6}
        ]
    },
    {
        columnTitle: "ORCID",
        sheets: [
            {name: "CurrentStaff", columnIndex: 8},
            {name: "FormerStaff", columnIndex: 7}
        ],
        collection: "researchers",
        fact: "orcid",
        // ORCID length is 19 characters
        restrict(value) { return value.substr(0,19); }
    },
    {
        columnTitle: "ContractFTE",
        sheets: [
            {name: "CurrentStaff", columnIndex: 9},
            {name: "FormerStaffContract", columnIndex: 5}
        ]
    },
    {
        columnTitle: "ResearchConnection",
        sheets: [
            {name: "CurrentStaff", columnIndex: 10},
            {name: "FormerStaffContract", columnIndex: 6}
        ]
    },
    {
        columnTitle: "ReasonsForNoConnectionStatement",
        sheets: [{name: "CurrentStaff", columnIndex: 11}]
    },
    {
        columnTitle: "IsEarlyCareerResearcher",
        sheets: [{name: "CurrentStaff", columnIndex: 12}]
    },
    {
        columnTitle: "IsOnFixedTermContract",
        sheets: [{name: "CurrentStaff", columnIndex: 13}]
    },
    {
        columnTitle: "ContractStartDate",
        sheets: [{name: "CurrentStaff", columnIndex: 14}]
    },
    {
        columnTitle: "ContractEndDate",
        sheets: [{name: "CurrentStaff", columnIndex: 15}]
    },
    {
        columnTitle: "IsOnSecondment",
        sheets: [
            {name: "CurrentStaff", columnIndex: 16},
            {name: "FormerStaffContract", columnIndex: 9}
        ]
    },
    {
        columnTitle: "SecondmentStartDate",
        sheets: [
            {name: "CurrentStaff", columnIndex: 17},
            {name: "FormerStaffContract", columnIndex: 10}
        ]
    },
    {
        columnTitle: "SecondmentEndDate",
        sheets: [
            {name: "CurrentStaff", columnIndex: 18},
            {name: "FormerStaffContract", columnIndex: 11}
        ]
    },
    {
        columnTitle: "IsOnUnpaidLeave",
        sheets: [
            {name: "CurrentStaff", columnIndex: 19},
            {name: "FormerStaffContract", columnIndex: 12}
        ]
    },
    {
        columnTitle: "UnpaidLeaveStartDate",
        sheets: [
            {name: "CurrentStaff", columnIndex: 20},
            {name: "FormerStaffContract", columnIndex: 13}
        ]
    },
    {
        columnTitle: "UnpaidLeaveEndDate",
        sheets: [
            {name: "CurrentStaff", columnIndex: 21},
            {name: "FormerStaffContract", columnIndex: 14}
        ]
    },
    {
        columnTitle: "ResearchGroups",
        sheets: [
            {name: "CurrentStaff", columnIndex: 22},
            {name: "FormerStaffContract", columnIndex: 15}
        ],
        getValue(object) {
            _ensureResearchGroupCodes();
            let groups = [];
            object.every(A.ResearchInstitute, (v) => {
                if(groups.length < 4) {
                    groups.push(HAPLO_RESEARCH_GROUP_CODES.get(v));
                }
            });
            return groups.join(";");
        },
        restrict(value) {
            // REF Guidance states up to 4 research groups per staff member in a semi colon delimited list
            if(value.split(";").length <= 4) {
                return value;
            }
        }
    },
    // Multiple ExcludeFromSubmission entries to make use of standard fact extraction for different collections
    {
        columnTitle: "ExcludeFromSubmission",
        sheets: [{name: "Output", columnIndex: 48}],
        collection: "repository_items",
        fact: "refDoesntMeetResearchDefinition"
    },
    {
        columnTitle: "ExcludeFromSubmission",
        sheets: [{name: "FormerStaff", columnIndex: 8}],
        collection: "researchers",
        fact: "refMarkedIneligible"
    },
    {
        columnTitle: "StartDate",
        sheets: [{name: "FormerStaffContract", columnIndex: 7}]
    },
    {
        columnTitle: "EndDate",
        sheets: [{name: "FormerStaffContract", columnIndex: 8}]
    },
    {
        columnTitle: "OutputIdentifier",
        sheets: [
            {name: "Output", columnIndex: 3},
            {name: "StaffOutputLink", columnIndex: 5}
        ],
        // Context here is potentially a mapping of submitting authors to outputs
        getValue(object, context) {
            let refStr = object.ref.toString();
            return refStr in context ? context[refStr].shift() : refStr;
        },
        restrict(value) { return value.substr(0,24); }
    },
    {
        columnTitle: "webOfScienceIdentifier",
        sheets: [{name: "Output", columnIndex: 4}]
    },
    {
        columnTitle: "OutputType",
        sheets: [{name: "Output", columnIndex: 5}],
        getValue(object) {
            if(("Collection" in T) && object.isKindOf(T.Collection)) {
                let item = object.first(A.CollectionItem);
                if(item) {
                    return HAPLO_TO_REF_TYPES.get(item.load().firstType());
                }
            }
            return HAPLO_TO_REF_TYPES.get(object.firstType());
        },
        restrict(value) {
            let validTypeRegExp = new RegExp(/[A-V]/);
            if(validTypeRegExp.test(value)) {
                return value;
            }
        }
    },
    {
        columnTitle: "Title",
        sheets: [
            {name: "Output", columnIndex: 6},
            {name: "ImpactCaseStudy", columnIndex: 4}
        ],
        getValue(object) { return object.descriptiveTitle; },
        restrict(value) { return value.substr(0,7500); }
    },
    {
        columnTitle: "Place",
        sheets: [{name: "Output", columnIndex: 7}],
        descName: "PlaceOfPublication",
        restrict(value) { return value.substr(0,256); }
    },
    {
        columnTitle: "Publisher",
        sheets: [{name: "Output", columnIndex: 8}],
        collection: "repository_items",
        fact: "publisher",
        restrict(value) { return value.substr(0, 256); }
    },
    {
        columnTitle: "VolumeTitle",
        sheets: [{name: "Output", columnIndex: 9}],
        collection: "repository_items",
        fact: "journal",
        restrict(value) { return value.substr(0,256); }
    },
    {
        columnTitle: "Volume",
        sheets: [{name: "Output", columnIndex: 10}],
        getValue(object) {
            let journalCitation = object.first(A.JournalCitation);
            if(journalCitation) {
                return journalCitation.toFields().value.volume;
            }
        },
        restrict(value) { return value.substr(0,16); }
    },
    {
        columnTitle: "Issue",
        sheets: [{name: "Output", columnIndex: 11}],
        getValue(object) {
            let journalCitation = object.first(A.JournalCitation);
            if(journalCitation) {
                return journalCitation.toFields().value.number;
            }
        },
        restrict(value) { return value.substr(0,16); }
    },
    {
        columnTitle: "FirstPage",
        sheets: [{name: "Output", columnIndex: 12}],
        getValue(object) {
            let journalCitation = object.first(A.JournalCitation);
            if(journalCitation) {
                let pageRange = journalCitation.toFields().value.pageRange;
                if(pageRange) {
                    return pageRange.split("-")[0];
                }
            }
        },
        restrict(value) { return value.substr(0,8); }
    },
    {
        columnTitle: "ArticleNumber",
        sheets: [{name: "Output", columnIndex: 13}]
    },
    {
        columnTitle: "ISBN",
        sheets: [{name: "Output", columnIndex: 14}],
        descName: "ISBN",
        restrict(value) { return value.substr(0,24); }
    },
    {
        columnTitle: "ISSN",
        sheets: [{name: "Output", columnIndex: 15}],
        collection: "repository_items",
        fact: "issn",
        restrict(value) { return value.substr(0,24); }
    },
    {
        columnTitle: "DOI",
        sheets: [{name: "Output", columnIndex: 16}],
        collection: "repository_items",
        fact: "doi",
        restrict(value) { return value.substr(0,1024); }
    },
    {
        columnTitle: "PatentNumber",
        sheets: [{name: "Output", columnIndex: 17}],
        descName: "PatentID",
        restrict(value) { return value.substr(0,24); }
    },
    {
        columnTitle: "Month", // Month the output was accessible. (Published or deposited and out of embargo)
        sheets: [{name: "Output", columnIndex: 18}],
        getValue(object) {
            let accessibleDate;
            let publishedDate = getFactFromCollectionForObject(object, "repository_items", "publishedDate");
            if(publishedDate) {
                accessibleDate = publishedDate;
            } else {
                let depositDate = getFactFromCollectionForObject(object, "repository_items", "publicationDepositedDate");
                if(depositDate) {
                    let embargoEnd = getFactFromCollectionForObject(object, "repository_items", "emEnd");
                    let embargoStart = getFactFromCollectionForObject(object, "repository_items", "emStart");
                    // Embargo could be indefinite so checking start too
                    if(!embargoEnd && !embargoStart) {
                        accessibleDate = depositDate;
                    } else if(embargoEnd) {
                        accessibleDate = embargoEnd;
                    }
                }
            }
            if(accessibleDate) {
                return (new XDate(accessibleDate)).getMonth() + 1; // XDate months are zero indexed, REFs are not.
            }
        },
        restrict(value) {
            if(_.contains([1,2,3,4,5,6,7,8,9,10,11,12], value)) {
                return value;
            }
        }
    },
    // Multiple 'Year' entries as they are conceptually different, with different restrictions.
    {
        columnTitle: "Year", // Year the output was accessible. (Published or deposited and out of embargo)
        sheets: [{name: "Output", columnIndex: 19}],
        getValue(object) {
            let accessibleDate;
            let publishedDate = getFactFromCollectionForObject(object, "repository_items", "publishedDate");
            if(publishedDate) {
                accessibleDate = publishedDate;
            } else {
                let depositDate = getFactFromCollectionForObject(object, "repository_items", "publicationDepositedDate");
                if(depositDate) {
                    let embargoEnd = getFactFromCollectionForObject(object, "repository_items", "emEnd");
                    let embargoStart = getFactFromCollectionForObject(object, "repository_items", "emStart");
                    // Embargo could be indefinite so checking start too
                    if(!embargoEnd && !embargoStart) {
                        accessibleDate = depositDate;
                    } else if(embargoEnd) {
                        accessibleDate = embargoEnd;
                    }
                }
            }
            if(accessibleDate) {
                return (new XDate(accessibleDate)).getFullYear();
            }
        },
        restrict(value) {
            if(_.contains([2014,2015,2016,2017,2018,2019,2020], value)) {
                return value;
            }
        }
    },
    {
        columnTitle: "Year", // Year of the award
        sheets: [{name: "ResearchDoctoralsAwarded", columnIndex: 3}],
    },
    {
        columnTitle: "URL",
        sheets: [{name: "Output", columnIndex: 20}],
        collection: "repository_items",
        fact: "url",
        restrict(value) { return value.substr(0,1024); }
    },
    {
        columnTitle: "IsPhysicalOutput",
        sheets: [{name: "Output", columnIndex: 21}]
    },
    {
        columnTitle: "MediaOfOutput",
        sheets: [{name: "Output", columnIndex: 22}]
    },
    {
        columnTitle: "SupplementaryInformation",
        sheets: [{name: "Output", columnIndex: 23}]
    },
    {
        columnTitle: "NumberOfAdditionalAuthors",
        sheets: [{name: "Output", columnIndex: 24}],
        getValue(object) { return object.every(A.Author).length - 1; },
        // Some outputs have only editors so prevent values going below 0
        restrict(value) { return value > 0 ? value : 0; }
    },
    {
        columnTitle: "IsPendingPublication",
        sheets: [{name: "Output", columnIndex: 25}]
    },
    {
        columnTitle: "PendingPublicationReserve",
        sheets: [{name: "Output", columnIndex: 26}]
    },
    {
        columnTitle: "IsForensicScienceOutput",
        sheets: [{name: "Output", columnIndex: 27}]
    },
    {
        columnTitle: "IsCriminologyOutput",
        sheets: [{name: "Output", columnIndex: 28}]
    },
    {
        columnTitle: "IsNonEnglishLanguage",
        sheets: [{name: "Output", columnIndex: 29}]
    },
    {
        columnTitle: "EnglishAbstract",
        sheets: [{name: "Output", columnIndex: 30}],
        getValue(object) { return object.every(A.Abstract).join("\n"); },
        restrict(value) { return value.substr(0,7500); }
    },
    {
        columnTitle: "IsInterdisciplinary",
        sheets: [{name: "Output", columnIndex: 31}],
        collection: "repository_items",
        fact: "refInterdisciplinary"
    },
    {
        columnTitle: "ProposeDoubleWeighting",
        sheets: [{name: "Output", columnIndex: 32}],
        collection: "repository_items",
        fact: "refDoubleWeighted"
    },
    {
        columnTitle: "DoubleWeightingStatement",
        sheets: [{name: "Output", columnIndex: 33}],
        getValue(object) { return object.every(A.DoubleWeightingJustification).join("\n"); },
        restrict(value) { return value.substr(0,7500); }
    },
    {
        columnTitle: "DoubleWeightingReserve",
        sheets: [{name: "Output", columnIndex: 34}],
        getValue(object) {
            let ref = getFactFromCollectionForObject(object, "repository_items", "refDoubleWeightedSubstitute");
            if(ref) {
                return ref.toString();
            }
        },
        restrict(value) { return value.substr(0,24); }
    },
    {
        columnTitle: "ConflictedPanelMembers",
        sheets: [
            {name: "Output", columnIndex: 35},
            {name: "ImpactCaseStudy", columnIndex: 6}
        ]
    },
    {
        columnTitle: "CrossReferToUoa",
        sheets: [
            {name: "Output", columnIndex: 36},
            {name: "ImpactCaseStudy",  columnIndex: 7}
        ],
        getValue(object) {
            let uoa = getFactFromCollectionForObject(object, "repository_items", "refCrossReferral");
            if(!uoa) { return; }
            let behaviourSplit = uoa.behaviour.split(":");
            // The uoa behaviours are of form hres:list:ref-unit-of-assessment-2021:[UoA Number]:[UoA Title]
            return parseInt(behaviourSplit[3], 10);
        },
        restrict(value) {
            if(value >= 1 && value <= 34) {
                return value;
            }
        }
    },
    {
        columnTitle: "AdditionalInformation",
        sheets: [{name: "Output", columnIndex: 37}],
        getValue(object) { return object.every(A.Notes).join("\n"); },
        restrict(value) { return value.substr(0,7500); }
    },
    {
        columnTitle: "doesIncludeSignificantMaterialBefore2014",
        sheets: [{name: "Output", columnIndex: 38}]
    },
    {
        columnTitle: "doesIncludeResearchProcess",
        sheets: [{name: "Output", columnIndex: 39}]
    },
    {
        columnTitle: "doesIncludeFactualInformationAboutSignificance",
        sheets: [{name: "Output", columnIndex: 40}]
    },
    {
        columnTitle: "ResearchGroup",
        sheets: [{name: "Output", columnIndex: 41}],
        getValue(object) {
            _ensureResearchGroupCodes();
            let group = object.first(A.ResearchInstitute);
            if(group) {
                return HAPLO_RESEARCH_GROUP_CODES.get(group);
            }
        },
        restrict(value) {
            // Must be an alpha or numeric character
            let validTypeRegExp = new RegExp(/[A-Z0-9]/);
            if(validTypeRegExp.test(value)) {
                return value;
            }
        }
    },
    {
        columnTitle: "OpenAccessStatus",
        sheets: [{name: "Output", columnIndex: 42}],
        getValue(object) {
            let compliant = getFactFromCollectionForObject(object, "repository_items", "refIsOACompliant");
            if(compliant) { return "Compliant"; }
            let exception = O.service("hres_ref_repository:get_exception", object);
            if(exception) {
                let kind = exception.kind.split("-")[0];
                switch(kind) {
                    case "technical":
                        return "TechnicalException";
                    case "access":
                        return "AccessException";
                    case "deposit":
                        return "DepositException";
                    case "other":
                        if(exception.kind === "other-b") {
                            return "ExceptionWithin3MonthsOfPublication";
                        } else {
                            return "OtherException";
                        }
                }
            }
            let publishedInOAPeriod = getFactFromCollectionForObject(object, "repository_items", "refPublishedInOAPeriod");
            let isOAType = getFactFromCollectionForObject(object, "repository_items", "oaIsConfItemOrArticle");
            if(!publishedInOAPeriod || !isOAType) {
                return "OutOfScope";
            }
            return "NotCompliant";
        },
        restrict(value) {
            let validOptions = [
                "Compliant",
                "NotCompliant",
                "DepositException",
                "AccessException",
                "TechnicalException",
                "OtherException",
                "OutOfScope",
                "ExceptionWithin3MonthsOfPublication"
            ];
            if(_.contains(validOptions, value)) {
                return value;
            }
        }
    },
    {
        columnTitle: "OutputSubProfileCategory",
        sheets: [{name: "Output", columnIndex: 43}]
    },
    {
        columnTitle: "OutputAllocation1",
        sheets: [{name: "Output", columnIndex: 44}]
    },
    {
        columnTitle: "OutputAllocation2",
        sheets: [{name: "Output", columnIndex: 45}]
    },
    {
        columnTitle: "RequiresAuthorContributionStatement",
        sheets: [{name: "Output", columnIndex: 46}]
    },
    {
        columnTitle: "IsSensitive",
        sheets: [{name: "Output", columnIndex: 47}]
    },
    {
        columnTitle: "outputPdfRequired",
        sheets: [{name: "Output", columnIndex: 49}]
    },
    {
        columnTitle: "AuthorContributionStatement",
        sheets: [{name: "StaffOutputLink", columnIndex: 6}]
    },
    {
        columnTitle: "IsAdditionalAttributedStaffMember",
        sheets: [{name: "StaffOutputLink", columnIndex: 7}]
    },
    {
        columnTitle: "CaseStudyIdentifier",
        sheets: [
            {name: "ImpactCaseStudy", columnIndex: 3},
            {name: "ImpactCaseStudyGrants", columnIndex: 3},
            {name: "ImpactCaseStudyContacts", columnIndex: 3}
        ]
    },
    {
        columnTitle: "RedactionStatus",
        sheets: [{name: "ImpactCaseStudy", columnIndex: 5}]
    },
    {
        columnTitle: "NameOfFunders",
        sheets: [{name: "ImpactCaseStudy", columnIndex: 8}]
    },
    {
        columnTitle: "GlobalResearchIdentifiers",
        sheets: [{name: "ImpactCaseStudy", columnIndex: 9}]
    },
    {
        columnTitle: "FundingProgrammes",
        sheets: [{name: "ImpactCaseStudy", columnIndex: 10}]
    },
    {
        columnTitle: "ResearcherOrcids",
        sheets: [{name: "ImpactCaseStudy", columnIndex: 11}]
    },
    {
        columnTitle: "FormalPartners",
        sheets: [{name: "ImpactCaseStudy", columnIndex: 12}]
    },
    {
        columnTitle: "Countries",
        sheets: [{name: "ImpactCaseStudy", columnIndex: 13}]
    },
    {
        columnTitle: "Number",
        sheets: [{name: "ImpactCaseStudyGrants", columnIndex: 4}]
    },
    {
        columnTitle: "Amount",
        sheets: [{name: "ImpactCaseStudyGrants", columnIndex: 5}]
    },
    {
        columnTitle: "ContactNumber",
        sheets: [{name: "ImpactCaseStudyContacts", columnIndex: 4}]
    },
    {
        columnTitle: "JobTitle",
        sheets: [{name: "ImpactCaseStudyContacts", columnIndex: 6}]
    },
    {
        columnTitle: "EmailAddress",
        sheets: [{name: "ImpactCaseStudyContacts", columnIndex: 7}]
    },
    {
        columnTitle: "AlternateEmailAddress",
        sheets: [{name: "ImpactCaseStudyContacts", columnIndex: 8}]
    },
    {
        columnTitle: "Phone",
        sheets: [{name: "ImpactCaseStudyContacts", columnIndex: 9}]
    },
    {
        columnTitle: "Organisation",
        sheets: [{name: "ImpactCaseStudyContacts", columnIndex: 10}]
    },
    {
        columnTitle: "DegreesAwarded",
        sheets: [{name: "ResearchDoctoralsAwarded", columnIndex: 4}]
    },
    {
        columnTitle: "Source",
        sheets: [
            {name: "ResearchIncome", columnIndex: 3},
            {name: "ResearchIncomeInKind", columnIndex: 3}
        ]
    },
    {
        columnTitle: "Income2013",
        sheets: [
            {name: "ResearchIncome", columnIndex: 4},
            {name: "ResearchIncomeInKind", columnIndex: 4}
        ]
    },
    {
        columnTitle: "Income2014",
        sheets: [
            {name: "ResearchIncome", columnIndex: 5},
            {name: "ResearchIncomeInKind", columnIndex: 5}
        ]
    },
    {
        columnTitle: "Income2015",
        sheets: [
            {name: "ResearchIncome", columnIndex: 6},
            {name: "ResearchIncomeInKind", columnIndex: 6}
        ]
    },
    {
        columnTitle: "Income2016",
        sheets: [
            {name: "ResearchIncome", columnIndex: 7},
            {name: "ResearchIncomeInKind", columnIndex: 7}
        ]
    },
    {
        columnTitle: "Income2017",
        sheets: [
            {name: "ResearchIncome", columnIndex: 8},
            {name: "ResearchIncomeInKind", columnIndex: 8}
        ]
    },
    {
        columnTitle: "Income2018",
        sheets: [
            {name: "ResearchIncome", columnIndex: 9},
            {name: "ResearchIncomeInKind", columnIndex: 9}
        ]
    },
    {
        columnTitle: "Income2019",
        sheets: [
            {name: "ResearchIncome", columnIndex: 10},
            {name: "ResearchIncomeInKind", columnIndex: 10}
        ]
    },
    {
        columnTitle: "Circumstances",
        sheets: [{name: "RemoveMinimumOfOneRequests", columnIndex: 5}]
    },
    {
        columnTitle: "SupportingInformation",
        sheets: [
            {name: "RemoveMinimumOfOneRequests", columnIndex: 6},
            {name: "OutputReductionRequests", columnIndex: 7}
        ]
    },
    {
        columnTitle: "TypeOfCircumstance",
        sheets: [{name: "OutputReductionRequests", columnIndex: 5}]
    },
    {
        columnTitle: "TariffBand",
        sheets: [{name: "OutputReductionRequests", columnIndex: 6}]
    }
];

var SHEET_NAMES_TO_QUERY = {
    "ResearchGroup"() {
        let types = [T.Faculty];
        let institutionDepth = O.service("hres:schema:institute_depth");
        if(institutionDepth > 1) { types.push(T.Department); }
        if(institutionDepth > 2) { types.push(T.School); }
        return O.query().link(types, A.Type).sortByTitle().execute();
    },
    "CurrentStaff"() {
        let refEligible = O.behaviourRef("hres:list:ref-eligibility:eligible");
        return O.query().link([T.Researcher, T.Staff, T.ExternalResearcher], A.Type).link(refEligible, A.EligibleForREF).execute();
    },
    "FormerStaff"() {
        let refEligible = O.behaviourRef("hres:list:ref-eligibility:eligible");
        return O.query().link([T.ResearcherPast, T.StaffPast], A.Type).link(refEligible, A.EligibleForREF).execute();
    },
    "FormerStaffContract"() {
        return this.FormerStaff();
    },
    "Output"() {
        let types = SCHEMA.getTypesWithAnnotation("hres:annotation:repository-item");
        let intendToSubmit = O.behaviourRef("hres:list:ref-submission-intention:intend-to-submit");
        let query = O.query().
            link(types, A.Type);

        if("DoubleWeightingSubstitute" in A) {
            query.or((sq) => {
                sq.link(intendToSubmit, A.SubmissionIntention).
                    linkFromQuery(A.DoubleWeightingSubstitute, (sqq) => {
                        sqq.link(types, A.Type);
                    });
            });
        } else {
            query.link(intendToSubmit, A.SubmissionIntention);
        }
        return query.execute();
    },
    "StaffOutputLink"(context) {
        let outputs = this.Output();
        return _.map(outputs, (output) => {
            let linkedStaffMember = getFactFromCollectionForObject(output, "repository_items", "refSubmittingAuthor");
            if(!linkedStaffMember) {
                linkedStaffMember = output.first(A.Author);
            }
            let refStr = linkedStaffMember.toString();
            if(!(refStr in context)) { context[refStr] = []; }
            context[refStr].push(output.ref.toString());
            return linkedStaffMember.load();
        });
    },
    "ImpactCaseStudy"() {
        if("Impact" in T) {
            return O.query().link(T.Impact, A.Type).execute();
        } else {
            return [];
        }
    },
    "ImpactCaseStudyGrants"() {
        if("Impact" in T) {
            return O.query().link(T.Impact, A.Type).execute();
        } else {
            return [];
        }
    },
    "ImpactCaseStudyContacts"() {
        if("Impact" in T) {
            return O.query().link(T.Impact, A.Type).execute();
        } else {
            return [];
        }
    },
    "ResearchDoctoralsAwarded"() {
        return []; // Relevant column information not stored.
    },
    "ResearchIncome"() {
        return []; // Relevant column information not stored.
    },
    "ResearchIncomeInKind"() {
        return []; // Relevant column information not stored.
    },
    "RemoveMinimumOfOneRequests"() {
        return []; // Uncommon so best to fill in manually
    },
    "OutputReductionRequests"() {
        return []; // Uncommon so best to fill in manually
    }
};

// --------------------------------------------------------------------------
// Handlers
// --------------------------------------------------------------------------

var DOWNLOAD_EXPORT_WORK_TYPE = "hres_ref_submission:download";

P.workUnit({
    workType: "download",
    description: "Download REF submission export",
    render(W) {
        if(W.context === "object") { return; }
        W.render({
            fullInfo: "/do/hres-ref-submission/export",
        }, "download-export");
    }
});

P.implementService("std:action_panel:activity:menu:ref", function(display, builder) {
    if(O.currentUser.allowed(CanExportREFSubmission)) {
        builder.panel(900).
            title("REF Submission").
            link(500, "/do/hres-ref-submission/export", "REF submission system export");
    }
});

P.respond("GET,POST", "/do/hres-ref-submission/export", [
], function(E) {
    CanExportREFSubmission.enforce();
    if(!UKPRN) { throw new Error("Institution UKPRN not set."); }
    if(E.request.method === "POST" && !P.data.exportRunning) {
        let user = O.currentUser;
        O.impersonating(O.SYSTEM, () => O.background.run("hres_ref_submission:generate_export", {
            userId: user.id
        }));
        P.data.exportRunning = true;
        E.response.redirect("/do/hres-ref-submission/export");
    }
    let builder = O.ui.panel();
    let taskPanel = builder.panel(10);
    let downloadPanel = builder.panel(25);
    let downloadTask = O.work.query(DOWNLOAD_EXPORT_WORK_TYPE).latest();
    if(downloadTask) {
        taskPanel.element(0, {
            title: "Status",
            label: "Waiting for download by " + downloadTask.actionableBy.name
        });
        if(downloadTask.isActionableBy(O.currentUser)) {
            taskPanel.element(1, {
                href: "/do/hres-ref-submission/downloaded/" + downloadTask.id,
                label: "Confirm export downloaded",
                indicator: "primary"
            });
        }
    }

    let allExports = P.db.exports.select().order("date", true);
    _.each(allExports, (exportsRow, i) => {
        let exportDate = new XDate(exportsRow.date);
        downloadPanel.element(10+i, {
            href: exportsRow.file.url({authenticationSignature: true}),
            label: P.template("download-label").render({date: exportDate, generatingUser: exportsRow.generatingUser})
        });
    });

    if(allExports.length) {
        downloadPanel.element(0, {title: "Download Exports"});
        E.renderIntoSidebar(builder.deferredRender(), "std:render");
    }

    E.render({
        pageTitle: "Export REF submission spreadsheet",
        backLink: "/",
        // text & message don't interact as they are used by different templates
        text: "Would you like to export the REF submission spreadsheet?",
        message: "Export in progress, you will receive a task when this is complete.",
        options: [{label: "Generate new export"}]
    }, P.data.exportRunning ? "std:ui:notice" : "std:ui:confirm");
});

P.respond("GET,POST", "/do/hres-ref-submission/downloaded", [
    {pathElement:0, as: "workUnit"}
], function(E, downloadTask) {
    if(E.request.method === "POST") {
        downloadTask.close(O.currentUser).save();
        E.response.redirect("/do/hres-ref-submission/export");
    }
    E.render({
        pageTitle: "Confirm export has been downloaded",
        backLink: "/do/hres-ref-submission/export",
        text: "Confirming the export has been downloaded will remove the task for all REF Managers. "+
            "You can still return and download the export again.",
        options: [{label: "Export downloaded"}]
    }, "std:ui:confirm");
});

// --------------------------------------------------------------------------
// Export generation
// --------------------------------------------------------------------------

P.db.table("exports", {
    generatingUser: {type:"user"},
    file: {type:"file"},
    date: {type:"datetime"}
});

P.backgroundCallback("generate_export", function(data) {
    let submission = O.generate.table.xlsx("REF Submission");
    let sheetNames = _.keys(SHEET_NAMES_TO_QUERY);
    let refUoAs = O.query().link(T.REFUnitOfAssessment, A.Type).execute();
    var getValueFromExportBuilder = function(object, column, context) {
        let cellValue;
        if(column.getValue) {
            cellValue = column.getValue(object, context);
        } else if(column.fact && column.collection) {
            let factValue = getFactFromCollectionForObject(object, column.collection, column.fact);
            // ref values are transformed to descriptiveTitle when added to the xls table.
            // Transforming in advance to allow column restrictions to perform as expected.
            cellValue = O.isRef(factValue) ? factValue.load().descriptiveTitle : factValue;
        } else if(column.descName && column.descName in A) {
            let descValue = object.first(A[column.descName]);
            if(descValue) {
                cellValue = descValue.toString();
            }
        }
        if(column.restrict && cellValue) {
            cellValue = column.restrict(cellValue);
        }
        return cellValue;
    };

    _.each(sheetNames, (sheetName) => {
        let sheetColumns = _.chain(EXPORT_BUILDER).
            filter((columnToExport) => {
                return _.any(columnToExport.sheets, (sheet) => {
                    return _.contains([SPECIAL_SHEET_NAMES.ALL, sheetName], sheet.name);
                });
            }).
            sortBy((columnToExport) => {
                return _.find(columnToExport.sheets, (sheet) => {
                    return _.contains([SPECIAL_SHEET_NAMES.ALL, sheetName], sheet.name);
                }).columnIndex;
            }).
            value();

        let headers = _.pluck(sheetColumns, "columnTitle");
        submission.newSheet(sheetName, true);
        _.each(headers, (header) => submission.cell(header));
        submission.nextRow();
        let context = {};
        let results = SHEET_NAMES_TO_QUERY[sheetName](context);
        // Repeating all research groups for every uoa so that they are entered into every submission
        if(sheetName === "ResearchGroup") {
            let seen = {};
            _.each(results, (object) => {
                let normalisedTitle = normaliseTitle(object.title);
                // Only print first seen group, and others with the same name will have the same code.
                // Prevents submission system error R005
                if(!(normalisedTitle in seen)) {
                    seen[normalisedTitle] = true;
                    _.each(refUoAs, (uoa) => {
                        let hasContent = false;
                        _.each(sheetColumns, (column) => {
                            let matchingSheet = _.find(column.sheets, (sheet) => {
                                return _.contains([SPECIAL_SHEET_NAMES.ALL, sheetName], sheet.name);
                            });
                            let cellValue;
                            if(column.columnTitle === "UnitOfAssessment") {
                                let behaviour = uoa.ref.behaviour;
                                if(!behaviour) { return; }
                                let behaviourSplit = behaviour.toString().split(":");
                                // The uoa behaviours are of form hres:list:ref-unit-of-assessment-2021:[UoA Number]:[UoA Title]
                                cellValue = parseInt(behaviourSplit[3], 10);
                            } else {
                                cellValue = getValueFromExportBuilder(object, column, context);
                            }
                            if(cellValue) { hasContent = true; }
                            submission[matchingSheet.columnIndex] = cellValue;
                        });
                        // Preventing empty rows
                        if(hasContent) {
                            submission.nextRow();
                        }
                    });
                }
            });
            return;
        }
        _.each(results, (object) => {
            let hasContent = false;
            _.each(sheetColumns, (column) => {
                let matchingSheet = _.find(column.sheets, (sheet) => {
                    return _.contains([SPECIAL_SHEET_NAMES.ALL, sheetName], sheet.name);
                });

                let cellValue = getValueFromExportBuilder(object, column, context);
                if(cellValue) { hasContent = true; }
                submission[matchingSheet.columnIndex] = cellValue;
            });
            // Preventing empty rows
            if(hasContent) {
                submission.nextRow();
            }
        });
    });

    let file = O.file(submission.finish());
    P.db.exports.create({
        generatingUser: O.user(data.userId),
        file: file,
        date: new Date()
    }).save();
    P.data.exportRunning = false;

    let existingWu = O.work.query(DOWNLOAD_EXPORT_WORK_TYPE).latest();
    if(existingWu) { return; }
    let wu = O.work.create({
        workType: DOWNLOAD_EXPORT_WORK_TYPE,
        actionableBy: Group.REFManagers
    }).save();
});