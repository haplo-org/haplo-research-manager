
/*
    Support for NAME() for basic schema objects, with plural support.

    List of type names below will be translated to the name of the type in the schema.

    Prefix with '+' for the plural version, eg
        NAME('Faculty') -> Faculty
        NAME('+Faculty') -> Faculties

    The pluraliser is very simple, and is intended to be extended as requirements
    are discovered.
*/

var TYPE_NOUNS = {
    "Researcher": true,
    "Staff": true,
    "ResearchInstitute": true,
    "University": true,
    "Faculty": true,
    "Department": true,
    "School": true,
    "ResearchGroup": true
};

P.implementService("std:NAME", function(name) {
    var t = maybeTranslate(name);
    if(t) {
        return t;
    } else if(name.length > 1 && name.charAt(0) === '+') {
        // Plural version
        t = maybeTranslate(name.substring(1));
        if(t) {
            return pluralise(t);
        }
    }
});

var maybeTranslate = function(name) {
    if(name in TYPE_NOUNS) {
        return SCHEMA.getTypeInfo(T[name]).name;
    }
};

var pluralise = function(name) {
    var match = name.match(/^(.+)y$/);
    if(match) {
        return match[1]+'ies';
    }
    return name+'s';
};
