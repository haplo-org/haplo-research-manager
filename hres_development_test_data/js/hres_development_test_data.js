/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


var CanGenerateTestData = O.action("hres:development:generate-test-data").
    title("Can create test data").
    allow("group", Group.Administrators);

P.implementService("std:action_panel:home_page", function(display, builder) {
    if(O.currentUser.allowed(CanGenerateTestData)) {
        if(P.data.status === "running") {
            builder.panel(100).element("default", {label:"Generating test data...", indicator:"terminal"});
        } else if (P.data.status === "failed") {
            builder.panel(10000).
                link("default", '/do/hres-development-test-data/failed', 'Test data generation failed', 'terminal').
                link("top", '/do/hres-development-test-data/generate?debug=1', 'Debug: Generate test data', 'secondary').
                link("top", "/do/hres-development-test-data/delete-data", "Delete generated data", 'terminal');
        } else if(P.data.status === "done") {
            builder.panel(100).
                element("top", {"label": "Data generation complete"}).
                link("top", '/do/hres-development-test-data/generate?debug=1', 'Debug: Generate test data', 'secondary').
                link("top", "/do/hres-development-test-data/delete-data", "Delete generated data", 'terminal');
        } else {
            builder.panel(100).
                link("top", '/do/hres-development-test-data/generate', 'Generate test data', 'primary').
                link("top", '/do/hres-development-test-data/generate?debug=1', 'Debug: Generate test data', 'secondary').
                link("top", '/do/hres-development-test-data/delete-data', 'Delete all test data', 'terminal');
        }
    }
});

P.respond("GET,POST", "/do/hres-development-test-data/generate", [
    {parameter:"level", as:"int", optional:true},
    {parameter:"debug", as:"int", optional:true}
], function(E, level, debug) {
    CanGenerateTestData.enforce();
    if(!debug && O.query().link([T.Person],A.Type).setSparseResults(true).execute().length) {
        O.stop("There's some data already in this application.");
    }
    if(E.request.method === "GET") {
        let render, existingDepth;
        let haveAny = function(type) {
            return 0 !== O.query().linkDirectly(type, A.Type).limit(1).execute().length;
        };
        if(haveAny(T.School)) { existingDepth = 3; }
        else if(haveAny(T.Department)) { existingDepth = 2; }
        else if(haveAny(T.Faculty)) { existingDepth = 1; }
        let debugText = debug ? "\nYou are in debug mode, which will create at most approx 5 people of each type on an RI at the lowest level you select." : "\nThis will take some time.";
        if(existingDepth) {
            render = {
                pageTitle: "Generate test data?",
                backLink: "/",
                text: "Would you like to initialise this development application with test data?\nAn existing institution structure of "+existingDepth+" has been detected.\nTest data generation will use this existing structure."+debugText,
                options: [
                    {label:"Generate",parameters:{level:existingDepth}}
                ]
            };
        } else {
            var options = [
                {label:"Faculty",parameters:{level:1}},
                {label:"Faculty/Department",parameters:{level:2}},
                {label:"Faculty/Department/School",parameters:{level:3}}
            ];
            O.serviceMaybe("hres_development_test_data:additional_institute_structure_options", function(label, level) {
                options.push({label:label,parameters:{level:level}});
            });
            render = {
                pageTitle: "Generate test data?",
                backLink: "/",
                text: "Would you like to initialise this development application with test data?\nClick the button corresponding to the institution structure depth. Most institutions are two level."+debugText,
                options: options
            };
        }
        return E.render(render, "std:ui:confirm");
    }
    O.background.run("hres_development_test_data:generate", {level:level||2, debug:debug});
    P.data.status = "running";
    P.data.start = P.data.start || new Date().toString();
    E.response.redirect("/do/hres-development-test-data/done");
});

P.respond("GET,POST", "/do/hres-development-test-data/done", [
], function(E) {
    E.render({
        pageTitle: "Generating...",
        backLink: "/",
        message: "Test data is being generated in the background."
    }, "std:ui:notice");
});

