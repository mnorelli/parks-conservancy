"use strict";

var request = require('request');
var et = require('elementtree');
var moment = require('moment');
var pg = require('pg');
var hstore = require('node-postgres-hstore');

var opts = require("optimist")
    .usage("--test will run the Convio feed inhaler in a with out saving to DB.  Optional can set a specific kind in environment variable.")
    .demand([]);

var ARGV = opts.argv;
var testKind = 'all';

var DEBUG = true;
var DEBUGLEVEL = 2;
var logger = function(level, msg){
    if(DEBUG && level >= DEBUGLEVEL)console.log(msg);
}

var PG_CONNECTION_STRING = process.env.DATABASE_URL;
var XML_PATH = process.env.XML_PATH

var defs = require("./lib/template_definitions.js")();

// normalizes GGNPC dates to 'YYYY-MM-DD H:mm' format
// found problems, like: '2013-07-12 9am'
var normalizeDate = function(item){
    if(!item)return '';

    var temp = item.replace(/[^\d:-\s]/g, '').trim();
    var parts = temp.split(' ');
    var hour,
        minutes,
        date,
        time;

    if(parts.length){
        date = parts[0];
        if(parts.length == 1){ // no time for date
            return date + ' 00:00';
        }else{
            var timeParts = parts[1].split(':');

            // fix time
            if(timeParts.length){
                hour = timeParts[0].trim();

                if(hour.length < 1){
                    hour = '00';
                }else if(hour.length == 1){ // missing leading zero
                    hour = '0' + hour;
                }else{
                    hour = hour.slice(0,2);
                }

                if(timeParts.length == 2){
                    minutes = timeParts[1].trim();
                }else{
                    minutes = '00';
                }

                time = hour + ':' + minutes;


            }else{
                time = '00:00';
            }

            return date + ' ' + time;
        }
    }

    return item;
}

var applyInsertFormat = function(item, type, format){
    switch(type){
        case 'date':
            return normalizeDate(item);

            /*
            if(format){
                return moment(item, format);
            }else{
                return moment(item)
            }
            */

        break;
        default:
            return item;
        break;
    }
}

// parser for each item in a tree
var parseItem = function(item, mapper){

    var value;
    // do various things to item to pull out it's content
    // for example, links to images are an attribute of an img tag
    // skipping for now
    /*
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
    */

    // remove this if using the above code
    try{
        value = item.findtext(mapper.query);
    }catch(e){
        logger(1, '[Error] - Could not find text.');
    }

    // apply any type and format mutations
    if(mapper.type && value){
        value = applyInsertFormat(value, mapper.type, mapper.format || '');
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
    request(XML_PATH, function (error, response, body) {
        if (!error && response.statusCode == 200) {

            var xml = et.parse(body.toString());
            callback(xml);

        }else{

            callback(null);
        }
    });
}

var run = function(){
    pg.connect(PG_CONNECTION_STRING, function(err, client, done) {

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
                    findNodes('event', './Events/Event', defs.eventsDef, xml, writeData);
                    findNodes('park', './Parks/Park', defs.parksDef, xml, writeData);
                    findNodes('location', './ParkLocations/ParkLocation', defs.locationDef, xml, writeData);
                    findNodes('program', './Programs/Program', defs.programDef, xml, writeData);
                    findNodes('subprogram', './SubPrograms/SubProgram', defs.subprogramDef, xml, writeData);
                    findNodes('project', './Projects/Project', defs.projectsDef, xml, writeData);
                    findNodes('specie', './Species/Specie', defs.speciesDef, xml, writeData);

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
            if(testKind == 'all' || testKind == 'event')        findNodes('event', './Events/Event', defs.eventsDef, xml, null);
            if(testKind == 'all' || testKind == 'park')         findNodes('park', './Parks/Park', defs.parksDef, xml, null);
            if(testKind == 'all' || testKind == 'location')     findNodes('location', './ParkLocations/ParkLocation', defs.locationDef, xml, null);
            if(testKind == 'all' || testKind == 'program')      findNodes('program', './Programs/Program', defs.programDef, xml, null);
            if(testKind == 'all' || testKind == 'subprogram')   findNodes('subprogram', './SubPrograms/SubProgram', defs.subprogramDef, xml, null);
            if(testKind == 'all' || testKind == 'project')      findNodes('project', './Projects/Project', defs.projectsDef, xml, null);
            if(testKind == 'all' || testKind == 'specie')      findNodes('species', './Species/Specie', defs.speciesDef, xml, null);
        }
    });
}

if(ARGV.test){
    testKind = ARGV.test || 'all';
    if(testKind == true)testKind = 'all';

    console.log("TEST: ", testKind);
    //test();
}else{
    //run();
}



