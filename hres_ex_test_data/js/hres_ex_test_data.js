/* Haplo Research Manager                             http://haplo.org
 * (c) Haplo Services Ltd 2006 - 2016    http://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


var permitted = function() { return O.currentUser.isMemberOf(Group.Administrators); };
var ensurePermitted = function() { if(!permitted()) { O.stop("Not permitted"); } };

// --------------------------------------------------------------------------

P.implementService("std:action_panel:home_page", function(display, builder) {
    if(permitted()) {
        builder.panel(10000).
            link("default", '/do/hres-ex-test-data/generate', 'Generate test data');
    }
});

// --------------------------------------------------------------------------

P.respond("GET", "/do/hres-ex-test-data/generate", [
], function(E) {
    ensurePermitted();
    E.render({
        pageTitle: "Generate test data",
        options: [
            {
                action: "/do/hres-ex-test-data/institute-structure",
                label: "Research Institute structure",
                notes: "Generate the hierarchical structure of a university",
                indicator: "default"
            },
            {
                action: "/do/hres-ex-test-data/people",
                label: "People",
                notes: "Generate researcher and staff profiles, along with user objects",
                indicator: "default"
            },
            {
                action: "/do/hres-ex-test-data/funders-and-publishers",
                label: "Funders and publishers",
                notes: "Generate example research funders and publishers",
                indicator: "default"
            },
            {
                action: "/do/hres-ex-test-data/taxonomy",
                label: "Taxonomy",
                notes: "Add a new taxonomy to the schema",
                indicator: "default"
            }
        ]
    });
});

// --------------------------------------------------------------------------

P.respond("GET,POST", "/do/hres-ex-test-data/funders-and-publishers", [
    {parameter:"done", as:"int", optional:true}
], function(E, done) {
    if(E.request.method === "POST") {
        _.each(TEST_PUBLISHERS.concat(TEST_FUNDERS), function(name) {
            var publisher = O.object();
            publisher.appendType(T.Organisation);
            publisher.appendTitle(name);
            publisher.save();
        });
        E.response.redirect("/do/hres-ex-test-data/funders-and-publishers?done=1");
    }
    E.render({
        done: !!done,
        funders: TEST_FUNDERS,
        publishers: TEST_PUBLISHERS
    });
});

// --------------------------------------------------------------------------

P.respond("GET,POST", "/do/hres-ex-test-data/taxonomy", [
    {parameter:"taxonomy", as:"string", optional:true}
], function(E, taxonomy) {
    ensurePermitted();
    var parents = [];
    if(taxonomy) {
        if(taxonomy === "TEST_SUBJECT") {
            taxonomy = TEST_SUBJECT;
        } else if(taxonomy === "TEST_LOCATION") {
            taxonomy = TEST_LOCATION;
        }
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
        E.response.redirect("/search/browse/"+parents[0].ref);
    }
    E.render();
});

// --------------------------------------------------------------------------

P.respond("GET,POST", "/do/hres-ex-test-data/institute-structure", [
    {parameter:"structure", as:"string", optional:true}
], function(E, structure) {
    ensurePermitted();
    if(O.query().link(T.University,A.Type).execute().length) {
        O.stop("Institutional structure has already been set up.");
    }
    var objects = [];
    var parents = [];
    var types = [T.University, T.Faculty, T.Department];
    if(E.request.method === "POST" && structure) {
        _.each(structure.split(/[\r\n]+/), function(line) {
            var m = line.match(/^([\*\s]*)\s*(.+)\s*$/);
            if(m) {
                var level = m[1].replace(/\s+/g,'').length;
                var name = m[2];
                var institute = O.object();
                institute.appendType(types[level] || T.ResearchInstitute);
                institute.appendTitle(name);
                if(level > 0) { institute.appendParent(parents[level - 1]); }
                institute.save();
                parents[level] = institute;
                objects.push({institute:institute});
            }
        });
        return E.response.redirect("/do/hres-ex-test-data/institute-structure-done");
    }
    E.render({pageTitle: "Generate Institute structure"});
});

P.respond("GET,POST", "/do/hres-ex-test-data/institute-structure-done", [
], function(E) {
    E.render({pageTitle: "Institute structure created"});
});

// --------------------------------------------------------------------------

P.respond("GET,POST", "/do/hres-ex-test-data/people", [
], function(E) {
    ensurePermitted();
    if(O.query().link(T.Person,A.Type).execute().length) {
        O.stop("There are already some people in this application.");
    }
    if(E.request.method === "POST") {
        // Find some institutes
        var institutes = O.query().link(T.Department,A.Type).execute();
        if(institutes.length === 0) { institutes = O.query().link(T.Faculty,A.Type).execute(); }
        if(institutes.length === 0) { O.stop("Institutes haven't been created yet"); }
        // Create the users
        var instituteIndex = 0;
        _.each(TEST_NAMES, function(n) {
            var title = n[0], first = n[1], last = n[2];
            var email = (first+'.'+last+'@example.org').toLowerCase();
            var isAcademic = !!(title);
            // Profile object
            var person = O.object();
            person.appendType(isAcademic ? T.Researcher : T.Staff);
            var name = {first:first,last:last};
            if(title) { name.title = title; }
            person.appendTitle(O.text(O.T_TEXT_PERSON_NAME,name));
            person.append(O.text(O.T_IDENTIFIER_EMAIL_ADDRESS, email), A.EmailAddress);
            if(isAcademic) {
                person.append(institutes[instituteIndex], A.ResearchInstitute);
                if(++instituteIndex >= institutes.length) { instituteIndex = 0; }
            }
            person.save();
            // User account
            var userDetails = {
                email: email,
                nameFirst: first,
                nameLast: last,
                groups: isAcademic ? [Group.Researchers] : [Group.AdminStaff],
                ref: person.ref
            };
            O.setup.createUser(userDetails);
        });
    }
    E.render({
        pageTitle: "Generate test people",
        done: (E.request.method === "POST")
    });
});

// --------------------------------------------------------------------------

// Taken from http://www.accesstoresearch.org.uk/publishers
var TEST_PUBLISHERS = [
    "ALPSP",
    "Cambridge University Press",
    "De Gruyter Open (formerly Versita)",
    "Dove Press",
    "Edinburgh University Press",
    "Elsevier",
    "Emerald",
    "IOP Publishing",
    "Manchester University Press",
    "Nature Publishing Group",
    "Oxford University Press",
    "Portland Press",
    "Royal Society Journals",
    "SAGE",
    "Science Reviews 2000 Ltd",
    "Society for General Microbiology",
    "Springer",
    "Taylor and Francis",
    "Whiting & Birch",
    "Wiley",
    "Wolters Kluwer Health"
];

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

var TEST_NAMES = [
    ["","Aaron","Todd"],
    ["","Adna","Houghton"],
    ["","Alba","Murphy"],
    ["","Alexis","Roberts"],
    ["","Amelia","Morel"],
    ["","Ani","Rogers"],
    ["","Arnold","Reynolds"],
    ["","Athanasios","Moser"],
    ["","Barbara","Santos"],
    ["","Beatrice","Thomas"],
    ["","Benedict","Giordano"],
    ["","Caroline","David"],
    ["","Emilia","Forrest"],
    ["","Evangelos","Burke"],
    ["","Fatima","Riley"],
    ["","Frederick","Cole"],
    ["","Gabriella","Moore"],
    ["","Haakon","Potter"],
    ["","Hana","Martins"],
    ["","Heidi","Murray"],
    ["","Isla","Maxwell"],
    ["","Jake","Rose"],
    ["","John","Collins"],
    ["","Josephine","Torres"],
    ["","Julie","Sokolov"],
    ["","Katherine","Burns"],
    ["","Leo","Turk"],
    ["","Levi","Shah"],
    ["","Logan","Lombardi"],
    ["","Louise","Ellis"],
    ["","Mark","Harper"],
    ["","Mia","Harding"],
    ["","Minik","Webb"],
    ["","Nadia","Russell"],
    ["","Nare","Lawrence"],
    ["","Nia","Novotny"],
    ["","Oier","Vos"],
    ["","Rachel","Allen"],
    ["","Rasul","Ashton"],
    ["","Riley","Bartlett"],
    ["","Stella","Carter"],
    ["","Venla","White"],
    ["","Wilhelmina","Rees"],
    ["Dr","Adam","Smirnov"],
    ["Dr","Adele","Mitchell"],
    ["Dr","Aino","Morris"],
    ["Dr","Alva","Meijer"],
    ["Dr","Amalia","Bailey"],
    ["Dr","Ana","May"],
    ["Dr","Angela","Davis"],
    ["Dr","Anna","Lopez"],
    ["Dr","Anthony","Austin"],
    ["Dr","Anton","Abbas"],
    ["Dr","Ava","Richardson"],
    ["Dr","Blanca","Payne"],
    ["Dr","Camilla","Bradley"],
    ["Dr","Charlie","Young"],
    ["Dr","Charlotte","Winkler"],
    ["Dr","Christian","Moss"],
    ["Dr","Christina","Anderson"],
    ["Dr","Christopher","Michel"],
    ["Dr","Clara","Ismail"],
    ["Dr","Daisy","Neves"],
    ["Dr","Damian","Larsen"],
    ["Dr","Darius","Haynes"],
    ["Dr","Elsa","Kay"],
    ["Dr","Emil","Jacobs"],
    ["Dr","Emily","Love"],
    ["Dr","Emma","George"],
    ["Dr","Ethan","Wagner"],
    ["Dr","Faris","Price"],
    ["Dr","Finn","Kos"],
    ["Dr","Francis","Turner"],
    ["Dr","Freya","Harrison"],
    ["Dr","Gabija","Gordon"],
    ["Dr","Gabrielle","Knight"],
    ["Dr","Grace","Moreno"],
    ["Dr","Gregory","Newton"],
    ["Dr","Helen","Gray"],
    ["Dr","Helmi","Donnelly"],
    ["Dr","Henry","Norman"],
    ["Dr","Igor","Oliveira"],
    ["Dr","Izaro","Cooper"],
    ["Dr","Jacob","Reid"],
    ["Dr","Jade","Byrne"],
    ["Dr","Jan","Berg"],
    ["Dr","Jasmine","Hristov"],
    ["Dr","Joseph","Rice"],
    ["Dr","Kira","Stone"],
    ["Dr","Laura","Beattie"],
    ["Dr","Leah","Johnston"],
    ["Dr","Leandro","Pavlov"],
    ["Dr","Lee","Gallagher"],
    ["Dr","Leonie","Hamilton"],
    ["Dr","Lewis","Hansson"],
    ["Dr","Lola","Gregory"],
    ["Dr","Luca","Olsen"],
    ["Dr","Luka","Curtis"],
    ["Dr","Magdalene","Barrett"],
    ["Dr","Maja","Kennedy"],
    ["Dr","Mane","Long"],
    ["Dr","Manon","Ryan"],
    ["Dr","Marc","Ali"],
    ["Dr","Marie","Lowe"],
    ["Dr","Mario","Ball"],
    ["Dr","Marko","Bauer"],
    ["Dr","Martina","Lucas"],
    ["Dr","Matthew","Walton"],
    ["Dr","Maxim","Bolton"],
    ["Dr","Maya","Morrison"],
    ["Dr","Milan","Scott"],
    ["Dr","Milica","Karlsen"],
    ["Dr","Myrtle","Simon"],
    ["Dr","Narek","Crawford"],
    ["Dr","Natalia","Robinson"],
    ["Dr","Nazar","Fischer"],
    ["Dr","Nico","Kaya"],
    ["Dr","Nicole","Saunders"],
    ["Dr","Nikita","Lang"],
    ["Dr","Noa","Middleton"],
    ["Dr","Olivia","Binder"],
    ["Dr","Oscar","Powell"],
    ["Dr","Paula","Flynn"],
    ["Dr","Peter","Ferguson"],
    ["Dr","Petra","Garcia"],
    ["Dr","Raphael","Fernandez"],
    ["Dr","Rasmus","Harris"],
    ["Dr","Rebecca","Hansen"],
    ["Dr","Ronja","Stephenson"],
    ["Dr","Ruby","Holland"],
    ["Dr","Sandra","Musa"],
    ["Dr","Sienna","Carr"],
    ["Dr","Simon","Hunt"],
    ["Dr","Simone","Ibrahim"],
    ["Dr","Tea","Graham"],
    ["Dr","Theodora","Greenwood"],
    ["Dr","Theodore","Matos"],
    ["Dr","Uxue","Mazur"],
    ["Dr","Valentina","Cunningham"],
    ["Dr","Valeria","Fraser"],
    ["Dr","Zechariah","Sepp"],
    ["Prof","Aiden","Hodgson"],
    ["Prof","Aimar","Thompson"],
    ["Prof","Alan","Borg"],
    ["Prof","Alice","Bishop"],
    ["Prof","Amanda","Gilbert"],
    ["Prof","Caden","Hudson"],
    ["Prof","Camille","Johnson"],
    ["Prof","Christos","Grant"],
    ["Prof","Dunja","Davidson"],
    ["Prof","Elizabeth","Walker"],
    ["Prof","Gabriela","Janssen"],
    ["Prof","George","Bryant"],
    ["Prof","Hannah","Webster"],
    ["Prof","Hassan","Bob"],
    ["Prof","Ida","Rowland"],
    ["Prof","Jessica","Burton"],
    ["Prof","Joel","Phillips"],
    ["Prof","Julia","Clarke"],
    ["Prof","Juliette","Jarvis"],
    ["Prof","June","Klein"],
    ["Prof","Ladina","Nielsen"],
    ["Prof","Lamia","Lewis"],
    ["Prof","Lana","Pritchard"],
    ["Prof","Leon","Sheppard"],
    ["Prof","Louis","Gill"],
    ["Prof","Maria","Kelly"],
    ["Prof","Martha","Field"],
    ["Prof","Mary","Dunn"],
    ["Prof","Mason","Oliver"],
    ["Prof","Mila","Alexander"],
    ["Prof","Nahia","Evans"],
    ["Prof","Natalie","Higgins"],
    ["Prof","Nathan","Hopkins"],
    ["Prof","Noel","Marino"],
    ["Prof","Oliver","Serrano"],
    ["Prof","Pascal","Ward"],
    ["Prof","Polina","Ries"],
    ["Prof","Ryan","Hunter"],
    ["Prof","Sarah","Frost"],
    ["Prof","Seren","Butler"],
    ["Prof","Susanna","Marshall"]
];