P.respond("GET,POST", "/do/hres-development-test-data/failed", [
], function(E) {
    let error;
    if(P.data.error) {
        error = P.data.error.message+", file:"+P.data.error.fileName+", line:"+P.data.error.lineNumber;
    }
    E.render({
        pageTitle: "Test data generation failed",
        backLink: "/",
        html: "<p>Test data generation failed with the following error: "+(error || "No error found")+". You can regenerate data <a href=\"/do/hres-development-test-data/generate\">here</a>. This will not work if some data was already generated.</p>"
    }, "std:ui:notice");
});

P.respond("GET,POST", "/do/hres-development-test-data/delete-data", [
    {parameter:"from", as:"string", optional:true}
], function(E, from) {
    CanGenerateTestData.enforce();
    if(P.data.status === "running") { O.stop("Please wait for the data to be generated before deleting it."); }
    if(P.data.deletionStatus === "running") { O.stop("Deletion in progress"); }
    from = from || P.data.start;
    let generationStarted = new Date(from);
    if(E.request.method === "GET") {
        return E.render({
            pageTitle: "Delete data?",
            backLink: "/",
            text: "Would you like to delete all data created since "+generationStarted.toString()+"?\nNB: this doesn't reset roles assigned to RIs",
            options: [{
                label: "Delete data"
            }]
        }, "std:ui:confirm");
    }
    O.background.run("hres_development_test_data:delete", {from:from});
    P.data.deletionStatus = "running";
    E.response.redirect("/");
});

P.respond("GET", "/do/hres-development-test-data/data-deletion-status", [
], function(E) {
    E.render({
        pageTitle: "Data deletion status",
        backLink: "/",
        message: "Status: "+P.data.deletionStatus+"\nError: "+P.data.deletionError
    }, "std:ui:notice");
});

// --------------------------------------------------------------------------

P.backgroundCallback("generate", function(data) {
    O.impersonating(O.SYSTEM, function() {
        try{
            generateTestData(data.level||2, !!data.debug);
        } catch(e) {
            P.data.status = "failed";
            P.data.error = e;
        }
    });
});

P.backgroundCallback("delete", function(data) {
    O.impersonating(O.SYSTEM, function() {
        try {
            let from = new XDate(data.from);
            O.query().linkToAny(A.Type).execute().each(object => {
                let created = new XDate(object.creationDate);
                if(from.diffSeconds(created) > 0) {
                    object.deleteObject();
                }
                // enhancement: revert objects modified since 'from' date to last version before 'from'
            });
            P.data.deletionStatus = "done";
        } catch(e) {
            P.data.deletionStatus = "failed";
            P.data.deletionError = e;
        }
    });
});

// --------------------------------------------------------------------------

const JOINING_WORDS = ['and', 'of', 'by', 'the', 'a', 'that', 'on', 'where'];

