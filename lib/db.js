/**
  * Database functions for api
  *
  */

var pg = require('pg');
var hstore = require('node-postgres-hstore');
var moment = require('moment');

var defs = require("./template_definitions.js")();

module.exports = exports = function(options) {
    return lib;
};

var lib = {};

var CONNECTION_STRING = process.env.DATABASE_URL;

var runQuery = function(query, params, callback){
    pg.connect(CONNECTION_STRING, function(err, client, done) {
        if(err) {
            return callback({
                'error fetching client from pool': err
            });
        }

        client.query(query, params, function(err, result) {
            //call `done()` to release the client back to the pool
            done();

            if(err) {
                return callback({
                    'error running query': err
                });
            }

            return callback(null, result);

        });
    });
}

var applyOutputFormat = function(item, type, format){
    switch(type){
        case 'date':
            return item;
            /*
            if(format){
                return moment(item, format).toDate()
            }else{
                return new Date(item)
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

var processResult = function(kind, result){
    var out = {};
    out.results = [];

    if(result && result.rows){

        result.rows.forEach(function(row){

            var attributes = hstore.parse(row.attributes);

            if(defs.kinds.hasOwnProperty(kind)){
                var def = defs.kinds[kind];

                for(var key in attributes){
                    attributes[key] = applyOutputFormat(attributes[key], def[key].type || '', def[key].format || '' )
                }
            }

            out.results.push({
                'kind': row.kind,
                'attributes':  attributes
            });
        });

    }

    out.timestamp = +new Date();
    out.length = out.results.length;

    return out;
}

lib.searchByTitle = function(kind, title, callback){

    var query = "select * from convio where kind = $1 AND to_tsvector('english', attributes->'title') @@ to_tsquery('english', $2)";
    var params = [kind, title];

    runQuery(query, params, function(err, data){

        if(err){
            return callback( err );
        }

        return callback( processResult(kind, data) );
    });
}

lib.findByFilename = function(kind, filename, callback){
    filename = filename.split('.').shift();
    filename += '.html';
    var query = "select * from convio where kind = $1 AND attributes->'filename' = $2";
    var params = [kind, filename];

    runQuery(query, params, function(err, data){

        if(err){
            return callback( err );
        }

        return callback( processResult(kind, data) );
    });
}

lib.findById = function(kind, id, callback){
    var query = "select * from convio where kind = $1 AND attributes->'id' = $2";
    var params = [kind, id];

    runQuery(query, params, function(err, data){

        if(err){
            return callback( err );
        }

        return callback( processResult(kind, data) );
    });
}

