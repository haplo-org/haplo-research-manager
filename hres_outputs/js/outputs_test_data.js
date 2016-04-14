
P.implementService("hres:development:generate-test-data-end", function() {
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

    _.each(TEST_PUBLISHERS.concat(TEST_FUNDERS), function(name) {
        var publisher = O.object();
        publisher.appendType(T.Organisation);
        publisher.appendTitle(name);
        publisher.save();
    });
});