var generateTestData = function(instituteStructureDepth, debug) {
    var peopleTypesLeaf = [];
    var peopleTypesNonLeaf = [];
    var usedNames = {}, usedProjectNames = {};
    var instituteInfo = O.refdict();
    var generator = {
        randomDistributedValue: randomDistributedValue, // useful for consumers
        randomDateInPeriod: randomDateInPeriod,
        instituteStructureDepth: instituteStructureDepth,
        instituteRoles: [],
        committeeTypes: [],
        usersInGroups: [], 
        addInstituteRole: function(desc, qual, type, max) {
            this.instituteRoles.push({desc:desc, qual:qual, type:type, max:max||1});
        },
        addCommitteeType: function(type, instituteType, titleSuffix, probability) {
            this.committeeTypes.push({type:type, instituteType:instituteType, titleSuffix:titleSuffix, probability:probability});
        },
        addUsersInGroups: function(count, destinationGroup, sourceGroup) {
            this.usersInGroups.push({count:count, destinationGroup:destinationGroup, sourceGroup:sourceGroup});
        },
        setPeopleTypes: function(types, nonLeaf) {
            (nonLeaf ? peopleTypesNonLeaf : peopleTypesLeaf).push(types);
        },
        randomListMember: function(list) {
            return list[Math.floor(Math.random()*list.length)];
        },
        withSomeRandomListMembers: function(min, max, list, fn) {
            var number = Math.round(min + ((max-min)*Math.random()));
            var seenElements = {};
            var count = 0, safety = number + 20;
            while((--safety > 0) && (count < number)) {
                var x = Math.floor(Math.random()*list.length);
                if(!seenElements[x]) {
                    fn(list[x]);
                    seenElements[x] = true;
                    count++;
                }
            }
        },
        // Used for eg. citations
        randomNewPersonName: function() {
            var name;
            while(true) {
                name = randomPersonName();
                var nn = name.join(' ');
                if(!(nn in usedNames)) { usedNames[nn] = true; break; }
            }
            return name;
        },
        NOUNS: P.loadFile("nouns.json").readAsJSON(),
        randomProjectName: function() {
            while(true) {
                var t = _.shuffle(randomChoices(this.NOUNS, 2, 8).concat(randomChoices(JOINING_WORDS, 1, 3))).join(' ');
                t = t.charAt(0).toUpperCase() + t.substring(1);
                if(!(t in usedProjectNames)) {
                    usedProjectNames[t] = true;
                    return t;
                }
            }
        },
        randomParagraphText: function() {
            var numParas = Math.round(1 + (4*Math.random()));
            var paras = [];
            for(var p = 0; p < numParas; ++p) {
                var sentences = [];
                var numSentences = Math.round(2 + (2*Math.random()));
                for(var s = 0; s < numSentences; ++s) {
                    var t = _.shuffle(randomChoices(this.NOUNS, 3, 8).concat(randomChoices(JOINING_WORDS, 2, 8))).join(' ') + '.';
                    t = t.charAt(0).toUpperCase() + t.substring(1);
                    sentences.push(t);
                }
                paras.push(sentences.join(' '));
            }
            return paras.join("\n\n");
        },
        randomParagraphTextAsDocumentText: function() {
            var str = this.randomParagraphText();
            var paras = str.split("\n\n");
            paras = _.map(paras, function(p) {
                return "<p>"+p+"</p>";
            });
            return O.text(O.T_TEXT_DOCUMENT, "<doc>"+paras.join("")+"</doc>");
        },
        createPerson: function(institute, spec) {
            var name = this.randomNewPersonName();
            name[0] = randomDistributedValue(spec[name[0]]); // M or F, choose title
            var email = ((name[1]+'.'+name[2]).replace(/[^a-zA-Z0-9\.]/g,'')+'@example.org').toLowerCase();
            var n = {first:name[1],last:name[2]};
            if(name[0]) { n.title = name[0]; }
            var person = O.object();
            person.appendType(spec.type);
            person.appendTitle(O.text(O.T_TEXT_PERSON_NAME,n));
            person.append(O.text(O.T_IDENTIFIER_EMAIL_ADDRESS, email), A.EmailAddress);
            if(institute) {
                person.append(institute, A.ResearchInstitute);
            }
            O.serviceMaybe("hres_development_test_data:amend_created_person", this, person);
            person.save();
            // User account
            var userDetails = {
                email: email,
                nameFirst: name[1],
                nameLast: name[2],
                groups: spec.groups,
                ref: person.ref
            };
            O.setup.createUser(userDetails);
            if(spec.postCreate) {
                spec.postCreate(person);
            }
            return person;
        },
        randomPersonFromInstitute: function(institutionRef, typeOfPerson) {
            var i = instituteInfo.get(institutionRef);
            if(!i) { return; }
            return randomMember(i.people.get(typeOfPerson));
        },
        addPersonFromInstitute: function(institutionRef, typeOfPerson, object, desc, qual) {
            var person = this.randomPersonFromInstitute(institutionRef, typeOfPerson);
            if(!person || object.has(person.ref, desc, qual)) { return; }
            object.append(person.ref, desc, qual);
        },
        randomPeopleFromInstitute: function(min, max, institutionRef, typeOfPerson) {
            var people = [], seen = {};
            var number = Math.round(min + ((max-min)*Math.random()));
            for(var x = 0; x < number; ++x) {
                var person = this.randomPersonFromInstitute(institutionRef, typeOfPerson);
                if(person && !seen[person.ref.toString()]) {
                    people.push(person);
                    seen[person.ref.toString()] = true;
                }
            }
            return people;
        },
        addSomePeopleFromInstitute: function(min, max, institutionRef, typeOfPerson, object, desc, qual) {
            var number = Math.round(min + ((max-min)*Math.random()));
            for(var x = 0; x < number; ++x) {
                this.addPersonFromInstitute(institutionRef, typeOfPerson, object, desc, qual);
            }
        },
        debug: debug
    };

    generator.setPeopleTypes({
        type: T.Researcher,
        groups: [Group.Researchers],
        min: 4,
        max: 46,
        M: [0.8,"Dr",1,"Prof"],
        F: [0.7,"Dr",1,"Prof"]
    });
    generator.setPeopleTypes({
        type: T.Researcher,
        groups: [Group.Researchers],
        min: 0,
        max: 4,
        M: [0.8,"Dr",1,"Prof"],
        F: [0.7,"Dr",1,"Prof"]
    }, true);   // non-leaf

    var ADMIN_STAFF_SPEC = {
        type: T.Staff,
        groups: [Group.AdminStaff],
        min: 0,
        max: 8,
        M: [0.1,"",1,"Mr"],
        F: [0.1,"",0.7,"Ms",1,"Mrs"]
    };
    generator.setPeopleTypes(ADMIN_STAFF_SPEC); // put a few staff on institutes, just to make things more interesting

    generator.addInstituteRole(A.Head, undefined, T.Researcher);
    generator.addInstituteRole(A.ResearchDirector, undefined, T.Researcher);
    generator.addInstituteRole(A.ResearchAdministrator, undefined, T.Staff, 2);

    let institutionalStructureExists = function() {
        return (O.query().link(T.University, A.Type).setSparseResults(true).execute().length !== 0);
    };

    O.impersonating(O.SYSTEM, function() {
        // Make sure there's some academic years in the future
        var representativeDateForAcademicYear = new XDate(new Date());
        for(var yy = 0; yy < 4; ++yy) {
            O.service("hres:academic_year:for_date", representativeDateForAcademicYear.toDate());
            representativeDateForAcademicYear.addYears(1);
        }

        // Other plugins can do some initialisation to start.
        if(O.serviceImplemented("hres:development:generate-test-data-start")) {
            O.service("hres:development:generate-test-data-start", generator);
        }

        // Generate institution structure
        var institutes = [];
        var instituteParents = [];
        var instituteTypes = [T.University, T.Faculty, T.Department, T.School];
        // Check for existing structure
        if(institutionalStructureExists()) {
            // Use the existing structure for generation
            var instituteQuery = O.query().link(T.ResearchInstitute, A.Type).execute();
            _.each(instituteQuery, function(ri) {
                var level = instituteTypes.indexOf(ri.type);
                var i = {
                    object: ri,
                    level: level,
                    isLeaf: true,
                    children: [],
                    people: O.refdict(function() { return []; })   // people by type
                };
                if(level > 0) {
                    var pi = instituteParents[level - 1];
                    pi.isLeaf = false;
                    pi.children.push(i);
                    i.parent = pi;
                }
                institutes.push(i);
                instituteInfo.set(ri.ref, i);
                instituteParents[level] = i;
            });
        } else {
            // Otherwise generate a new institution structure
            var instituteStructure = O.serviceMaybe("hres_development_test_data:custom_institute_structure") ||
                P.loadFile("institute_structure.txt").readAsString("UTF-8");
            _.each(instituteStructure.split(/[\r\n]+/), function(line) {
                var m = line.match(/^([\*\s]*)\s*(.+)\s*$/);
                if(m) {
                    var level = m[1].replace(/\s+/g,'').length;
                    if(level <= instituteStructureDepth) {
                        var name = m[2];
                        var institute = O.object();
                        institute.appendType(instituteTypes[level] || T.ResearchInstitute);
                        institute.appendTitle(name);
                        var i = {
                            object: institute,
                            level: level,
                            isLeaf: true,
                            children: [],
                            people: O.refdict(function() { return []; })   // people by type
                        };
                        if(level > 0) {
                            var pi = instituteParents[level - 1];
                            institute.appendParent(pi.object);
                            pi.isLeaf = false;
                            pi.children.push(i);
                            i.parent = pi;
                        }
                        institute.save();
                        institutes.push(i);
                        instituteInfo.set(institute.ref, i);
                        instituteParents[level] = i;
                    }
                }
            });
        }

        // Make people for all departments
        // in the test case, only make people for one lowest level RI
        var debugPeoplesCreated = false;
        var debugInstituteChanged;
        institutes.forEach(function(info) {
            if(debug) {
                if(debugPeoplesCreated) { return; }
                if(info.level > instituteStructureDepth) { return; }
                var hasPeople = O.query().link(T.Person, A.Type).link(info.object.ref, A.ResearchInstitute).limit(1).execute();
                 // so can run debug a couple of times, generating data for different RIs
                if(hasPeople.length) { return; }
            }
            var peoples = info.isLeaf ? peopleTypesLeaf : peopleTypesNonLeaf;
            peoples.forEach(function(spec) {
                var list = info.people.get(spec.type);
                var max = spec.max;
                if(debug) {
                    max = (spec.min > 5) ? spec.min : 5;
                }
                var count = Math.round(spec.min + (max - spec.min)*Math.random());
                for(var x = 0; x < count; ++x) {
                    list.push(generator.createPerson(info.object, spec));
                }
                // Push people up to the parent
                if(info.parent) {
                    info.parent.people.set(spec.type, info.parent.people.get(spec.type).concat(list));
                }
            });
            if(debug) {
                debugPeoplesCreated = true;
                debugInstituteChanged = info;
            }
        });

        // Make unassociated staff members
        for(var c = 0; c < 70; c++) {
            if(debug) { break; }
            generator.createPerson(undefined, ADMIN_STAFF_SPEC);
        }

        // Put users in groups
        var placedPerson = {};  // track so that people aren't put in two groups
        generator.usersInGroups.forEach(function(i) {
            var sourceList = O.group(i.sourceGroup).loadAllMembers();
            var users = [], safety = (i.count + 256);
            while((--safety > 0) && (users.length < i.count)) {
                var u = sourceList[Math.floor(sourceList.length * Math.random())];
                if(!placedPerson[u.id]) {
                    users.push(u);
                    placedPerson[i.id] = true;
                }
            }
            users.forEach(function(user) {
                user.changeGroupMemberships([i.destinationGroup], null);
            });
        });

        // Update institutions with roles
        institutes.forEach(function(info) {
            if(debugInstituteChanged && (debugInstituteChanged.object.ref != info.object.ref)) { return; }
            var inst = info.object.mutableCopy();
            O.service("hres:development:generate-test-data-update-institute", generator, info, inst);
            inst.save();
            info.object = inst;
        });

        // Committees
        generator.committeeTypes.forEach(function(i) {
            _.each(O.query().linkDirectly(i.instituteType, A.Type).execute(), function(ri) {
                if(debugInstituteChanged && debugInstituteChanged.object.ref != ri.ref) { return; }
                if(Math.random() < i.probability) {
                    var committee = O.object();
                    committee.appendType(i.type);
                    committee.appendTitle(ri.title+' '+i.titleSuffix);
                    committee.append(ri.ref, A.ResearchInstitute);
                    generator.addSomePeopleFromInstitute(4, 8, ri.ref, T.Researcher, committee, A.CommitteeMember);
                    generator.addSomePeopleFromInstitute(1, 2, ri.ref, T.Researcher, committee, A.Chair);
                    generator.addSomePeopleFromInstitute(1, 2, ri.ref, T.Staff,      committee, A.CommitteeRepresentative);
                    committee.save();
                }
            });
        });

        // can run more than once in debug mode, but don't (for now) want to re run this part
        var existingFunders = debug ? O.query().link(T.Funder, A.Type).limit(1).execute() : false;
        if(!existingFunders || !existingFunders.length) {
            // Funders
            var funders = [];
            // Test data taken from http://www.rin.ac.uk/system/files/attachments/List-of-major-UK-research-funders.pdf
            _.each(P.loadFile("test_funders.json").readAsJSON(), function(name) {
                var funder = O.object();
                funder.appendType(T.Funder);
                funder.appendTitle(name);
                funder.save();
                funders.push(funder);
            });
            generator.funders = funders;

            // Taxonomy and other plugins?
            generateTestTaxonomy();
        }
        var ends = [];
        O.serviceMaybe("hres:development:generate-test-data-end", function(sort, fn) { ends.push({sort:sort, fn:fn}); });
        _.sortBy(ends,'sort').forEach(function(x) { x.fn(generator); });
    });

    P.data.status = "done";
};

