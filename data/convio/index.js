"use strict";

var request = require('request');
var et = require('elementtree');
var moment = require('moment');
var pg = require('pg');
var hstore = require('node-postgres-hstore');

var DEBUG = true;
var DEBUGLEVEL = 2;
var logger = function(level, msg){
    if(DEBUG && level >= DEBUGLEVEL)console.log(msg);
}

var xmlFile = 'http://www.parksconservancy.org/z-testing/stamens-sandbox/stamen-xml-feed.xml';

// ssh -gvN -L 5433:localhost:5432 geo.local
// psql -U ggnpc -d ggnpc -p 5433 -h 127.0.0.1
var pgConString = "postgres://ggnpc:@localhost:5433/ggnpc";

// type is used when we export these out
// as JSON
var eventsDef = {
    'id': {query: './id'},
    'title': {query: './Title'},
    'description': {query: './Description'},
    'filename': {query: './FileName'},
    'image': {query: './Image', attr: 'src', child: true},
    'thumbnail': {query: './ImageThumb', attr: 'src', child: true},
    'location': {query: './Location'},
    'startdate': {query: './StartDate', type: 'date', format: 'YYYY-MM-DD H:mm'},
    'enddate': {query: './EndDate', type: 'date', format: 'YYYY-MM-DD H:mm'},
    'displaydate': {query: './DisplayDateTime' },
    'cost': {query: './Cost' },
    'eventtypes': {query: './EventType', type:'array'},
    'phone': {query: './Phone' },
    'audience': {query: './Audience', type:'array'},
    'relatedpark': {query: './RelatedParks' },
    'relatedprogram': {query: './RelatedPrograms' },
    'relatedsubprogram': {query: './RelatedSubPrograms' }
}

var parksDef = {
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

var locationDef = {
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

var programDef = {
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

var subprogramDef = {
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
    'meetinglocation': {query: './MeetingLocation'},
    'image': {query: './Image', attr: 'src', child: true},
    'thumbnail': {query: './ImageThumb', attr: 'src', child: true},
    'relatedprogram': {query: './RelatedProgram'},
    'relatedpark': {query: './RelatedPark'}
}

var projectsDef = {
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

var speciesDef = {
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


var applyFormat = function(item, type, format){
    switch(type){
        case 'date':
            return item;

            /*
            if(format){
                return moment(item, format);
            }else{
                return moment(item)
            }
            */

        break;
        case 'array':
            return item.split(',');
        break;
        default:
            return item;
        break;
    }
}

// parser for each item in a tree
var parseItem = function(item, mapper){
    return item.findtext(mapper.query);

    var value;
    if(mapper.attr){

        if(mapper.child){

            try{
                value = et.parse( item.findtext(mapper.query) ).getroot().get(mapper.attr);
            }catch(e){
                logger(1, ('[Error] - Could not find attribute of the child. ( ' + mapper.query + ' )'));
            }

        }else{

            try{
                value = item.get(mapper.attr)
            }catch(e){
                logger(1, '[Error] - Could not find attribute of the item.');
            }

        }

    }else{

        try{
            value = item.findtext(mapper.query);
        }catch(e){
            logger(1, '[Error] - Could not find text.');
        }

    }

    // do this on output only?
    if(mapper.type && value){

        //value = applyFormat(value, mapper.type, mapper.format || '');

    }

    return value;
}

// find nodes by query
var findNodes = function(kind, query, defs, xml, writer){
    var items = xml.findall(query);

    if(!items.length)return;

    logger(1, "There are " + items.length + " " + kind + "s." );

    var parsed = [];
    items.forEach(function(item, idx){
        var obj = {};

        for(var def in defs){
            var key = def,
                value = parseItem(item, defs[def])
            obj[key] = value || '';
        }

        logger(2, "(" + idx + ") -- " + hstore.stringify(obj)  );
        logger(2, '');

        parsed.push(obj);

        if(writer) writer(kind, obj);


    });

    return parsed;
}

// Load XML file
// TODO: how to identify new items?
var loadXmlFile = function(callback){
    request(xmlFile, function (error, response, body) {
        if (!error && response.statusCode == 200) {

            var xml = et.parse(body.toString());
            callback(xml);

        }else{

            callback(null);
        }
    });
}

var run = function(){
    pg.connect(pgConString, function(err, client, done) {

        var handleError = function(err) {
          if(!err) return false;

          logger(1, "%ERROR: " + err );

          done(client);
          next(err);
          return true;
        };

        var setupTransaction = function(callback){
            client.query('BEGIN',function(err, result) {
                if(handleError(err)) return;
                done();

                client.query('TRUNCATE convio',function(err, result) {
                    if(handleError(err)) return;
                    done();
                    callback();
                });
            });
        }

        var writeData = function(kind, attrs){
            var attrsString = hstore.stringify(attrs);

            logger(1, kind + ', ' + attrsString );

            client.query('INSERT INTO convio (kind, attributes) VALUES ($1, $2)', [kind, attrsString], function(err, result) {
                if(handleError(err)) return;
                done();
            });
        }

        // load xml file to parse
        // begin parsing and writing inserts
        loadXmlFile(function(xml){
            if(xml){

                setupTransaction( function(){

                    // run through all the types
                    findNodes('event', './Events/Event', eventsDef, xml, writeData);
                    findNodes('park', './Parks/Park', parksDef, xml, writeData);
                    findNodes('location', './ParkLocations/ParkLocation', locationDef, xml, writeData);
                    findNodes('program', './Programs/Program', programDef, xml, writeData);
                    findNodes('subprogram', './SubPrograms/SubProgram', subprogramDef, xml, writeData);
                    findNodes('project', './Projects/Project', projectsDef, xml, writeData);
                    findNodes('specie', './Species/Specie', speciesDef, xml, writeData);

                    // commit
                    client.query('COMMIT',function(err, result) {
                        if(handleError(err)) return;
                        done();
                    });

                });

            }else{
                logger(1, "No XML file!");
            }
        });

    });
}


var groupProperty = function(items, prop){
    var group = {};

    items.forEach(function(item){
        var key = (item.hasOwnProperty(prop)) ? item[prop].split('/').pop() : '';
        if(!group.hasOwnProperty(key)){
            group[key] = 0;
        }
        group[key] += 1;
    });

    console.log('');
    console.log('');
    console.log('');
    console.log('');
    console.log(group);

}

var test = function(){
    loadXmlFile(function(xml){
        if(xml){

            //var items = findNodes('event', './Events/Event', eventsDef, xml, null);

            //var items = findNodes('park', './Parks/Park', parksDef, xml, null);
            //groupProperty(items, 'link');

            //var items = findNodes('location', './ParkLocations/ParkLocation', locationDef, xml, null);
            //groupProperty(items, 'relatedpark');

            //var items = findNodes('program', './Programs/Program', programDef, xml, null);
            //findNodes('subprogram', './SubPrograms/SubProgram', subprogramDef, xml, null);

            //findNodes('subprogram', './Projects/Project', projectsDef, xml, null);

            //findNodes('species', './Species/Specie', speciesDef, xml, null);

        }
    });
}

run();



