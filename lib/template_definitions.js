module.exports = exports = function(options) {
    return defs;
};
var defs = {};

defs.eventsDef = {
    'id': {query: './id'},
    'title': {query: './Title'},
    'description': {query: './Description'},
    'filename': {query: './FileName'},
    'image': {query: './Image', attr: 'src', child: true},
    'thumbnail': {query: './ImageThumb', attr: 'src', child: true},
    'location': {query: './Location'},
    'locationmap': {query: './LocationMap', attr: 'href', child: true, required: true},
    'startdate': {query: './StartDate', type: 'date', format: 'YYYY-MM-DD H:mm'},
    'enddate': {query: './EndDate', type: 'date', format: 'YYYY-MM-DD H:mm', removeOldDates: true},
    'displaydate': {query: './DisplayDateTime' },
    'cost': {query: './Cost' },
    'eventtypes': {query: './EventType', type:'array'},
    'phone': {query: './Phone' },
    'audience': {query: './Audience', type:'array'},
    'relatedpark': {query: './RelatedParks' },
    'relatedprogram': {query: './RelatedPrograms' },
    'relatedsubprogram': {query: './RelatedSubPrograms' }
}

defs.parksDef = {
    'id': {query: './id'},
    'filename': {query: './FileName'},
    'title': {query: './Title'},
    'description': {query: './Description'},
    'hours': {query: './Hours'},
    'address': {query: './StreetAddress'},
    'location': {query: './Location'},
    'link': {query: './Link'},
    'dogs': {query: './Dogs' },
    'image': {query: './ImageMain', attr: 'src', child: true},
    'thumbnail': {query: './ImageThumb', attr: 'src', child: true},
    'relatedproject': {query: './RelatedProject' }
}

defs.locationDef = {
    'id': {query: './id'},
    'filename': {query: './FileName'},
    'title': {query: './Title'},
    'description': {query: './Description'},
    'hours': {query: './Hours'},
    'address': {query: './StreetAddress'},
    'location': {query: './Location'},
    'link': {query: './Link'},
    'parklocationtype': {query: './ParkLocationType' },
    'relatedpark': {query: './RelatedPark' }
}

defs.programDef = {
    'id': {query: './id'},
    'filename': {query: './FileName'},
    'url': {query: './Link'},
    'title': {query: './Title'},
    'description': {query: './Description'},
    'image': {query: './Image', attr: 'src', child: true},
    'contactinfo': {query: './ContactInfo'},
    'donationurl': {query: './DonationUrl'},
    'location': {query: './Location'}
}

defs.subprogramDef = {
    'id': {query: './id'},
    'filename': {query: './FileName'},
    'url': {query: './Link'},
    'title': {query: './Title'},
    'description': {query: './Description'},
    'contactinfo': {query: './ContactInfo'},
    'volunteertype': {query: './VolunteerType'},
    'agegroup': {query: './AgeGroup'},
    'registrationurl': {query: './RegistrationUrl'},
    'date': {query: './Date'},
    'locationmap': {query: './LocationMap', attr: 'href', child: true, required: true},
    'meetinglocation': {query: './MeetingLocation'},
    'image': {query: './Image', attr: 'src', child: true},
    'thumbnail': {query: './ImageThumb', attr: 'src', child: true},
    'relatedprogram': {query: './RelatedProgram'},
    'relatedpark': {query: './RelatedPark'}
}

defs.projectsDef = {
    'id': {query: './id'},
    'filename': {query: './FileName'},
    'url': {query: './Link'},
    'title': {query: './Title'},
    'description': {query: './Description'},
    'image': {query: './Image', attr: 'src', child: true},
    'thumbnail': {query: './ImageThumb', attr: 'src', child: true},
    'startdate': {query: './StartDate'},
    'enddate': {query: './EndDate'},
    'contactinfo': {query: './ContactInfo'},
    'relatedprogram': {query: './RelatedProgram'},
    'relatedpark': {query: './RelatedPark'},
    'relatedspecies': {query: './RelatedSpecies'}
}

defs.speciesDef = {
    'id': {query: './id'},
    'filename': {query: './FileName'},
    'url': {query: './Link'},
    'title': {query: './Title'},
    'description': {query: './Description'},
    'image': {query: './Image', attr: 'src', child: true},
    'thumbnail': {query: './ImageThumb', attr: 'src', child: true},
    'relatedprogram': {query: './RelatedProgram'},
    'relatedpark': {query: './RelatedPark'}
}

defs.kinds = {
    'event': defs.eventsDef,
    'park': defs.parksDef,
    'location': defs.locationDef,
    'program': defs.programDef,
    'subprogram': defs.subprogramDef,
    'project': defs.projectsDef,
    'specie': defs.speciesDef
}