P.implementService("hres:development:generate-test-data-update-institute", function(generator, info, institute) {
    var chance = 1;
    if(info.level > 1) { chance = 1 / info.level; }
    chance += 0.01;
    generator.instituteRoles.forEach(function(i) {
        if(Math.random() < chance) {
            for(var c = Math.floor(Math.random() * (i.max-0.1)) + 1; c > 0; c--) {
                generator.addPersonFromInstitute(institute.ref, i.type, institute, i.desc, i.qual);
            }
        }
    });
});

// --------------------------------------------------------------------------

var randomDateInPeriod = function(startMonthsFromNow, endMonthsFromNow, precision) {
    var start = new XDate().addMonths(startMonthsFromNow);
    var end = new XDate().addMonths(endMonthsFromNow);
    var ll = start.diffDays(end);
    var date = start.addDays(ll*Math.random());
    switch(precision) {
        case "year": return date.setMonth(0).setDate(1).clearTime();
        case "month": return date.setDate(1).clearTime();
        case "day": return date.clearTime();
        default: return date.clearTime();
    }
};

var randomMember = function(array) {
    return array[Math.floor(Math.random()*array.length)];
};

var randomChoices = function(array, min, max) {
    var n = Math.round(min + (max - min)*Math.random());
    var c = [];
    for(var x = 0; x < n; ++x) {
        c.push(randomMember(array));
    }
    return c;
};

