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

    kind = kind || '';

    if(result && result.rows){

        result.rows.forEach(function(row){

            kind = row.kind || kind;

            var obj = {};
            for(var key in row){
                if(key == 'attributes'){
                    var attributes = hstore.parse(row.attributes);

                    if(defs.kinds.hasOwnProperty(kind)){
                        var def = defs.kinds[kind];

                        for(var attr in attributes){
                            attributes[attr] = applyOutputFormat(attributes[attr], def[attr].type || '', def[attr].format || '' )
                        }
                    }

                    obj.attributes = attributes;

                }else{
                    obj[key] = row[key];
                }

            }

            out.results.push(obj);
        });

    }

    out.timestamp = +new Date();
    out.length = out.results.length;

    return out;
}

var normalizeFilename = lib.normalizeFilename = function(filename){
    filename = filename.split('.').shift();
    filename += '.html';
    return filename;
}

var validKind = function(kind){
    return defs.kinds.hasOwnProperty(kind);
}

var normalizeKind = lib.normalizeKind = function(kind){
    return (validKind(kind)) ? kind : "*";
}

// TODO: write me
var validAttribute = function(){

}


/**
  * {kind: 'park', attributes: {'id':<val>,{'filename':<val>,...}, textsearch: {attribute:<val>, needle: <val>}}
  */
var makeWhereStatement = lib.makeWhereStatement = function(paramsObject){
    var where = "";
    var params = [];
    var idx = 1;

    function connectors(){
        if(!where.length){
            where = "WHERE ";
        }else{
            where += " AND ";
        }
    }

    for(var key in paramsObject){
        var value = paramsObject[key];

        if(key == 'kind' && validKind(value) && value != '*'){ // '*' or any non-valid kind will not restrict query to a specific kind
            connectors();
            if(value.charAt(0) == "!"){
                where += "kind != $" + idx;
                params.push(value.slice(1));
            }else{
                where += "kind = $" + idx;
                params.push(value);
            }


            idx++;
        }else if(key == 'attributes'){
            if(value instanceof Object){
                for(var attr in value){
                    var attrValue = value[attr];
                    if(attr == 'filename')attrValue = normalizeFilename(attrValue);

                    connectors();
                    if(attrValue.charAt(0) == "!"){
                        where += "attributes->'" + attr + "' != $" + idx;
                        params.push(attrValue.slice(1));
                    }else{
                        where += "attributes->'" + attr + "' = $" + idx;
                        params.push(attrValue);
                    }
                    idx++;
                }
            }
        }else if(key == 'textsearch'){
            if(value.attribute && value.needle){
                connectors();
                where += "to_tsvector('english', attributes->'" + value.attribute + "')";
                where += " @@ to_tsquery('english', $" + idx + ")";
                params.push(value.needle);
                idx++;
            }
        }
    }

    return {where: where, params: params};
}



lib.baseQuery = function(columns, where, params, order, limit, callback){
    var query = '';

    params = params || [];

    columns = columns || ['*'];
    columns = columns.join(",");

    query = "SELECT " + columns + " FROM convio";
    query += " " + where;

    /*
    if(where && where instanceof Object){
        var w = makeWhereStatement(where);
        query += " " + w.where;
        params = w.params;
    }else if(where && where.length){
        query += " " + where;
    }
    */

    if(order && order.length){
        query += " ORDER BY " + order;
    }

    if(limit && limit.length){
        query += " LIMIT " + parseInt(limit, 10);
    }

    runQuery(query, params, function(err, data){

        if(err){
            return callback( err );
        }

        return callback( null, processResult('', data) );
    });

}


lib.findStuffForPark = function(filename, kind, restrictDate, callback){
    var where = "WHERE kind = 'park' AND attributes->'filename' = $1";

    //(columns, where, params, order, limit, callback)
    lib.baseQuery(["*"], where, [filename], '', '', function(err, parent){
        if(err){
            return callback( err );
        }
        if(parent.results.length){
            var m = moment().format('YYYY-MM-DD H:mm');

            var id = parent.results[0].attributes.id;
            var params;

            if(kind != "*"){
                where = "WHERE kind = $1 AND attributes->'relatedpark' = $2";
                params = [kind, id];
            }else{
                where = "WHERE kind != 'park' AND attributes->'relatedpark' = $1";
                params = [id]
            }

            lib.baseQuery(['*'], where, params, '', '', function(err, children){
                if(err){
                    return callback( err );
                }

                if(restrictDate){
                    children.results = filterEventsByDate(children.results, +new Date());
                    children.length = children.results.length;
                }

                var stuff = {
                    parent: parent.results[0],
                    children: children,
                }

                return callback( null, stuff );
            });

        }else{
            return callback( [] );
        }
    });
}

lib.baseGeoQuery = function(columns, where, params, order, limit, callback){
    var query = '';

    params = params || [];

    columns = columns || ['*'];
    columns = columns.join(",");

    query = "SELECT " + columns + " FROM park_units";
    query += " " + where;

    /*
    if(where && where instanceof Object){
        var w = makeWhereStatement(where);
        query += " " + w.where;
        params = w.params;
    }else if(where && where.length){
        query += " " + where;
    }
    */

    if(order && order.length){
        query += " ORDER BY " + order;
    }

    if(limit && limit.length){
        query += " LIMIT " + parseInt(limit, 10);
    }

    runQuery(query, params, function(err, data){

        if(err){
            return callback( err );
        }

        return callback( null, processResult('', data) );
    });

}
var filterEventsByDate = function(items, date){
    var results = [];

    items.forEach(function(item){
        if(item.kind && item.kind == 'event'){
            var endDate = (item.attributes.enddate) ? moment(item.attributes.enddate, 'YYYY-MM-DD H:mm').toDate() : null;
            if(endDate && (+endDate >= date)) results.push(item);

        }else{
            results.push(item);
        }
    });

    return results;
}


