"use strict";

var request = require('request');
var et = require('elementtree');
var moment = require('moment');
var pg = require('pg');
var hstore = require('node-postgres-hstore');
var url = require('url');

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


var CONN;
// check if running on Heroku
if(process.env.DYNO){
    CONN = process.env.DATABASE_URL;
}else{
    var config = url.parse(process.env.DATABASE_URL);

    CONN = {
      user: config.auth.split(':')[0],
      password: config.auth.split(':')[1],
      database: config.path.slice(1),
      host: config.hostname,
      port: config.port,
      ssl: true
    };
}


var XML_PATH = process.env.XML_PATH;

var defs = require("./lib/template_definitions.js")();

var convio_types =[
    {type: 'event', query: './Events/Event', def: defs.eventsDef},
    {type: 'park', query: './Parks/Park', def: defs.parksDef},
    {type: 'location', query: './ParkLocations/ParkLocation', def: defs.locationDef},
    {type: 'program', query: './Programs/Program', def: defs.programDef},
    {type: 'subprogram', query: './SubPrograms/SubProgram', def: defs.subprogramDef},
    {type: 'project', query: './Projects/Project', def: defs.projectsDef},
    {type: 'specie', query: './Species/Specie', def: defs.speciesDef}
];


var summary = {};


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

    /*

    // remove this if using the above code
    try{
        value = item.findtext(mapper.query);
    }catch(e){
        logger(1, '[Error] - Could not find text.');
    }
    */


    // apply any type and format mutations
    if(mapper.type && value){
        value = applyInsertFormat(value, mapper.type, mapper.format || '');
    }

    return value;
}

// find nodes by query
var findNodes = function(xml){
    var startOfToday = moment().startOf('day');
    var parsed = [];

    convio_types.forEach(function(item){
        var kind = item.type,
            query = item.query,
            defs = item.def;

        summary[kind] = {valid:0, invalid:0};

        var items = xml.findall(query);

        if(items.length){
            items.forEach(function(item, idx){
                var obj = {};

                var valid = true;
                for(var def in defs){
                    var key = def,
                        required = defs[key].required || false,
                        removeOldDates = defs[key].removeOldDates || false,
                        value = parseItem(item, defs[key]);

                    obj[key] = value || '';

                    // Validation methods...

                    // pretty simple, empty = invalid
                    if(required){
                        if(obj[key].length < 1) valid = false;
                    }

                    // remove events that are done
                    if(valid && removeOldDates){
                        var dt = moment(obj[key], defs[key].format);
                        if( dt < startOfToday)valid = false;
                    }
                }

                if(valid){
                    summary[kind].valid++;
                    parsed.push({kind:kind, attributes:obj});
                }else{
                    summary[kind].invalid++;
                }

            });

        }
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

    var rollback = function(client, done) {
        client.query('ROLLBACK', function(err) {
        //if there was a problem rolling back the query
        //something is seriously messed up.  Return the error
        //to the done function to close & remove this client from
        //the pool.  If you leave a client in the pool with an unaborted
        //transaction __very bad things__ will happen.
        return done(err);
        });
    };

    pg.connect(CONN, function(err, client, done) {
        if(err) throw err;
        loadXmlFile(function(xml){
            if(xml){
                client.query('BEGIN', function(err) {
                    if(err){
                        logger(2, err);
                        return rollback(client, done);
                    }

                    process.nextTick(function() {
                        client.query('TRUNCATE convio',function(err) {
                            if(err){
                                logger(2, err);
                                return rollback(client, done);
                            }

                            var nodes = findNodes(xml);

                            function insertNode(){

                                if(nodes.length){
                                    var node = nodes.pop();

                                    var attrsString = hstore.stringify(node.attributes),
                                        kind = node.kind;

                                    logger(2, '(' + nodes.length + ') -- ' + kind + ' -- ' + attrsString);

                                    client.query('INSERT INTO convio (kind, attributes) VALUES ($1, $2)', [kind, attrsString], function(err, result) {

                                        if(err){
                                            console.log("PROBLEM WITH THE INSERT")

                                            logger(2, err);
                                            return rollback(client, done);
                                        }

                                        insertNode();
                                    });
                                }else{
                                    logger(2, "ABOUT TO COMMIT: ");
                                    logger(2, '-----------------------------');

                                    client.query('COMMIT', function(err){
                                        if(err){
                                            logger(2, "COMMIT ERROR");
                                        }else{
                                            logger(2, 'COMMIT DONE!');
                                        }

                                        logger(2, '');

                                        console.log(summary);
                                        done();
                                    });
                                }
                            }

                            // start the inserting
                            insertNode();
                        });
                    });

                });
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

var dryrun = function(){
    loadXmlFile(function(xml){
        if (xml){
            var nodes = findNodes(xml);
            console.log(summary);
        }
    });
}

run();
//dryrun();

