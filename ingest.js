"use strict";

var request = require('request');
var et = require('elementtree');
var moment = require('moment');
var pg = require('pg');
var hstore = require('node-postgres-hstore');
var url = require('url');
var googleGeocoder = require('geocoder');

var opts = require("optimist")
    .usage("--test will run the Convio feed inhaler with out saving to DB.  Optional can set a specific kind in environment variable.")
    .demand([]);

var ARGV = opts.argv;
var testKind = 'all';


var CONN = process.env.DATABASE_URL;


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
                console.log('[Error] - Could not find attribute of the child. ( ' + mapper.query + ' )');
            }

        }else{

            try{
                value = item.get(mapper.attr)
            }catch(e){
                console.log('[Error] - Could not find attribute of the item.');
            }

        }

    }else{

        try{
            value = item.findtext(mapper.query);
        }catch(e){
            console.log('[Error] - Could not find text.');
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
};

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

            try{
                var xml = et.parse(body.toString());
                callback(xml);
            }catch(e){
                console.log(e);
            }

        }else{

            callback(null);
        }
    });
};

var run = function(callback){
    var rollbacked = false;
    var rollback = function(client, done) {
        rollbacked = true;
        client.query('ROLLBACK', function(err) {
            return done(err);
        });
        callback('error');
    };

    pg.connect(CONN, function(err, client, done) {
        if(err) {
            callback('error');
            throw err;
        }
        loadXmlFile(function(xml){
            if(xml){
                client.query('BEGIN', function(err) {
                    if(err){
                        console.log(err);
                        return rollback(client, done);
                    }

                    process.nextTick(function() {
                        client.query('TRUNCATE convio',function(err) {
                            if(err){
                                console.log( err);
                                return rollback(client, done);
                            }

                            var nodes = findNodes(xml);

                            function insertNode(){

                                if(nodes.length){
                                    var node = nodes.pop();

                                    var attrsString = hstore.stringify(node.attributes),
                                        kind = node.kind;

                                    console.log( '(' + nodes.length + ') -- ' + kind + ' -- ' + attrsString);

                                    client.query('INSERT INTO convio (kind, attributes) VALUES ($1, $2)', [kind, attrsString], function(err, result) {

                                        if(err){
                                            console.log("PROBLEM WITH THE INSERT")

                                            console.log( err);
                                            return rollback(client, done);
                                        }

                                        insertNode();
                                    });
                                }else{
                                    console.log( "ABOUT TO COMMIT: ");
                                    console.log( '-----------------------------');

                                    client.query('COMMIT', function(err){
                                        if(err){
                                            console.log( "COMMIT ERROR");
                                        }else{
                                            console.log( 'COMMIT DONE!');
                                        }

                                        console.log( '');

                                        console.log(summary);

                                        console.log( '');

                                        done();

                                        callback(null);
                                    });
                                }
                            }

                            // start the inserting
                            insertNode();
                        });
                    });

                });

            }else{ // no xml
                callback('error');
            }
        });
    });
};


// XXX: this still needs to be tested on an actual update
var geocodeAndCreateGeom = function(){
    var regexp = new RegExp(/^.*\bCA\b/);
    pg.connect(CONN, function(err, client, done) {
        if(err) {
            return callback({
                'error fetching client from pool': err
            });
        }
        var query = "select attributes->'id' as id, attributes->'location' as location from convio where geom is null";
        var params = [];
        client.query(query, params, function(err, result) {
            //call `done()` to release the client back to the pool
            done();

            if(err) {
                return callback({
                    'error running query': err
                });
            }

            var addresses = [];

            // runs pgsql functions
            function createGeoms(){
                console.log('');
                console.log("**** Creating Geom fields for convio items ****");
                console.log('');

                client.query('select convio_convert_locations()', [], function(err, resp) {
                    done();
                });
                client.query('select convio_convert_locationmap()', [], function(err, resp) {
                    done();
                });
                client.query('select convio_convert_locationlinks()', [], function(err, resp) {
                    done();
                });
                client.query('select convio_convert_relatedparklocation()', [], function(err, resp) {
                    done();
                });

                console.log( '');
                console.log('Convio ingest complete....:)');
            }

            function _geocode(){
                if(!addresses.length) {
                    createGeoms();
                    return;
                }

                var item = addresses.pop();
                console.log("Location: ", item.location);
                if(regexp.test(item.location)){

                    console.log("");
                    console.log("Starting geocoding for item: ", item.id);

                    googleGeocoder.geocode(item.location, function ( err, data ) {
                        if(data.hasOwnProperty('status') && data.status.toLowerCase() == 'ok'){
                            var lat = data.results[0].geometry.location.lat,
                                lng = data.results[0].geometry.location.lng,
                                locStr = lat + "," + lng,
                                addrStr = item.location;

                            console.log("Found lat/lng (%s,%s)", lat, lng);

                            var q = "UPDATE convio set geom = ST_SetSRID(ST_MakePoint($1, $2), 4326), attributes = attributes || hstore(ARRAY['location',$3,'address',$4]) where attributes->'id' = $5;";

                            client.query(q, [lng, lat, locStr, addrStr, item.id], function(err, resp) {

                                if(err){
                                    console.log("Error writing result to DB: ", err);
                                }else{
                                    console.log("Successfully wrote result to DB");
                                }

                                done();

                                _geocode();
                            });

                        }else{
                            _geocode();
                        }

                    });

                } else {
                    _geocode();
                }
            }

            if(result && result.hasOwnProperty('rows')){
                result.rows.forEach(function(row){
                    if(regexp.test(row.location)){
                        addresses.push(row);
                    }
                });
            }

            if(addresses.length){
                console.log('Found %s rows that need geocoding.', addresses.length);
            }else{
                console.log("No rows to process");
            }

            _geocode();

        });
    });
};


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
            console.log("XML PARSED!")
            //var nodes = findNodes(xml);
            //console.log(summary);
        }
    });
};

// XXX: callback to geocodeAndCreateGeom still needs to be tested on an actual ingest
run(function(err){
    if(!err){
        geocodeAndCreateGeom();
    }
});
//dryrun();

