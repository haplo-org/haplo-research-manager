/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


var CanGenerateTestData = O.action("hres:development:generate-test-data").
    title("Can create test data").
    allow("group", Group.Administrators);

P.implementService("std:action_panel:home_page", function(display, builder) {
    if(P.data.status === "done") { return; }
    if(O.currentUser.allowed(CanGenerateTestData)) {
        if(P.data.status === "running") {
            builder.panel(10000).element("default", {label:"Generating test data...", indicator:"terminal"});
        } else {
            builder.panel(10000).
                link("default", '/do/hres-development-test-data/generate', 'Generate test data');
        }
    }
});

P.respond("GET,POST", "/do/hres-development-test-data/generate", [
    {parameter:"level", as:"int", optional:true}
], function(E, level) {
    CanGenerateTestData.enforce();
    if(O.query().link([T.University,T.Person],A.Type).setSparseResults(true).execute().length) {
        O.stop("There's some data already in this application.");
    }
    if(E.request.method === "GET") {
        return E.render({
            pageTitle: "Generate test data?",
            backLink: "/",
            text: "Would you like to initialise this development application with test data?\nClick the button corresponding to the institution structure depth. Most institutions are two level.\nThis will take some time.",
            options: [
                {label:"Faculty",parameters:{level:1}},
                {label:"Faculty/Department",parameters:{level:2}},
                {label:"Faculty/Department/School",parameters:{level:3}}
            ]
        }, "std:ui:confirm");
    }
    O.background.run("hres_development_test_data:generate", {level:level||2});
    P.data.status = "running";
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

// --------------------------------------------------------------------------

P.backgroundCallback("generate", function(data) {
    O.impersonating(O.SYSTEM, function() {
        generateTestData(data.level||2);
    });
});

// --------------------------------------------------------------------------

var generateTestData = function(instituteStructureDepth) {
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
        addInstituteRole: function(desc, type, max) { this.instituteRoles.push({desc:desc, type:type, max:max||1}); },
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
        randomProjectName: function() {
            while(true) {
                var t = _.shuffle(randomChoices(NOUNS, 2, 8).concat(randomChoices(JOINING_WORDS, 1, 3))).join(' ');
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
                    var t = _.shuffle(randomChoices(NOUNS, 3, 8).concat(randomChoices(JOINING_WORDS, 2, 8))).join(' ') + '.';
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
        }
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

    generator.addInstituteRole(A.Head, T.Researcher);
    generator.addInstituteRole(A.ResearchDirector, T.Researcher);
    generator.addInstituteRole(A.ResearchAdministrator, T.Staff, 2);

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
        _.each(INSTITUTE_STRUCTURE.split(/[\r\n]+/), function(line) {
            var m = line.match(/^([\*\s]*)\s*(.+)\s*$/);
            if(m) {
                var level = m[1].replace(/\s+/g,'').length;
                if(level <= instituteStructureDepth) {
                    var name = m[2];
                    var institute = O.object();
                    institute.appendType(instituteTypes[level] || T.ResearchInstitute);
                    institute.appendTitle(name);
                    var i = {object:institute, level:level, isLeaf:true,
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

        // Make people for all departments
        institutes.forEach(function(info) {
            var peoples = info.isLeaf ? peopleTypesLeaf : peopleTypesNonLeaf;
            peoples.forEach(function(spec) {
                var list = info.people.get(spec.type);
                var count = Math.round(spec.min + (spec.max - spec.min)*Math.random());
                for(var x = 0; x < count; ++x) {
                    list.push(generator.createPerson(info.object, spec));
                }
                // Push people up to the parent
                if(info.parent) {
                    info.parent.people.set(spec.type, info.parent.people.get(spec.type).concat(list));
                }
            });
        });

        // Make unassociated staff members
        for(var c = 0; c < 70; c++) {
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
            var inst = info.object.mutableCopy();
            O.service("hres:development:generate-test-data-update-institute", generator, info, inst);
            inst.save();
            info.object = inst;
        });

        // Committees
        generator.committeeTypes.forEach(function(i) {
            _.each(O.query().linkDirectly(i.instituteType, A.Type).execute(), function(ri) {
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

        // Funders
        var funders = [];
        _.each(TEST_FUNDERS, function(name) {
            var funder = O.object();
            funder.appendType(T.Funder);
            funder.appendTitle(name);
            funder.save();
            funders.push(funder);
        });
        generator.funders = funders;

        // Taxonomy and other plugins?
        generateTestTaxonomy();
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
                generator.addPersonFromInstitute(institute.ref, i.type, institute, i.desc);
            }
        }
    });
});

var INSTITUTE_STRUCTURE = "University of Example\n"+
"* Science and Technology\n"+
"* * Computer Science\n"+
"* * Engineering\n"+
"* * * Civil Engineering\n"+
"* * * Architecture\n"+
"* * Life Sciences\n"+
"* * * Medical\n"+
"* Humanities\n"+
"* * English\n"+
"* * * Literature\n"+
"* * Law\n"+
"* * Politics\n"+
"* * * Government\n"+
"* * * European Politics\n"+
"* * * American Politics\n"+
"* * History\n"+
"* Media\n"+
"* * Art and Design\n"+
"* * Journalism\n"+
"* * Music";

// --------------------------------------------------------------------------
// Taken from http://www.rin.ac.uk/system/files/attachments/List-of-major-UK-research-funders.pdf
var TEST_FUNDERS = [
    "Arts and Humanities Research Council",
    "Biotechnology and Biological Sciences Research Council",
    "Council for the Central Laboratory of the Research Councils",
    "Engineering and Physical Sciences Research Council",
    "Economic and Social Research Council",
    "Medical Research Council",
    "Natural Environment Research Council",
    "Particle Physics and Astronomy Research Council",
    "Science and Technology Facilities Council",
    "Academies",
    "British Academy",
    "Royal Academy of Engineering",
    "Royal Society",
    "Major Medical Research Charities",
    "Arthritis Research Campaign",
    "British Heart Foundation",
    "Cancer Research UK",
    "Wellcome Trust",
    "Leverhulme Trust",
    "Nuffield Foundation",
    "Joint Information Systems Committee"
];

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

var randomPersonName = function() {
    var surname = randomMember(SURNAMES);
    var first = randomMember(FIRST_NAMES);
    return [first[1],first[0],surname];
};

var SURNAMES = [
  "Abbott",
  "Adams",
  "Ahmed",
  "Akhtar",
  "Alexander",
  "Ali",
  "Allan",
  "Allen",
  "Anderson",
  "Andrews",
  "Archer",
  "Armstrong",
  "Arnold",
  "Ashton",
  "Atkins",
  "Atkinson",
  "Austin",
  "Bailey",
  "Baker",
  "Baldwin",
  "Ball",
  "Banks",
  "Barber",
  "Barker",
  "Barlow",
  "Barnes",
  "Barnett",
  "Barrett",
  "Barry",
  "Bartlett",
  "Barton",
  "Bates",
  "Baxter",
  "Begum",
  "Bell",
  "Bennett",
  "Benson",
  "Bentley",
  "Berry",
  "Bibi",
  "Birch",
  "Bird",
  "Bishop",
  "Black",
  "Blackburn",
  "Blake",
  "Bolton",
  "Bond",
  "Booth",
  "Bowen",
  "Boyle",
  "Bradley",
  "Bradshaw",
  "Brady",
  "Bray",
  "Brennan",
  "Briggs",
  "Brookes",
  "Brooks",
  "Brown",
  "Browne",
  "Bryan",
  "Bryant",
  "Buckley",
  "Bull",
  "Burgess",
  "Burke",
  "Burns",
  "Burrows",
  "Burton",
  "Butcher",
  "Butler",
  "Byrne",
  "Cameron",
  "Campbell",
  "Carpenter",
  "Carr",
  "Carroll",
  "Carter",
  "Cartwright",
  "Chadwick",
  "Chamberlain",
  "Chambers",
  "Chan",
  "Chandler",
  "Chapman",
  "Charlton",
  "Clark",
  "Clarke",
  "Clayton",
  "Clements",
  "Coates",
  "Cole",
  "Coleman",
  "Coles",
  "Collier",
  "Collins",
  "Connolly",
  "Conway",
  "Cook",
  "Cooke",
  "Cooper",
  "Cox",
  "Crawford",
  "Cross",
  "Cunningham",
  "Curtis",
  "Dale",
  "Daly",
  "Daniels",
  "Davey",
  "Davidson",
  "Davies",
  "Davis",
  "Davison",
  "Dawson",
  "Day",
  "Dean",
  "Dennis",
  "Dickinson",
  "Dixon",
  "Dobson",
  "Dodd",
  "Doherty",
  "Donnelly",
  "Douglas",
  "Doyle",
  "Duffy",
  "Duncan",
  "Dunn",
  "Dyer",
  "Edwards",
  "Elliott",
  "Ellis",
  "Evans",
  "Farmer",
  "Farrell",
  "Faulkner",
  "Ferguson",
  "Field",
  "Finch",
  "Fisher",
  "Fitzgerald",
  "Fleming",
  "Fletcher",
  "Flynn",
  "Ford",
  "Foster",
  "Fowler",
  "Fox",
  "Francis",
  "Franklin",
  "Fraser",
  "Freeman",
  "French",
  "Frost",
  "Fuller",
  "Gallagher",
  "Gardiner",
  "Gardner",
  "Garner",
  "George",
  "Gibbons",
  "Gibbs",
  "Gibson",
  "Gilbert",
  "Giles",
  "Gill",
  "Glover",
  "Goddard",
  "Godfrey",
  "Goodwin",
  "Gordon",
  "Gough",
  "Gould",
  "Graham",
  "Grant",
  "Gray",
  "Green",
  "Greenwood",
  "Gregory",
  "Griffin",
  "Griffiths",
  "Hale",
  "Hall",
  "Hamilton",
  "Hammond",
  "Hancock",
  "Hanson",
  "Harding",
  "Hardy",
  "Harper",
  "Harris",
  "Harrison",
  "Hart",
  "Hartley",
  "Harvey",
  "Hawkins",
  "Hayes",
  "Haynes",
  "Hayward",
  "Heath",
  "Henderson",
  "Henry",
  "Herbert",
  "Hewitt",
  "Hicks",
  "Higgins",
  "Hill",
  "Hilton",
  "Hobbs",
  "Hodgson",
  "Holden",
  "Holland",
  "Holloway",
  "Holmes",
  "Holt",
  "Hooper",
  "Hope",
  "Hopkins",
  "Horton",
  "Houghton",
  "Howard",
  "Howarth",
  "Howe",
  "Howell",
  "Hudson",
  "Hughes",
  "Humphreys",
  "Hunt",
  "Hunter",
  "Hurst",
  "Hussain",
  "Hutchinson",
  "Iqbal",
  "Jackson",
  "James",
  "Jarvis",
  "Jenkins",
  "Jennings",
  "John",
  "Johnson",
  "Johnston",
  "Jones",
  "Jordan",
  "Joyce",
  "Kaur",
  "Kay",
  "Kelly",
  "Kemp",
  "Kennedy",
  "Kent",
  "Kerr",
  "Khan",
  "King",
  "Kirby",
  "Kirk",
  "Knight",
  "Knowles",
  "Lamb",
  "Lambert",
  "Lane",
  "Law",
  "Lawrence",
  "Lawson",
  "Leach",
  "Lee",
  "Lewis",
  "Little",
  "Lloyd",
  "Long",
  "Lowe",
  "Lucas",
  "Lynch",
  "Lyons",
  "Macdonald",
  "Mahmood",
  "Mann",
  "Manning",
  "Marsden",
  "Marsh",
  "Marshall",
  "Martin",
  "Mason",
  "Matthews",
  "May",
  "Mccarthy",
  "Mcdonald",
  "Metcalfe",
  "Miah",
  "Middleton",
  "Miles",
  "Miller",
  "Mills",
  "Mitchell",
  "Moore",
  "Moran",
  "Morgan",
  "Morley",
  "Morris",
  "Morrison",
  "Morton",
  "Moss",
  "Murphy",
  "Murray",
  "Myers",
  "Nash",
  "Naylor",
  "Nelson",
  "Newman",
  "Newton",
  "Nicholls",
  "Nicholson",
  "Nixon",
  "Noble",
  "Nolan",
  "Norman",
  "Norris",
  "Norton",
  "Oliver",
  "Osborne",
  "Owen",
  "Owens",
  "Page",
  "Palmer",
  "Parker",
  "Parkin",
  "Parkinson",
  "Parry",
  "Parsons",
  "Patel",
  "Patterson",
  "Payne",
  "Peacock",
  "Pearce",
  "Pearson",
  "Perkins",
  "Perry",
  "Peters",
  "Phillips",
  "Pickering",
  "Pollard",
  "Poole",
  "Pope",
  "Porter",
  "Potter",
  "Powell",
  "Power",
  "Pratt",
  "Preston",
  "Price",
  "Pritchard",
  "Pugh",
  "Quinn",
  "Rahman",
  "Randall",
  "Read",
  "Reed",
  "Rees",
  "Reeves",
  "Reid",
  "Reynolds",
  "Rhodes",
  "Rice",
  "Richards",
  "Richardson",
  "Riley",
  "Roberts",
  "Robertson",
  "Robinson",
  "Robson",
  "Rogers",
  "Rose",
  "Ross",
  "Rowe",
  "Rowley",
  "Russell",
  "Ryan",
  "Sanders",
  "Sanderson",
  "Saunders",
  "Savage",
  "Schofield",
  "Scott",
  "Shah",
  "Sharp",
  "Sharpe",
  "Shaw",
  "Shepherd",
  "Sheppard",
  "Short",
  "Simmons",
  "Simpson",
  "Sims",
  "Sinclair",
  "Singh",
  "Skinner",
  "Slater",
  "Smart",
  "Smith",
  "Spencer",
  "Stanley",
  "Steele",
  "Stephens",
  "Stephenson",
  "Stevens",
  "Stevenson",
  "Stewart",
  "Stokes",
  "Stone",
  "Sullivan",
  "Sutton",
  "Swift",
  "Sykes",
  "Talbot",
  "Taylor",
  "Thomas",
  "Thompson",
  "Thomson",
  "Thornton",
  "Thorpe",
  "Todd",
  "Tomlinson",
  "Townsend",
  "Tucker",
  "Turnbull",
  "Turner",
  "Tyler",
  "Vaughan",
  "Vincent",
  "Wade",
  "Walker",
  "Wall",
  "Wallace",
  "Wallis",
  "Walsh",
  "Walters",
  "Walton",
  "Ward",
  "Warner",
  "Warren",
  "Waters",
  "Watkins",
  "Watson",
  "Watts",
  "Webb",
  "Webster",
  "Welch",
  "Wells",
  "West",
  "Weston",
  "Wheeler",
  "White",
  "Whitehead",
  "Whitehouse",
  "Whittaker",
  "Wilkins",
  "Wilkinson",
  "Williams",
  "Williamson",
  "Willis",
  "Wilson",
  "Winter",
  "Wong",
  "Wood",
  "Woods",
  "Woodward",
  "Wright",
  "Yates",
  "Young"
];

// Names derived from Mark Kantrowitz' lists of names.
// http://www.cs.cmu.edu/afs/cs/project/ai-repository/ai/areas/nlp/corpora/names/

var FIRST_NAMES = [
  ["Margalit","F"],
  ["Luciano","M"],
  ["Darrick","M"],
  ["Justine","F"],
  ["Thibaut","M"],
  ["Romona","F"],
  ["Lowell","M"],
  ["Chadwick","M"],
  ["Lorilyn","F"],
  ["Mordecai","M"],
  ["Jodie","F"],
  ["Marty","M"],
  ["Waldemar","M"],
  ["Briana","F"],
  ["Adrick","M"],
  ["Hobart","M"],
  ["Brandi","F"],
  ["Ajay","F"],
  ["Dorcas","F"],
  ["Elisabeth","F"],
  ["Wilbur","M"],
  ["Matthus","M"],
  ["Marlee","F"],
  ["Annette","F"],
  ["Fernando","M"],
  ["Merill","M"],
  ["Joela","F"],
  ["Mauritz","M"],
  ["Sandye","F"],
  ["Haydon","M"],
  ["Hugo","M"],
  ["Salvatore","M"],
  ["Vallie","F"],
  ["Ninnette","F"],
  ["Zack","M"],
  ["Ferd","M"],
  ["Douggie","M"],
  ["Laurianne","F"],
  ["Dominick","M"],
  ["Thalia","F"],
  ["Andrej","M"],
  ["Genni","F"],
  ["Kori","F"],
  ["Murray","M"],
  ["Halimeda","F"],
  ["Sigmund","M"],
  ["Antoine","M"],
  ["Sissy","F"],
  ["Leroy","M"],
  ["Michaeline","F"],
  ["Ondrea","F"],
  ["Tad","M"],
  ["Ardyth","F"],
  ["Barrie","M"],
  ["Cornelle","F"],
  ["Templeton","M"],
  ["Erl","M"],
  ["Cissie","F"],
  ["Ferguson","M"],
  ["Matias","M"],
  ["Kory","M"],
  ["Ram","M"],
  ["Sheppard","M"],
  ["Maurits","M"],
  ["Parke","M"],
  ["Sergeant","M"],
  ["Josephina","F"],
  ["Alis","F"],
  ["Murielle","F"],
  ["Urban","M"],
  ["Lucille","F"],
  ["Rosalinde","F"],
  ["Magdalen","F"],
  ["Livia","F"],
  ["Rikki","F"],
  ["Zeus","M"],
  ["Jodi","F"],
  ["Averyl","F"],
  ["Flynn","M"],
  ["Jo-Ann","F"],
  ["Jan","M"],
  ["Winnah","F"],
  ["Bobbi","F"],
  ["Jimmie","M"],
  ["Loren","F"],
  ["Frederick","M"],
  ["Rebeca","F"],
  ["Ortensia","F"],
  ["Karyn","F"],
  ["Maren","F"],
  ["Carlton","M"],
  ["Tommy","M"],
  ["Benson","M"],
  ["Gwenni","F"],
  ["Harcourt","M"],
  ["Valentine","M"],
  ["Hephzibah","F"],
  ["Tamarah","F"],
  ["Yule","M"],
  ["Joshua","M"],
  ["Schroeder","M"],
  ["Flinn","M"],
  ["Gayleen","F"],
  ["Willey","M"],
  ["Chaddy","M"],
  ["Karia","F"],
  ["Aubrey","M"],
  ["Jim","M"],
  ["Marry","F"],
  ["Veda","F"],
  ["Ellene","F"],
  ["Walker","M"],
  ["Violante","F"],
  ["Rubin","M"],
  ["Teryl","F"],
  ["Flossie","F"],
  ["Arabel","F"],
  ["Archon","M"],
  ["Phaidra","F"],
  ["Traver","M"],
  ["Dian","F"],
  ["Florencia","F"],
  ["Reuben","M"],
  ["Matthieu","M"],
  ["Stacey","F"],
  ["Claudine","F"],
  ["Talyah","F"],
  ["Laina","F"],
  ["Florina","F"],
  ["Skelly","M"],
  ["Teodorico","M"],
  ["Walton","M"],
  ["Conni","F"],
  ["Kia","F"],
  ["Georgette","F"],
  ["Barbra","F"],
  ["Milicent","F"],
  ["Evaleen","F"],
  ["Katherine","F"],
  ["Benny","M"],
  ["Dorelia","F"],
  ["Leelah","F"],
  ["Nathan","M"],
  ["Marshall","M"],
  ["Vera","F"],
  ["Ania","F"],
  ["Jodie","M"],
  ["Georg","M"],
  ["Ollie","F"],
  ["Eugen","M"],
  ["Raina","F"],
  ["Salome","F"],
  ["Conchita","F"],
  ["Freeman","M"],
  ["Tracie","F"],
  ["Augusta","F"],
  ["Emilie","F"],
  ["Stefania","F"],
  ["Winne","F"],
  ["Trina","F"],
  ["Farley","M"],
  ["Waylen","M"],
  ["Kirby","M"],
  ["Jessika","F"],
  ["Vaughan","M"],
  ["Marybelle","F"],
  ["Izzi","F"],
  ["Meyer","M"],
  ["Earl","M"],
  ["Tabbitha","F"],
  ["Woodrow","M"],
  ["Renaldo","M"],
  ["Cassie","F"],
  ["Kaster","F"],
  ["Cassandre","F"],
  ["Ray","F"],
  ["Eduardo","M"],
  ["Rickie","F"],
  ["Dorisa","F"],
  ["Erny","M"],
  ["Bernard","M"],
  ["Marsh","M"],
  ["Samson","M"],
  ["Andreana","F"],
  ["Elene","F"],
  ["Teddi","F"],
  ["Darya","F"],
  ["Marv","M"],
  ["Reginauld","M"],
  ["Garey","M"],
  ["Dimitrou","M"],
  ["Lucienne","F"],
  ["Flossi","F"],
  ["Deana","F"],
  ["Yevette","F"],
  ["Turner","M"],
  ["Maria","F"],
  ["Miguelita","F"],
  ["Astrix","F"],
  ["Christabelle","F"],
  ["Stig","M"],
  ["Woodman","M"],
  ["Phoebe","F"],
  ["Laetitia","F"],
  ["Virginie","F"],
  ["Candice","F"],
  ["Vinny","M"],
  ["Quincey","M"],
  ["Honoria","F"],
  ["Vladimir","M"],
  ["Veronique","F"],
  ["Carey","M"],
  ["Alton","M"],
  ["Weber","M"],
  ["Rory","M"],
  ["Mel","M"],
  ["Ted","M"],
  ["Hanford","M"],
  ["Dyan","F"],
  ["Eugine","F"],
  ["Iain","M"],
  ["Moise","M"],
  ["Stillmann","M"],
  ["Rochelle","F"],
  ["Timothee","M"],
  ["Clem","M"],
  ["Ebenezer","M"],
  ["Menard","M"],
  ["Noel","F"],
  ["Zorana","F"],
  ["Talia","F"],
  ["Sascha","F"],
  ["Ruella","F"],
  ["Dasi","F"],
  ["Mandie","F"],
  ["Ronny","M"],
  ["Piggy","M"],
  ["Pauly","F"],
  ["Tyrus","M"],
  ["Trudy","F"],
  ["Minta","F"],
  ["Adeline","F"],
  ["Leslie","M"],
  ["Jakob","M"],
  ["Suzan","F"],
  ["Adriana","F"],
  ["Sashenka","F"],
  ["Westleigh","M"],
  ["Delphine","F"],
  ["Tye","M"],
  ["Maya","F"],
  ["Bert","M"],
  ["Tonya","F"],
  ["Thorn","M"],
  ["Bonita","F"],
  ["Robin","M"],
  ["Cora","F"],
  ["Arther","M"],
  ["Tersina","F"],
  ["Terrance","M"],
  ["Romain","M"],
  ["Ike","M"],
  ["Barbaraanne","F"],
  ["Roby","F"],
  ["Philippe","F"],
  ["Bellamy","F"],
  ["Ethelred","M"],
  ["Orelle","F"],
  ["Marina","F"],
  ["Abigael","F"],
  ["Christ","M"],
  ["Fernanda","F"],
  ["Felicio","M"],
  ["Gilberte","F"],
  ["Ariel","M"],
  ["Ronalda","F"],
  ["Nicolea","F"],
  ["Alberta","F"],
  ["Nananne","F"],
  ["Gardner","M"],
  ["Markus","M"],
  ["Lurleen","F"],
  ["Adger","M"],
  ["Becca","F"],
  ["Hercule","M"],
  ["Skip","M"],
  ["Marcela","F"],
  ["Josephus","M"],
  ["Lyle","M"],
  ["Anson","M"],
  ["Jerrylee","F"],
  ["Thaddius","M"],
  ["Reggis","M"],
  ["Marthena","F"],
  ["Florri","F"],
  ["Meridel","F"],
  ["Ginnie","F"],
  ["Oswell","M"],
  ["Blinni","F"],
  ["Tove","F"],
  ["Ishmael","M"],
  ["Zed","M"],
  ["Beau","F"],
  ["Eulalie","F"],
  ["Emmit","M"],
  ["Wake","M"],
  ["Merci","F"],
  ["Jemimah","F"],
  ["Nikita","M"],
  ["Alwin","M"],
  ["Mabelle","F"],
  ["Ric","M"],
  ["Halie","F"],
  ["Sheffield","M"],
  ["Keely","F"],
  ["Pier","F"],
  ["Midge","F"],
  ["Roana","F"],
  ["Alford","M"],
  ["Benjie","M"],
  ["Zena","F"],
  ["Jere","F"],
  ["Dewey","M"],
  ["Dominic","M"],
  ["Kenn","M"],
  ["Jillene","F"],
  ["Heathcliff","M"],
  ["Angelique","F"],
  ["Maggie","F"],
  ["Curtis","M"],
  ["Cammy","M"],
  ["Barth","M"],
  ["Claudius","M"],
  ["Frieda","F"],
  ["Chet","M"],
  ["Kaye","F"],
  ["Renell","F"],
  ["Kirstin","F"],
  ["Batsheva","F"],
  ["Ann","F"],
  ["Madelena","F"],
  ["Kala","F"],
  ["Pacifica","F"],
  ["Sylvan","M"],
  ["Northrop","M"],
  ["Trev","M"],
  ["Clari","F"],
  ["Tillie","F"],
  ["Ernest","M"],
  ["Rosemaria","F"],
  ["Broderic","M"],
  ["Gussy","F"],
  ["Anjanette","F"],
  ["Anastassia","F"],
  ["Rainer","M"],
  ["Rhodie","F"],
  ["Cesya","F"],
  ["Danell","F"],
  ["Meredeth","M"],
  ["Torey","M"],
  ["Augie","M"],
  ["Pattie","M"],
  ["Frank","F"],
  ["Sim","M"],
  ["Luise","F"],
  ["Vonny","F"],
  ["Chandal","F"],
  ["Sullivan","M"],
  ["Oliver","M"],
  ["Nevin","M"],
  ["Gerry","F"],
  ["Terrell","M"],
  ["Lemmie","M"],
  ["Tonie","F"],
  ["Fidel","M"],
  ["Carlye","F"],
  ["Jemmie","F"],
  ["Klee","M"],
  ["Harriett","F"],
  ["Danie","M"],
  ["Reza","M"],
  ["Carl","M"],
  ["Janna","F"],
  ["Flemming","M"],
  ["Blair","M"],
  ["Cherilynn","F"],
  ["Cinda","F"],
  ["Chancey","M"],
  ["Rafe","M"],
  ["Amity","F"],
  ["Hallam","M"],
  ["Barty","M"],
  ["Gilda","F"],
  ["Bernie","M"],
  ["Englebert","M"],
  ["Derby","M"],
  ["Micheal","M"],
  ["Tadd","M"],
  ["Quillan","M"],
  ["Lonny","M"],
  ["Dionis","F"],
  ["Sadella","F"],
  ["Dari","F"],
  ["Lari","F"],
  ["Winnie","F"],
  ["Lilias","F"],
  ["Stanleigh","M"],
  ["JoAnne","F"],
  ["Lianne","F"],
  ["Flint","M"],
  ["Ramesh","M"],
  ["Melodee","F"],
  ["Olin","M"],
  ["Christie","F"],
  ["Alejandro","M"],
  ["Radcliffe","M"],
  ["Karl","M"],
  ["Olenka","F"],
  ["Harman","M"],
  ["Phyllida","F"],
  ["Hortensia","F"],
  ["Haleigh","F"],
  ["Natalia","F"],
  ["Jessie","M"],
  ["Gallagher","M"],
  ["Ezekiel","M"],
  ["Ralph","M"],
  ["Wilhelmine","F"],
  ["Urbano","M"],
  ["Lewis","M"],
  ["Sal","F"],
  ["Daisy","F"],
  ["Pattie","F"],
  ["Rosalind","F"],
  ["Antonie","F"],
  ["Gladis","F"],
  ["Tristan","M"],
  ["Danita","F"],
  ["Jaine","F"],
  ["Hewett","M"],
  ["Milissent","F"],
  ["Peggie","F"],
  ["Isadora","F"],
  ["Leonid","M"],
  ["Vinod","M"],
  ["Cosmo","M"],
  ["Rolf","M"],
  ["Tirrell","M"],
  ["Adams","M"],
  ["Vally","F"],
  ["Marquita","F"],
  ["Ephrem","M"],
  ["Vanna","F"],
  ["Margery","F"],
  ["Moshe","M"],
  ["Manda","F"],
  ["Vladamir","M"],
  ["Vanessa","F"],
  ["Ulrike","F"],
  ["Gerrard","M"],
  ["Dylan","M"],
  ["Garold","M"],
  ["Angelica","F"],
  ["Emerson","M"],
  ["Clarance","M"],
  ["Aditya","M"],
  ["Irwin","M"],
  ["Allene","F"],
  ["Flo","F"],
  ["Wolfgang","M"],
  ["Donal","M"],
  ["Daveta","F"],
  ["Demeter","F"],
  ["Niall","M"],
  ["Loreen","F"],
  ["Nady","F"],
  ["Lesya","F"],
  ["Siegfried","M"],
  ["Conrad","M"],
  ["Kissiah","F"],
  ["Derick","M"],
  ["Son","M"],
  ["Witty","M"],
  ["Joete","F"],
  ["Ilse","F"],
  ["Kore","F"],
  ["Bard","M"],
  ["Mickey","M"],
  ["Elfrieda","F"],
  ["Marcos","M"],
  ["Thedrick","M"],
  ["Munroe","M"],
  ["Nickey","M"],
  ["Siana","F"],
  ["Jesus","M"],
  ["Jeanie","F"],
  ["Garrett","M"],
  ["Caroljean","F"],
  ["Irina","F"],
  ["Barr","M"],
  ["Dana","M"],
  ["Tera","F"],
  ["Holly","M"],
  ["Demetri","M"],
  ["Merle","F"],
  ["Robb","M"],
  ["Truman","M"],
  ["Almeda","F"],
  ["Foster","M"],
  ["Horace","M"],
  ["Robbyn","F"],
  ["Aurie","F"],
  ["Joanna","F"],
  ["Katinka","F"],
  ["Harriette","F"],
  ["Kip","M"],
  ["Gabriello","M"],
  ["Meira","F"],
  ["Ursula","F"],
  ["Rogers","M"],
  ["Virgil","M"],
  ["Gardiner","M"],
  ["Sinclare","M"],
  ["Chariot","M"],
  ["Rosemonde","F"],
  ["Jaimie","F"],
  ["Jermayne","M"],
  ["Fedora","F"],
  ["Hale","M"],
  ["Vasili","M"],
  ["Siouxie","F"],
  ["Mozelle","F"],
  ["Constanta","F"],
  ["Julius","M"],
  ["Cammi","F"],
  ["Almira","F"],
  ["Dale","M"],
  ["Morley","M"],
  ["Alberto","M"],
  ["Morris","M"],
  ["Shirlee","F"],
  ["Bela","M"],
  ["Jasmin","F"],
  ["Alic","M"],
  ["Sidnee","M"],
  ["Demetris","M"],
  ["Ruddie","M"],
  ["Elsi","F"],
  ["Lenee","F"],
  ["Morten","M"],
  ["Sarge","M"],
  ["Butler","M"],
  ["Chere","F"],
  ["Hannibal","M"],
  ["Leonidas","M"],
  ["Jock","M"],
  ["Charyl","F"],
  ["Hermine","F"],
  ["Winifred","F"],
  ["Esau","M"],
  ["Georgena","F"],
  ["Giorgi","M"],
  ["Tomkin","M"],
  ["Charmion","F"],
  ["Witold","M"],
  ["Stephanus","M"],
  ["Caryl","M"],
  ["Ferinand","M"],
  ["Glenna","F"],
  ["Fitzgerald","M"],
  ["Clarence","M"],
  ["Jabez","M"],
  ["Lulu","F"],
  ["Pierette","F"],
  ["Wynny","F"],
  ["Selene","F"],
  ["Rheba","F"],
  ["Carlen","F"],
  ["Allan","M"],
  ["Alaa","M"],
  ["Anders","M"],
  ["Zalman","M"],
  ["Valdemar","M"],
  ["Ignazio","M"],
  ["Maybelle","F"],
  ["Ruthi","F"],
  ["Louie","M"],
  ["Otho","M"],
  ["Isa","M"],
  ["Meggi","F"],
  ["Trace","F"],
  ["Yaakov","M"],
  ["Basil","M"],
  ["Daisie","F"],
  ["Shelba","F"],
  ["Michel","M"],
  ["Merrill","F"],
  ["Joceline","F"],
  ["Daren","M"],
  ["Wade","M"],
  ["Ferdinanda","F"],
  ["Zita","F"],
  ["Anneliese","F"],
  ["Josef","M"],
  ["Hewitt","M"],
  ["Moises","M"],
  ["Nanette","F"],
  ["Stanly","M"],
  ["Adolph","M"],
  ["Gaylene","F"],
  ["Felicle","F"],
  ["Roddie","M"],
  ["Sherrie","F"],
  ["Ainsley","F"],
  ["Ruddy","M"],
  ["Adair","M"],
  ["Claude","F"],
  ["Mattheus","M"],
  ["Harris","M"],
  ["Antonina","F"],
  ["Blithe","F"],
  ["Josh","M"],
  ["Anurag","M"],
  ["Stanton","M"],
  ["Susanetta","F"],
  ["Felicdad","F"],
  ["Sawyere","M"],
  ["Jessa","F"],
  ["Max","M"],
  ["Ruby","F"],
  ["Waneta","F"],
  ["Ripley","M"],
  ["Aindrea","F"],
  ["Sampson","M"],
  ["Cornelia","F"],
  ["Averell","M"],
  ["Elisha","F"],
  ["Israel","M"],
  ["Way","M"],
  ["Bruno","M"],
  ["Darwin","M"],
  ["Jillane","F"],
  ["Thane","M"],
  ["Scarface","M"],
  ["Agna","F"],
  ["Jere","M"],
  ["Manuel","M"],
  ["Pam","F"],
  ["Max","F"],
  ["Rozalin","F"],
  ["Eleni","F"],
  ["Roderigo","M"],
  ["Brandon","M"],
  ["Humphrey","M"],
  ["Prentice","M"],
  ["Greta","F"],
  ["Dieter","M"],
  ["Dewitt","M"],
  ["Eva","F"],
  ["Katya","F"],
  ["Sloane","M"],
  ["Susi","F"],
  ["Venkat","M"],
  ["Jennie","F"],
  ["Katheleen","F"],
  ["Gillie","F"],
  ["Ajay","M"],
  ["Paula-Grace","F"],
  ["Alayne","F"],
  ["Tuckie","M"],
  ["Gretchen","M"],
  ["Jo Ann","F"],
  ["Fitz","M"],
  ["Derrick","M"],
  ["Goddart","M"],
  ["Jonis","F"],
  ["Levon","M"],
  ["Cecily","F"],
  ["Vin","M"],
  ["Sylvia","F"],
  ["Aila","F"],
  ["Brendan","M"],
  ["Rutherford","M"],
  ["Giffard","M"],
  ["Gus","M"],
  ["Alasdair","M"],
  ["Inger","F"],
  ["Tulley","M"],
  ["Amandi","F"],
  ["Stace","F"],
  ["Kimbra","F"],
  ["Tobie","M"],
  ["Linea","F"],
  ["Rheta","F"],
  ["Dionysus","M"],
  ["Hashim","M"],
  ["Wyatt","M"],
  ["Cate","F"],
  ["Malorie","F"],
  ["Ginger","F"],
  ["Devinne","F"],
  ["Dinah","F"],
  ["Lance","M"],
  ["Willy","F"],
  ["Doug","M"],
  ["Walden","M"],
  ["Winnifred","F"],
  ["Colbert","M"],
  ["Jasmine","F"],
  ["Wilfred","M"],
  ["Gabriell","M"],
  ["Barb","F"],
  ["Neila","F"],
  ["Reese","M"],
  ["Eliza","F"],
  ["Daisi","F"],
  ["Chryste","F"],
  ["LeeAnn","F"],
  ["Bertie","M"],
  ["Martin","M"],
  ["Clarissa","F"],
  ["Gaston","M"],
  ["Pepita","F"],
  ["Melisenda","F"],
  ["Mandi","F"],
  ["Frankie","M"],
  ["Brett","F"],
  ["Parsifal","M"],
  ["Mortimer","M"],
  ["Gabe","M"],
  ["Abbott","M"],
  ["Lusa","F"],
  ["Sophey","F"],
  ["Meghan","F"],
  ["Temple","M"],
  ["Eddy","M"],
  ["Nessa","F"],
  ["Marcellina","F"],
  ["Avrom","M"],
  ["Mustafa","M"],
  ["Reeta","F"],
  ["Maddie","M"],
  ["Kelsey","M"],
  ["Vivian","F"],
  ["Pavel","M"],
  ["Martie","M"],
  ["Rollo","M"],
  ["Roth","M"],
  ["Teddie","F"],
  ["Derrek","M"],
  ["Quinn","M"],
  ["Constantine","F"],
  ["Jen","F"],
  ["Jean-Paul","M"],
  ["Willie","M"],
  ["Rahul","M"],
  ["Zedekiah","M"],
  ["Jarvis","M"],
  ["Natasha","F"],
  ["Amery","M"],
  ["Eilis","F"],
  ["Clemente","M"],
  ["Modestine","F"],
  ["Dyane","F"],
  ["Emmanuel","M"],
  ["Jerome","M"],
  ["Silvio","M"],
  ["Marylou","F"],
  ["Vicky","F"],
  ["Chloette","F"],
  ["Scarlett","F"],
  ["Nels","M"],
  ["Fan","F"],
  ["Gilles","M"],
  ["Blinnie","F"],
  ["Markos","M"],
  ["Meier","M"],
  ["Allah","M"],
  ["Mackenzie","M"],
  ["Franky","M"],
  ["Marten","M"],
  ["Rori","F"],
  ["Derek","M"],
  ["Wainwright","M"],
  ["Taite","M"],
  ["Sean","F"],
  ["Ximenez","M"],
  ["Shurwood","M"],
  ["Carole","F"],
  ["Carena","F"],
  ["Sergent","M"],
  ["Johnny","M"],
  ["Bayard","M"],
  ["Ian","M"],
  ["Elbertina","F"],
  ["Siward","M"],
  ["Herbie","M"],
  ["Polly","F"],
  ["Ernaline","F"],
  ["Cathrin","F"],
  ["Kurtis","M"],
  ["Thorvald","M"],
  ["Ilysa","F"],
  ["Kathie","F"],
  ["Isa","F"],
  ["Daniel","M"],
  ["Inna","F"],
  ["Britani","F"],
  ["Garnet","F"],
  ["Matt","M"],
  ["Nat","M"],
  ["Jessee","M"],
  ["Barbey","F"],
  ["Phillis","F"],
  ["Jeb","M"],
  ["Hervey","M"],
  ["Ameline","F"],
  ["Hymie","M"],
  ["Antin","M"],
  ["Randie","M"],
  ["Tremaine","M"],
  ["Leonie","F"],
  ["Clarice","F"],
  ["Friederike","F"],
  ["Ahmet","M"],
  ["Valeda","F"],
  ["Carmel","F"],
  ["Becka","F"],
  ["Libby","F"],
  ["Christos","M"],
  ["Warren","M"],
  ["Christine","F"],
  ["Maxfield","M"],
  ["Karlyn","F"],
  ["Jamima","F"],
  ["Melamie","F"],
  ["Baxter","M"],
  ["Joelynn","F"],
  ["Bobinette","F"],
  ["Remy","F"],
  ["Clemence","F"],
  ["Smith","M"],
  ["Nomi","F"],
  ["Vicki","F"],
  ["Shanon","F"],
  ["Mara","F"],
  ["Mattie","M"],
  ["Rutger","M"],
  ["Malinda","F"],
  ["Park","M"],
  ["Petey","M"],
  ["Gerianne","F"],
  ["Andrea","M"],
  ["Doloritas","F"],
  ["Heath","M"],
  ["Adiana","F"],
  ["Jeniffer","F"],
  ["Monika","F"],
  ["Marylee","F"],
  ["Terrence","M"],
  ["Philomena","F"],
  ["Laure","F"],
  ["Bearnard","M"],
  ["Adolfo","M"],
  ["Moses","M"],
  ["Sebastian","M"],
  ["Vergil","M"],
  ["Millicent","F"],
  ["Kalvin","M"],
  ["Jermaine","M"],
  ["Goldia","F"],
  ["Riannon","F"],
  ["Averil","M"],
  ["Rivi","F"],
  ["Jameson","M"],
  ["Towney","M"],
  ["Sherye","F"],
  ["Pinchas","M"],
  ["Crystie","F"],
  ["Jotham","M"],
  ["Blondell","F"],
  ["Melanie","F"],
  ["Rosa","F"],
  ["Sonnie","F"],
  ["Mitchell","M"],
  ["Norton","M"],
  ["Dirk","M"],
  ["Fraser","M"],
  ["Lorri","F"],
  ["Tabby","F"],
  ["Opalina","F"],
  ["Tremain","M"],
  ["Nancee","F"],
  ["Nanine","F"],
  ["Christiane","F"],
  ["Rick","M"],
  ["Sheffy","M"],
  ["Lindsey","M"],
  ["Sydelle","F"],
  ["Nickie","M"],
  ["Saul","M"],
  ["Fabrice","F"],
  ["Burgess","M"],
  ["Aleen","F"],
  ["Jodi","M"],
  ["Aldric","M"],
  ["Reube","M"],
  ["Rem","M"],
  ["Goose","M"],
  ["Nelli","F"],
  ["Lesley","M"],
  ["Padraig","M"],
  ["Lazar","M"],
  ["Emanuel","M"],
  ["Terra","F"],
  ["Tedd","M"],
  ["Blondelle","F"],
  ["Seth","M"],
  ["Linette","F"],
  ["Damon","M"],
  ["Uriel","M"],
  ["Waylan","M"],
  ["Jana","F"],
  ["Raimund","M"],
  ["Hakeem","M"],
  ["Wilhelm","M"],
  ["Lindsey","F"],
  ["Jerrome","M"],
  ["Bud","M"],
  ["Charmaine","F"],
  ["Alfred","M"],
  ["Shayne","F"],
  ["Ozzie","M"],
  ["Filide","F"],
  ["Teador","M"],
  ["Jolynn","F"],
  ["Wilburn","M"],
  ["Fifi","F"],
  ["Reed","M"],
  ["Neron","M"],
  ["Shelden","M"],
  ["Burta","F"],
  ["Philly","F"],
  ["Wylie","M"],
  ["Marney","F"],
  ["Jude","F"],
  ["Tarrant","M"],
  ["Niels","M"],
  ["Beck","M"],
  ["Nick","M"],
  ["Stacy","F"],
  ["Lynett","F"],
  ["Louis","M"],
  ["Malka","F"],
  ["Arel","M"],
  ["Zerk","M"],
  ["Janessa","F"],
  ["Margarethe","F"],
  ["Bambi","F"],
  ["Aube","M"],
  ["Si","M"],
  ["Kirbee","F"],
  ["Paco","M"],
  ["Noah","M"],
  ["Romy","F"],
  ["Marshal","M"],
  ["Herb","M"],
  ["Essie","F"],
  ["Noemi","F"],
  ["Phineas","M"],
  ["Dougie","M"],
  ["Sax","M"],
  ["Maxy","F"],
  ["Tish","F"],
  ["Meta","F"],
  ["Prentiss","M"],
  ["Thaine","M"],
  ["Madona","F"],
  ["Jed","M"],
  ["Howard","M"],
  ["Stephine","F"],
  ["Lurline","F"],
  ["Lorinda","F"],
  ["Emelia","F"],
  ["Beowulf","M"],
  ["Wilmer","M"],
  ["Al","M"],
  ["Skell","M"],
  ["Jake","M"],
  ["Brea","F"],
  ["Laureen","F"],
  ["Dwayne","M"],
  ["Fern","F"],
  ["Darcey","F"],
  ["Silva","F"],
  ["Zechariah","M"],
  ["Anni","F"],
  ["Shepard","M"],
  ["Abby","F"],
  ["Jennette","F"],
  ["Sile","F"],
  ["Fox","M"],
  ["Aurelea","F"],
  ["Belita","F"],
  ["Francis","F"],
  ["Mina","F"],
  ["Niki","M"],
  ["Filipe","M"],
  ["Rene","F"],
  ["Salvidor","M"],
  ["Candie","F"],
  ["Savina","F"],
  ["Vivianna","F"],
  ["Carley","F"],
  ["Mugsy","M"],
  ["Rene","M"],
  ["Dorit","F"],
  ["Sansone","M"],
  ["Jobey","F"],
  ["Maddy","M"],
  ["Sheelah","F"],
  ["Oswald","M"],
  ["Kristal","F"],
  ["Meris","F"],
  ["Guillermo","M"],
  ["Ruthie","F"],
  ["Osbourn","M"],
  ["Dode","F"],
  ["Benedict","M"],
  ["Hilary","M"],
  ["Maryangelyn","F"],
  ["Aloysius","M"],
  ["Barbee","F"],
  ["Ludwig","M"],
  ["Octavia","F"],
  ["Aubert","M"],
  ["Evey","F"],
  ["Ignaz","M"],
  ["Aub","M"],
  ["Andromache","F"],
  ["Broddy","M"],
  ["Raphael","M"],
  ["Maximilien","M"],
  ["Carolynn","F"],
  ["Isabelita","F"],
  ["Woodie","M"],
  ["Rozella","F"],
  ["Kip","F"],
  ["Rhea","F"],
  ["Hastings","M"],
  ["Lust","F"],
  ["Briny","F"],
  ["Ollie","M"],
  ["Jesselyn","F"],
  ["Jocelin","F"],
  ["Alli","F"],
  ["Tanny","M"],
  ["Mariana","F"],
  ["Louisa","F"],
  ["Mischa","M"],
  ["Alexander","M"],
  ["Janina","F"],
  ["Rayna","F"],
  ["Herrmann","M"],
  ["Hermy","M"],
  ["Mildrid","F"],
  ["Dimitrios","M"],
  ["Ulrich","M"],
  ["Lawerence","M"],
  ["Bobbie","M"],
  ["Moira","F"],
  ["Greg","M"],
  ["Wang","M"],
  ["Joselyn","F"],
  ["Fairfax","M"],
  ["Paulina","F"],
  ["Paolo","M"],
  ["Hamel","M"],
  ["Pincas","M"],
  ["Thomasin","F"],
  ["Krishna","M"],
  ["Edith","F"],
  ["Hiram","M"],
  ["Parwane","F"],
  ["Reg","M"],
  ["Coralie","F"],
  ["Blondie","F"],
  ["Mauricio","M"],
  ["Georgeanne","F"],
  ["Arie","M"],
  ["Obadias","M"],
  ["Ernie","M"],
  ["Normand","M"],
  ["Meara","F"],
  ["Cosette","F"],
  ["Holly-Anne","F"],
  ["Rebekkah","F"],
  ["Herold","M"],
  ["Dasie","F"],
  ["Dove","F"],
  ["Bendite","F"],
  ["Genny","F"],
  ["Brooks","F"],
  ["Javier","M"],
  ["Hester","F"],
  ["Dwight","M"],
  ["Janot","F"],
  ["Theo","M"],
  ["Cacilia","F"],
  ["Brena","F"],
  ["Eolande","F"],
  ["Wilhelmina","F"],
  ["Jocelyn","F"],
  ["Ford","M"],
  ["Winnie","M"],
  ["Trip","M"],
  ["Connor","M"],
  ["Brina","F"],
  ["Ravil","M"],
  ["Abraham","M"],
  ["Bo","M"],
  ["Wes","M"],
  ["Eartha","F"],
  ["French","M"],
  ["Aubine","F"],
  ["Corey","M"],
  ["Lynnet","F"],
  ["Mort","M"],
  ["Jack","M"],
  ["Alicia","F"],
  ["Jeanna","F"],
  ["Dabney","M"],
  ["Alvina","F"],
  ["Dwain","M"],
  ["Shel","F"],
  ["Sydney","M"],
  ["Dulcea","F"],
  ["Nevsa","F"],
  ["Burke","M"],
  ["Alicea","F"],
  ["Shayla","F"],
  ["Duke","M"],
  ["Erek","M"],
  ["Dorrie","F"],
  ["Elnora","F"],
  ["Vlad","M"],
  ["Gilburt","M"],
  ["Elsinore","F"],
  ["Ethyl","F"],
  ["Janene","F"],
  ["Clyde","M"],
  ["Nancey","F"],
  ["Rubie","F"],
  ["Moishe","M"],
  ["Wolfy","M"],
  ["Maia","F"],
  ["Shelley","M"],
  ["West","M"],
  ["Lucius","M"],
  ["Regan","M"],
  ["Shelbi","F"],
  ["Allin","M"],
  ["Anatol","M"],
  ["Dyna","F"],
  ["Lanie","F"],
  ["Sloan","M"],
  ["Blake","M"],
  ["Garry","M"],
  ["Tiffany","F"],
  ["Genia","F"],
  ["Kaycee","F"],
  ["Neilla","F"],
  ["Teodor","M"],
  ["Jacinda","F"],
  ["Marillin","F"],
  ["Corrinne","F"],
  ["Lynette","F"],
  ["Vilhelmina","F"],
  ["Karsten","M"],
  ["Lemar","M"],
  ["Dorthy","F"],
  ["Doris","F"],
  ["Nikkie","F"],
  ["Zared","M"],
  ["Silvano","M"],
  ["Brad","M"],
  ["Bernette","F"],
  ["Ebba","F"],
  ["Gina","F"],
  ["Cherise","F"],
  ["Duffie","M"],
  ["Billy","F"],
  ["Wilek","M"],
  ["Kinna","F"],
  ["Allianora","F"],
  ["Ros","F"],
  ["Margarette","F"],
  ["Deanne","F"],
  ["Rania","F"],
  ["Tracey","F"],
  ["Robby","F"],
  ["Oscar","M"],
  ["Sibbie","F"],
  ["Ingram","M"],
  ["Alvin","M"],
  ["Athene","F"],
  ["Ivory","F"],
  ["Manish","M"],
  ["Cyrille","M"],
  ["Jade","F"],
  ["Cassaundra","F"],
  ["Clive","M"],
  ["Hugh","M"],
  ["Kit","F"],
  ["Washington","M"],
  ["Pamella","F"],
  ["Zonda","F"],
  ["Ez","M"],
  ["Abdel","M"],
  ["Shilpa","F"],
  ["Jethro","M"],
  ["Ephram","M"],
  ["Marice","F"],
  ["Jean","M"],
  ["Yance","M"],
  ["Carmina","F"],
  ["Cherilyn","F"],
  ["Grace","M"],
  ["Jay","M"],
  ["Pasquale","M"],
  ["Sara-Ann","F"],
  ["Torr","M"],
  ["Celie","F"],
  ["Rudyard","M"],
  ["Denys","F"],
  ["Joachim","M"],
  ["Leighton","M"],
  ["Felipa","F"],
  ["Puff","M"],
  ["Doti","F"],
  ["Clayton","M"],
  ["Phil","M"],
  ["Ramon","M"],
  ["Debbra","F"],
  ["Heinrich","M"],
  ["Deb","F"],
  ["Saw","M"],
  ["Yoko","F"],
  ["Milo","M"],
  ["Meagan","F"],
  ["Sena","F"],
  ["Emmalee","F"],
  ["Waleed","M"],
  ["Cammy","F"],
  ["Quiggly","M"],
  ["Sidney","M"],
  ["Celestina","F"],
  ["Juan","M"],
  ["Renato","M"],
  ["Ilka","F"],
  ["Donald","M"],
  ["Geneva","F"],
  ["Wynn","M"],
  ["Mack","M"],
  ["Joanne","F"],
  ["Filippa","F"],
  ["Fabian","M"],
  ["Allyce","F"],
  ["Melita","F"],
  ["Zelig","M"],
  ["Eliott","M"],
  ["Olympe","F"],
  ["Mariska","F"],
  ["Herby","M"],
  ["Flor","F"],
  ["Joslyn","F"],
  ["Olle","M"],
  ["Liane","F"],
  ["Barnebas","M"],
  ["Tammy","M"],
  ["Brian","M"],
  ["Darius","M"],
  ["Whitman","M"],
  ["Sandor","M"],
  ["Mika","M"],
  ["Ayn","F"],
  ["Pauli","F"],
  ["Laurence","M"],
  ["Carine","F"],
  ["Rose","F"],
  ["Neddy","M"],
  ["Tobe","M"],
  ["Leland","M"],
  ["Zackariah","M"],
  ["Aime","F"],
  ["Jayme","F"],
  ["Ludvig","M"],
  ["Justin","M"],
  ["Catharine","F"],
  ["Hercules","M"],
  ["Dorine","F"],
  ["Taddeus","M"],
  ["Yancy","M"],
  ["Ag","F"],
  ["Eleanora","F"],
  ["Kora","F"],
  ["Cabrina","F"],
  ["Adey","F"],
  ["Belle","F"],
  ["Jolene","F"],
  ["Robbie","M"],
  ["Marwin","M"],
  ["Mari","F"],
  ["Hans","M"],
  ["Thorndike","M"],
  ["Waldo","M"],
  ["Ambrosi","M"],
  ["Marcio","M"],
  ["Warde","M"],
  ["Ike","F"],
  ["Madelin","F"],
  ["Helsa","F"],
  ["Melisent","F"],
  ["Maryl","F"],
  ["Netta","F"],
  ["Hyatt","M"],
  ["Kristian","M"],
  ["Lizzie","F"],
  ["Ronni","F"],
  ["Raynor","M"],
  ["Evan","M"],
  ["Joana","F"],
  ["Connie","M"],
  ["Lethia","F"],
  ["Bogart","M"],
  ["Donny","M"],
  ["Gael","F"],
  ["Stanwood","M"],
  ["Nollie","F"],
  ["Kakalina","F"],
  ["Bev","F"],
  ["Huntington","M"],
  ["Fran","M"],
  ["Millicent","M"],
  ["Forester","M"],
  ["Cristopher","M"],
  ["Harmony","F"],
  ["Chandler","M"],
  ["Osmond","M"],
  ["Noami","F"],
  ["Ugo","M"],
  ["Florinda","F"],
  ["Alisun","F"],
  ["Ronnie","F"],
  ["Elvin","M"],
  ["Tobias","M"],
  ["Lissie","F"],
  ["Wyatan","M"],
  ["Jami","F"],
  ["Britni","F"],
  ["Tann","M"],
  ["Sher","F"],
  ["Bianca","F"],
  ["Daryl","F"],
  ["Jehu","M"],
  ["Pauline","F"],
  ["Tate","M"],
  ["Vena","F"],
  ["Preston","M"],
  ["Ambros","M"],
  ["Zuzana","F"],
  ["Freddie","F"],
  ["Anais","F"],
  ["Amory","M"],
  ["Reid","M"],
  ["Kathy","F"],
  ["Lissy","F"],
  ["Susann","F"],
  ["Stirling","M"],
  ["Lark","F"],
  ["Micah","M"],
  ["Georgia","M"],
  ["Loren","M"],
  ["Francine","F"],
  ["Angelika","F"],
  ["Maximilian","M"],
  ["Lin","F"],
  ["Aleks","M"],
  ["Siddhartha","M"],
  ["Delcina","F"],
  ["Sharna","F"],
  ["Johnette","F"],
  ["Sumner","M"],
  ["Loretta","F"],
  ["Madeleine","F"],
  ["Heloise","F"],
  ["Odell","M"],
  ["Rafaelita","F"],
  ["Sue","F"],
  ["Thorstein","M"],
  ["Shorty","M"],
  ["Waly","F"],
  ["Tallia","F"],
  ["Sonja","F"],
  ["Nanny","F"],
  ["Hyacinthe","F"],
  ["Debee","F"],
  ["Brande","F"],
  ["Armond","M"],
  ["Margaux","F"],
  ["Mendie","M"],
  ["Vivi","F"],
  ["Northrup","M"],
  ["Osbert","M"],
  ["Roderic","M"],
  ["Gabbi","F"],
  ["Gillian","F"],
  ["Chance","M"],
  ["Emory","M"],
  ["Marjory","F"],
  ["Casey","M"],
  ["Abra","F"],
  ["Gerard","M"],
  ["Hendrika","F"],
  ["Lev","M"],
  ["Stacie","F"],
  ["Dionis","M"],
  ["Emilee","F"],
  ["Mehetabel","F"],
  ["Nichols","M"],
  ["Alysa","F"],
  ["Christian","M"],
  ["Slade","M"],
  ["Dannie","F"],
  ["Avivah","F"],
  ["Hodge","M"],
  ["Thedric","M"],
  ["Jerry","M"],
  ["Wylma","F"],
  ["Marylynne","F"],
  ["Pearline","F"],
  ["Hedwig","F"],
  ["Carroll","F"],
  ["Merrill","M"],
  ["Micky","M"],
  ["Gere","M"],
  ["Sibylla","F"],
  ["Tynan","M"],
  ["Matthiew","M"],
  ["Godiva","F"],
  ["Valerie","F"],
  ["Skipp","M"],
  ["Blaine","M"],
  ["Jamie","F"],
  ["Saunder","M"],
  ["Renel","F"],
  ["Alfie","M"],
  ["Brietta","F"],
  ["Veradis","F"],
  ["Zara","F"],
  ["Burnaby","M"],
  ["Charlton","M"],
  ["Vanya","F"],
  ["Biff","M"],
  ["Spike","M"],
  ["Ethelind","F"],
  ["Chaddie","M"],
  ["Redford","M"],
  ["Leonard","M"],
  ["Celesta","F"],
  ["Lura","F"],
  ["Barbabas","M"],
  ["Fawne","F"],
  ["Constantine","M"],
  ["Cecilla","F"],
  ["Vasilis","M"],
  ["Dena","F"],
  ["Plato","M"],
  ["Reiko","F"],
  ["Stanfield","M"],
  ["Chelsea","F"],
  ["Jenica","F"],
  ["Flory","F"],
  ["Eveleen","F"],
  ["Sydney","F"],
  ["Benn","M"],
  ["Reginald","M"],
  ["Davoud","M"],
  ["Noni","F"],
  ["Cal","M"],
  ["Friedrick","M"],
  ["Melinda","F"],
  ["Chevalier","M"],
  ["Clara","F"],
  ["Prasad","M"],
  ["Vibhu","M"],
  ["Penny","M"],
  ["Walsh","M"],
  ["Zollie","M"],
  ["Davidde","M"],
  ["Hansel","M"],
  ["Roxie","F"],
  ["Kristyn","F"],
  ["Abbey","M"],
  ["Kaspar","M"],
  ["Noble","M"],
  ["Griselda","F"],
  ["Marcus","M"],
  ["Weylin","M"],
  ["Patricio","M"],
  ["Sam","F"],
  ["Ardelis","F"],
  ["Katie","F"],
  ["Mikey","M"],
  ["Rae","F"],
  ["Hudson","M"],
  ["Georgianna","F"],
  ["Corrina","F"],
  ["Tami","F"],
  ["Kenna","F"],
  ["Shaine","F"],
  ["Beaufort","M"],
  ["Koralle","F"],
  ["Shay","M"],
  ["Donnie","F"],
  ["Herschel","M"],
  ["Jessy","F"],
  ["Kimberly","F"],
  ["Walt","M"],
  ["Cat","M"],
  ["Abel","M"],
  ["Laryssa","F"],
  ["Olaf","M"],
  ["Albatros","M"],
  ["Carli","F"],
  ["Vinita","F"],
  ["Manny","M"],
  ["Schuyler","M"],
  ["Jacques","M"],
  ["Odelle","F"],
  ["Stefa","F"],
  ["Gamaliel","M"],
  ["Karrah","F"],
  ["Zsa Zsa","F"],
  ["Arnold","M"],
  ["Lebbie","F"],
  ["Alysia","F"],
  ["Jeromy","M"],
  ["Gunner","M"],
  ["Leon","M"],
  ["Breena","F"],
  ["Caroleen","F"],
  ["Brent","M"],
  ["Jorry","F"],
  ["Riki","F"],
  ["Harley","F"],
  ["Barny","M"],
  ["Ashby","M"],
  ["Nate","M"],
  ["Emelyne","F"],
  ["Arlyne","F"],
  ["Oriana","F"],
  ["Tedman","M"],
  ["Taylor","M"],
  ["Lian","F"],
  ["Annalise","F"],
  ["Trudie","F"],
  ["Eugene","M"],
  ["Tessi","F"],
  ["Sandy","F"],
  ["Alice","F"],
  ["Binny","F"],
  ["Alison","F"],
  ["Gifford","M"],
  ["Latrina","F"],
  ["Archie","M"],
  ["Giovanne","M"],
  ["Bridgett","F"],
  ["Quinton","M"],
  ["Ceil","F"],
  ["Effie","F"],
  ["Aldis","M"],
  ["Jasper","M"],
  ["Johnathan","M"],
  ["Sabrina","F"],
  ["Yolanda","F"],
  ["Inglebert","M"],
  ["Ardeen","F"],
  ["Lidia","F"],
  ["Rinaldo","M"],
  ["Herculie","M"],
  ["Paulie","F"],
  ["Osbourne","M"],
  ["Leola","F"],
  ["Arlyn","F"],
  ["Anett","F"],
  ["Van","M"],
  ["Gerti","F"],
  ["Constantinos","M"],
  ["Benjy","M"],
  ["Scotty","M"],
  ["Calla","F"],
  ["Laurie","M"],
  ["Franz","M"],
  ["Osmund","M"],
  ["Selena","F"],
  ["Erick","M"],
  ["Duffy","M"],
  ["Romola","F"],
  ["Lisandra","F"],
  ["Cynthie","F"],
  ["Herrick","M"],
  ["Isaac","M"],
  ["Mart","M"],
  ["Frederico","M"],
  ["Elyse","F"],
  ["Belicia","F"],
  ["Natka","F"],
  ["Jori","F"],
  ["Garrott","M"],
  ["Jae","M"],
  ["Faustina","F"],
  ["Zorina","F"],
  ["Mohammad","M"],
  ["Ricki","F"],
  ["Cicely","F"],
  ["Page","F"],
  ["Hilton","M"],
  ["Stella","F"],
  ["Armand","M"],
  ["Anthony","M"],
  ["Lockwood","M"],
  ["Rafaela","F"],
  ["Delores","F"],
  ["Nettle","F"],
  ["Dareen","F"],
  ["Derrin","M"],
  ["Mag","F"],
  ["Jackquelin","F"],
  ["Deina","F"],
  ["Ossie","M"],
  ["Carmelle","F"],
  ["Tiphanie","F"],
  ["Grete","F"],
  ["Barnaby","M"],
  ["Nevil","M"],
  ["Kelly","M"],
  ["Hyacinth","F"],
  ["Othella","F"],
  ["Allie","M"],
  ["Willmott","M"],
  ["Lotti","F"],
  ["Evonne","F"],
  ["Agnes","F"],
  ["Michele","M"],
  ["Austin","M"],
  ["Netty","F"],
  ["Danette","F"],
  ["Yves","M"],
  ["Bryan","M"],
  ["Luigi","M"],
  ["Joye","F"],
  ["Wolf","M"],
  ["Deva","F"],
  ["Florian","M"],
  ["Philbert","M"],
  ["Windham","M"],
  ["Rusty","M"],
  ["Jacki","F"],
  ["Joseph","M"],
  ["Rosemary","F"],
  ["Pammi","F"],
  ["Giancarlo","M"],
  ["Corrie","M"],
  ["Rufus","M"],
  ["Gillan","F"],
  ["Shaylynn","F"],
  ["Sarina","F"],
  ["Francis","M"],
  ["Creighton","M"],
  ["Joe","M"],
  ["Doyle","M"],
  ["Alexis","F"],
  ["Hermann","M"],
  ["Debbie","F"],
  ["Margret","F"],
  ["Renaud","M"],
  ["Carleigh","M"],
  ["Noe","M"],
  ["Sly","M"],
  ["Juanita","M"],
  ["Priscella","F"],
  ["Alexi","F"],
  ["Augustin","M"],
  ["Haywood","M"],
  ["Gilberta","F"],
  ["Inga","F"],
  ["Rufe","M"],
  ["Sherwood","M"],
  ["Curtice","M"],
  ["Sunny","M"],
  ["Charles","M"],
  ["Linell","F"],
  ["Juditha","F"],
  ["Trenton","M"],
  ["Timothy","M"],
  ["Nealson","M"],
  ["Paulette","F"],
  ["Corry","F"],
  ["Leslie","F"],
  ["Cobby","M"],
  ["Venita","F"],
  ["Albertine","F"],
  ["Emmy","M"],
  ["Rodge","M"],
  ["Berk","M"],
  ["Giorgio","M"],
  ["Hewet","M"],
  ["Shaw","M"],
  ["Penrod","M"],
  ["Mikel","M"],
  ["Kenton","M"],
  ["Andi","F"],
  ["Richard","M"],
  ["Aamir","M"],
  ["See","M"],
  ["Yvette","F"],
  ["Trey","M"],
  ["Austina","F"],
  ["Rosana","F"],
  ["Bartolemo","M"],
  ["Vaughn","M"],
  ["Harvey","M"],
  ["Fowler","M"],
  ["Liz","F"],
  ["Luciana","F"],
  ["Mercie","F"],
  ["Torin","M"],
  ["Raymund","M"],
  ["Morrie","M"],
  ["Rudy","M"],
  ["Tamarra","F"],
  ["Gussi","F"],
  ["Freddy","M"],
  ["Tabbie","M"],
  ["Eudora","F"],
  ["Tamiko","F"],
  ["Connolly","M"],
  ["Carlita","F"],
  ["Tracey","M"],
  ["Carmelina","F"],
  ["Orren","M"],
  ["Lettie","F"],
  ["Rodolphe","M"],
  ["Robbi","F"],
  ["Hilliard","M"],
  ["Sanders","M"],
  ["Danice","F"],
  ["Edie","M"],
  ["Stewart","M"],
  ["Lawson","M"],
  ["Aubree","F"],
  ["Saundra","M"],
  ["Linet","F"],
  ["Ariana","F"],
  ["Wendy","F"],
  ["Chelton","M"],
  ["Remus","M"],
  ["Hyman","M"],
  ["Juana","F"],
  ["Benjamen","M"],
  ["Bealle","M"],
  ["Jean-Luc","M"],
  ["Florence","F"],
  ["Russ","M"],
  ["Linoel","M"],
  ["Britney","F"],
  ["Kelsey","F"],
  ["Emmett","M"],
  ["Ilyse","F"],
  ["Salomon","M"],
  ["Scotty","F"],
  ["John-Patrick","M"],
  ["Karole","F"],
  ["Jud","M"],
  ["Euclid","M"],
  ["Westbrook","M"],
  ["Janella","F"],
  ["Roobbie","F"],
  ["Ephraim","M"],
  ["Prunella","F"],
  ["Fazeel","M"],
  ["Gordie","M"],
  ["Cloris","F"],
  ["Marietta","M"],
  ["Frazier","M"],
  ["Wendeline","F"],
  ["Amabel","F"],
  ["Lilas","F"],
  ["Sholom","M"],
  ["Gilbert","M"],
  ["Basia","F"],
  ["Gill","M"],
  ["Bailey","M"],
  ["Madlen","F"],
  ["Woochang","M"],
  ["Clarita","F"],
  ["Randee","F"],
  ["Ellie","F"],
  ["Dusty","F"],
  ["Rora","F"],
  ["Eddie","M"],
  ["Joby","F"],
  ["Vernor","M"],
  ["Chloris","F"],
  ["Brier","F"],
  ["Mellicent","F"],
  ["Christophe","M"],
  ["Andres","M"],
  ["Ermengarde","F"],
  ["Bart","M"],
  ["Erik","M"],
  ["Dexter","M"],
  ["Cliff","M"],
  ["Mariya","F"],
  ["Blanch","F"],
  ["Pieter","M"],
  ["Anatole","M"],
  ["Chase","M"],
  ["Tabor","M"],
  ["Bradley","M"],
  ["Adi","F"],
  ["Genevra","F"],
  ["Horst","M"],
  ["Meredithe","F"],
  ["Cordelia","F"],
  ["Isaiah","M"],
  ["Morgen","F"],
  ["Camille","F"],
  ["Lani","F"],
  ["Greggory","M"],
  ["Taber","M"],
  ["Rhett","M"],
  ["Emmey","F"],
  ["Ventura","F"],
  ["Randell","M"],
  ["Florice","F"],
  ["Ragnar","M"],
  ["Jody","F"],
  ["Charleton","M"],
  ["Sayres","M"],
  ["Sean","M"],
  ["Fayre","F"],
  ["Kraig","M"],
  ["Ambrosia","F"],
  ["Pietro","M"],
  ["Kristina","F"],
  ["Dom","M"],
  ["Bebe","F"],
  ["Price","M"],
  ["Erinna","F"],
  ["Lynn","M"],
  ["Timmi","F"],
  ["Harold","M"],
  ["Verile","F"],
  ["Wiley","M"],
  ["Kaylyn","F"],
  ["Deonne","F"],
  ["Ignace","M"],
  ["Costa","M"],
  ["Peyton","M"],
  ["Jordan","F"],
  ["Maurene","F"],
  ["Emmalyn","F"],
  ["Harrold","M"],
  ["Lucila","F"],
  ["Alex","M"],
  ["Stevy","M"],
  ["Priscilla","F"],
  ["Suellen","F"],
  ["Tandie","F"],
  ["Lucilia","F"],
  ["Shelli","F"],
  ["Devon","F"],
  ["Hatti","F"],
  ["Stanley","M"],
  ["Corena","F"],
  ["Shaun","M"],
  ["Ashly","F"],
  ["Abbie","F"],
  ["Gearard","M"],
  ["Upton","M"],
  ["Dora","F"],
  ["Devora","F"],
  ["Godfrey","M"],
  ["Annadiane","F"],
  ["Gregg","M"],
  ["Tana","F"],
  ["Willi","M"],
  ["Fletcher","M"],
  ["Wallis","F"],
  ["Kanya","F"],
  ["Moselle","F"],
  ["Leanna","F"],
  ["Matthias","M"],
  ["Jewelle","F"],
  ["Rich","M"],
  ["Niles","M"],
  ["Cher","F"],
  ["Maris","F"],
  ["Kalle","M"],
  ["Ashley","M"],
  ["Madalyn","F"],
  ["Maritsa","F"],
  ["Hestia","F"],
  ["Roanne","F"],
  ["Anatoly","M"],
  ["Ranique","F"],
  ["Leopold","M"],
  ["Thacher","M"],
  ["Aina","F"],
  ["Geoff","M"],
  ["Kim","F"],
  ["Arda","F"],
  ["Malanie","F"],
  ["Rik","M"],
  ["Marika","F"],
  ["Lin","M"],
  ["Martica","F"],
  ["Dorotea","F"],
  ["Cindi","F"],
  ["Brewer","M"],
  ["Fred","F"],
  ["Tildi","F"],
  ["Zacharias","M"],
  ["Bret","M"],
  ["Lisbeth","F"],
  ["Delora","F"],
  ["Cami","F"],
  ["Dee","F"],
  ["Lilah","F"],
  ["Dawn","F"],
  ["Ingamar","M"],
  ["Hassan","M"],
  ["Karylin","F"],
  ["Kendrick","M"],
  ["Zary","M"],
  ["Tasha","F"],
  ["Denni","F"],
  ["Rodrick","M"],
  ["Jojo","F"],
  ["Tomas","M"],
  ["Lanni","F"],
  ["Konstanze","F"],
  ["Carlie","F"],
  ["Levi","M"],
  ["Jerrie","M"],
  ["Deny","F"],
  ["Merv","M"],
  ["Viv","F"],
  ["Derron","M"],
  ["Annabal","F"],
  ["Emmalynn","F"],
  ["Raye","F"],
  ["Brana","F"],
  ["Ismail","M"],
  ["Otis","M"],
  ["Frayda","F"],
  ["Katheryn","F"],
  ["Brunhilda","F"],
  ["Othelia","F"],
  ["Huntley","M"],
  ["Coleman","M"],
  ["Kelli","F"],
  ["Morgan","F"],
  ["Olwen","F"],
  ["Honey","F"],
  ["Fianna","F"],
  ["Clemmy","F"],
  ["Kurt","M"],
  ["Lyn","M"],
  ["Edgardo","M"],
  ["Kristel","F"],
  ["E'Lane","F"],
  ["Hillard","M"],
  ["Ferdie","M"],
  ["Alfredo","M"],
  ["Ava","F"],
  ["Beverie","F"],
  ["Elwyn","M"],
  ["Darelle","F"],
  ["Carmine","M"],
  ["Julia","F"],
  ["Edi","F"],
  ["Slim","M"],
  ["Alvera","F"],
  ["Ernestine","F"],
  ["Waverly","M"],
  ["Winslow","M"],
  ["Griff","M"]
];

// --------------------------------------------------------------------------

var generateTestTaxonomy = function() {
    [TEST_LOCATION, TEST_SUBJECT].forEach(function(taxonomy) {
        var parents = [];
        _.each(taxonomy.split(/[\r\n]+/), function(line) {
            var m = line.match(/^([\*\s]*)\s*(.+)\s*$/);
            if(m) {
                var level = m[1].replace(/\s+/g,'').length;
                var name = m[2];
                var subject = O.object();
                subject.appendType(T.Subject);
                subject.appendTitle(name);
                if(level > 0) { subject.appendParent(parents[level - 1]); }
                subject.save();
                parents[level] = subject;
            }
        });
    });
};

var TEST_LOCATION = ""+
"Location\n"+
"*Africa\n"+
"*America\n"+
"*Asia\n"+
"**Afghanistan\n"+
"**Armenia\n"+
"**Azerbaijan\n"+
"**Bahrain\n"+
"**Bangladesh\n"+
"**Bhutan\n"+
"**Brunei\n"+
"**Cambodia\n"+
"**China\n"+
"**Cyprus\n"+
"**Georgia\n"+
"**India\n"+
"**Indonesia\n"+
"**Iran\n"+
"**Iraq\n"+
"**Israel\n"+
"**Japan\n"+
"**Jordan\n"+
"**Kazakhstan\n"+
"**Kuwait\n"+
"**Kyrgyzstan\n"+
"**Laos\n"+
"**Lebanon\n"+
"**Malaysia\n"+
"**Maldives\n"+
"**Mongolia\n"+
"**Myanmar (Burma)\n"+
"**Nepal\n"+
"**North Korea\n"+
"**Oman\n"+
"**Pakistan\n"+
"**Palestine\n"+
"**Philippines\n"+
"**Qatar\n"+
"**Russia\n"+
"**Saudi Arabia\n"+
"**Singapore\n"+
"**South Korea\n"+
"**Sri Lanka\n"+
"**Syria\n"+
"**Taiwan\n"+
"**Tajikistan\n"+
"**Thailand\n"+
"**Timor-Leste\n"+
"**Turkey\n"+
"**Turkmenistan\n"+
"**United Arab Emirates\n"+
"**Uzbekistan\n"+
"**Vietnam\n"+
"**Yemen\n"+
"*Australasia\n"+
"*Europe\n"+
"**Albania\n"+
"**Andorra\n"+
"**Armenia\n"+
"**Austria\n"+
"**Azerbaijan\n"+
"**Belarus\n"+
"**Belgium\n"+
"**Bosnia and Herzegovina\n"+
"**Bulgaria\n"+
"**Croatia\n"+
"**Cyprus\n"+
"**Czech Republic\n"+
"**Denmark\n"+
"**Estonia\n"+
"**Finland\n"+
"**France\n"+
"**Georgia\n"+
"**Germany\n"+
"**Greece*\n"+
"**Hungary\n"+
"**Iceland\n"+
"**Ireland\n"+
"**Italy\n"+
"**Kazakhstan\n"+
"**Kosovo\n"+
"**Latvia\n"+
"**Liechtenstein\n"+
"**Lithuania\n"+
"**Luxembourg\n"+
"**Macedonia\n"+
"**Malta\n"+
"**Moldova\n"+
"**Monaco\n"+
"**Montenegro\n"+
"**Netherlands\n"+
"**Norway\n"+
"**Poland\n"+
"**Portugal\n"+
"**Romania\n"+
"**Russia\n"+
"**San Marino\n"+
"**Serbia\n"+
"**Slovakia\n"+
"**Slovenia\n"+
"**Spain\n"+
"**Sweden\n"+
"**Switzerland\n"+
"**Turkey\n"+
"**Ukraine\n"+
"**United Kingdom\n"+
"***England\n"+
"****Avon\n"+
"****Bedfordshire\n"+
"****Berkshire\n"+
"****City of Bristol\n"+
"****Buckinghamshire\n"+
"****Cambridgeshire\n"+
"****Cheshire\n"+
"****Cleveland\n"+
"****Cornwall\n"+
"****Cumberland\n"+
"****Cumbria\n"+
"****Derbyshire\n"+
"****Devon\n"+
"****Dorset\n"+
"****Durham\n"+
"****East Suffolk\n"+
"****East Sussex\n"+
"****Essex\n"+
"****Gloucestershire\n"+
"****Greater London\n"+
"****Greater Manchester\n"+
"****Hampshire\n"+
"****Hereford and Worcester\n"+
"****Herefordshire\n"+
"****Humberside\n"+
"****Huntingdonshire\n"+
"****Isle of Ely\n"+
"****Isle of Wight\n"+
"****Kent\n"+
"****Lancashire\n"+
"****Leicestershire\n"+
"****Lincolnshire\n"+
"****Greater London\n"+
"****Merseyside\n"+
"****Middlesex\n"+
"****Norfolk\n"+
"****Northamptonshire\n"+
"****Northumberland\n"+
"****North Humberside\n"+
"****North Yorkshire\n"+
"****Nottinghamshire\n"+
"****Oxfordshire\n"+
"****Rutland\n"+
"****Shropshire\n"+
"****Somerset\n"+
"****South Humberside\n"+
"****South Yorkshire\n"+
"****Staffordshire\n"+
"****Suffolk\n"+
"****Surrey\n"+
"****Sussex\n"+
"****Tyne and Wear\n"+
"****Warwickshire\n"+
"****West Midlands\n"+
"****Westmorland\n"+
"****West Suffolk\n"+
"****West Yorkshire\n"+
"****Wiltshire\n"+
"****Worcestershire\n"+
"****Yorkshire\n"+
"***Wales\n"+
"***Northern Ireland\n"+
"***Scotland\n"+
"**Vatican City";


// Taken from www.hesa.ac.uk/jacs3, using a sample set of each subject area
var TEST_SUBJECT = ""+
"Subject\n"+
"*Medicine and Dentistry\n"+
"**Pre-clinical medicine\n"+
"**Pre-clinical dentistry\n"+
"**Clinical medicine\n"+
"**Clinical dentistry\n"+
"**Others in medicine & dentistry\n"+
"**Medicine & dentistry not elsewhere classified\n"+
"*Subjects Allied to Medicine\n"+
"**Anatomy, physiology & pathology\n"+
"**Anatomy\n"+
"**Physiology\n"+
"**Clinical physiology\n"+
"**Pathology\n"+
"**Cellular pathology\n"+
"**Pathobiology\n"+
"**Neuroscience\n"+
"**Physiotherapy\n"+
"*Biological Sciences\n"+
"**Biology\n"+
"**Applied biology\n"+
"**Parasitology\n"+
"**Behavioural biology\n"+
"**Cell biology\n"+
"**Applied cell biology\n"+
"**Developmental/Reproductive biology\n"+
"**Developmental biology\n"+
"**Reproductive biology\n"+
"**Environmental biology\n"+
"**Marine/Freshwater biology\n"+
"**Marine biology\n"+
"**Freshwater biology\n"+
"**Population biology\n"+
"**Ecology\n"+
"*Veterinary sciences, agriculture & related subjects\n"+
"**Pre-clinical veterinary medicine\n"+
"**Pre-clinical veterinary medicine not elsewhere classified\n"+
"**Clinical veterinary medicine & dentistry\n"+
"**Clinical veterinary medicine\n"+
"**Clinical veterinary dentistry\n"+
"**Clinical veterinary medicine & dentistry not elsewhere classified\n"+
"**Animal science\n"+
"**Veterinary nursing\n"+
"**Animal health\n"+
"**Animal anatomy\n"+
"**Animal physiology\n"+
"**Animal pathology\n"+
"**Animal pharmacology\n"+
"*Physical sciences\n"+
"**Chemistry\n"+
"**Applied chemistry\n"+
"**Industrial chemistry\n"+
"**Colour chemistry\n"+
"**Inorganic chemistry\n"+
"**Structural chemistry\n"+
"**Crystallography\n"+
"**Environmental chemistry\n"+
"**Marine chemistry\n"+
"**Medicinal chemistry\n"+
"**Pharmaceutical chemistry\n"+
"**Organic chemistry\n"+
"**Organometallic chemistry\n"+
"**Polymer chemistry\n"+
"**Bio-organic chemistry\n"+
"**Petrochemical chemistry\n"+
"**Biomolecular chemistry\n"+
"**Physical chemistry\n"+
"**Analytical chemistry\n"+
"*Mathematical sciences\n"+
"**Mathematics\n"+
"**Pure mathematics\n"+
"**Applied mathematics\n"+
"**Mechanics (mathematical)\n"+
"**Mathematical methods\n"+
"**Numerical analysis\n"+
"**Mathematical modelling\n"+
"**Engineering/industrial mathematics\n"+
"**Computational mathematics\n"+
"**Mathematics not elsewhere classified\n"+
"*Engineering\n"+
"**General engineering\n"+
"**Integrated engineering\n"+
"**Safety engineering\n"+
"**Fire safety engineering\n"+
"**Water quality control\n"+
"**Public health engineering\n"+
"**Computer-aided engineering\n"+
"**Automated engineering design\n"+
"**Mechanics\n"+
"**Fluid mechanics\n"+
"**Solid mechanics\n"+
"**Structural mechanics\n"+
"**Engineering design\n"+
"**Bioengineering, biomedical engineering & clinical engineering\n"+
"*Computer science\n"+
"**Computer science\n"+
"**Computer architectures & operating systems\n"+
"**Computer architectures\n"+
"*Technologies\n"+
"**Minerals technology\n"+
"**Mining\n"+
"**Quarrying\n"+
"**Rock mechanics\n"+
"**Minerals processing\n"+
"**Minerals surveying\n"+
"**Petrochemical technology\n"+
"**Minerals technology not elsewhere classified\n"+
"**Metallurgy\n"+
"**Applied metallurgy\n"+
"*Architecture, building & planning\n"+
"**Architecture\n"+
"**Architectural design theory\n"+
"**Interior architecture\n"+
"**Architectural technology\n"+
"**Architecture not elsewhere classified\n"+
"*Social studies\n"+
"**Economics\n"+
"**Applied economics\n"+
"**Financial economics\n"+
"**Agricultural economics\n"+
"**Economic policy\n"+
"**Microeconomics\n"+
"*Law\n"+
"**Law by area\n"+
"**UK legal systems\n"+
"**English law\n"+
"**Welsh law\n"+
"**Northern Irish law\n"+
"**Scottish law\n"+
"**European Union law\n"+
"**Public international law\n"+
"*Business & administrative studies\n"+
"**Business studies\n"+
"**European business studies\n"+
"**International business studies\n"+
"**Business studies not elsewhere classified\n"+
"**Management studies\n"+
"**Management techniques\n"+
"**Strategic management\n"+
"**Creative management\n"+
"**Project management\n"+
"**Change management\n"+
"**Organisational development\n"+
"**Institutional management\n"+
"*Mass communications & documentation\n"+
"**Information services\n"+
"**Information management\n"+
"**Librarianship\n"+
"**Library studies\n"+
"**Curatorial studies\n"+
"**Museum studies\n"+
"**Archive studies\n"+
"**Information services not elsewhere classified\n"+
"**Publicity studies\n"+
"**Public relations\n"+
"*Linguistics, classics & related subjects\n"+
"**Linguistics\n"+
"**Applied linguistics\n"+
"**Historical linguistics\n"+
"**Phonetics & phonology\n"+
"**Phonetics\n"+
"**Phonology\n"+
"**Sociolinguistics\n"+
"**Psycholinguistics\n"+
"**British Sign Language\n"+
"**Linguistics not elsewhere classified\n"+
"**Comparative literary studies\n"+
"*European languages, literature & related subjects\n"+
"**French studies\n"+
"**French language\n"+
"*Eastern, Asiatic, African, American & Australasian languages, literature & related subjects\n"+
"**Chinese studies\n"+
"**Chinese language studies\n"+
"**Chinese literature studies\n"+
"**Chinese society & culture studies\n"+
"**Chinese studies not elsewhere classified\n"+
"**Japanese studies\n"+
"**Japanese language studies\n"+
"**Japanese literature studies\n"+
"**Japanese society & culture studies\n"+
"**Japanese studies not elsewhere classified\n"+
"**South Asian studies\n"+
"**South Asian language studies\n"+
"**Indian language studies\n"+
"*Historical & philosophical studies\n"+
"**History by period\n"+
"**Modern history\n"+
"*Creative arts & design\n"+
"**Fine art\n"+
"**Drawing\n"+
"**Painting\n"+
"**Sculpture\n"+
"**Printmaking\n"+
"**Calligraphy\n"+
"**Fine art conservation\n"+
"**Fine art not elsewhere classified\n"+
"**Design studies\n"+
"**Graphic design\n"+
"**Typography\n"+
"**Multimedia design\n"+
"**Visual communication\n"+
"**Illustration\n"+
"**Clothing/fashion design\n"+
"*Education\n"+
"**Training teachers\n"+
"*Combined/general subject unspecified\n";

// -------------------------------------------------------------------------

var NOUNS = [
"time",
"issue",
"year",
"side",
"people",
"kind",
"way",
"head",
"day",
"house",
"man",
"service",
"thing",
"friend",
"life",
"power",
"child",
"hour",
"world",
"game",
"school",
"line",
"state",
"end",
"family",
"member",
"student",
"law",
"group",
"car",
"country",
"city",
"problem",
"community",
"hand",
"name",
"part",
"president",
"place",
"team",
"case",
"minute",
"week",
"idea",
"company",
"kid",
"system",
"body",
"program",
"information",
"question",
"back",
"work",
"parent",
"government",
"face",
"number",
"others",
"night",
"level",
"office",
"point",
"door",
"home",
"health",
"water",
"person",
"room",
"art",
"mother",
"war",
"area",
"history",
"money",
"party",
"storey",
"result",
"fact",
"change",
"month",
"morning",
"lot",
"reason",
"right",
"research",
"study",
"book",
"eye",
"food",
"job",
"moment",
"word",
"air",
"business",
"teacher"
];

var JOINING_WORDS = [
    'and', 'of', 'by', 'the', 'a', 'that', 'on', 'where'
];