var randomDistributedValue = function(values) {
    var n = Math.random();
    for(var l = 0; l < values.length; l+=2) {
        if(n < values[l]) { return values[l+1]; }
    }
    return values[values.length-1];
};

var SURNAMES, FIRST_NAMES;

var randomPersonName = function() {
    if(!SURNAMES) {
        // Names derived from Mark Kantrowitz' lists of names.
        // http://www.cs.cmu.edu/afs/cs/project/ai-repository/ai/areas/nlp/corpora/names/
        SURNAMES = P.loadFile("surnames.json").readAsJSON();
        FIRST_NAMES = P.loadFile("first_names.json").readAsJSON();
    }
    var surname = randomMember(SURNAMES);
    var first = randomMember(FIRST_NAMES);
    return [first[1],first[0],surname];
};

// --------------------------------------------------------------------------

var TAXONOMIES = [
    {type:T.Location, filename:"test_location.txt"},
    {type:T.Subject, filename:"test_subject.txt"} // Taken from www.hesa.ac.uk/jacs3, using a sample set of each subject area
];

var generateTestTaxonomy = function() {
    TAXONOMIES.forEach(function(taxonomyInfo) {
        var parents = [];
        var taxonomy = P.loadFile(taxonomyInfo.filename).readAsString("UTF-8");
        _.each(taxonomy.split(/[\r\n]+/), function(line) {
            var m = line.match(/^([\*\s]*)\s*(.+)\s*$/);
            if(m) {
                var level = m[1].replace(/\s+/g,'').length;
                var name = m[2];
                var object = O.object();
                object.appendType(taxonomyInfo.type);
                object.appendTitle(name);
                if(level > 0) { object.appendParent(parents[level - 1]); }
                object.save();
                parents[level] = object;
            }
        });
    });
};
