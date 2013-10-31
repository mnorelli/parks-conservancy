"use strict";

var spawn = require("child_process").spawn;

var async = require("async"),
    d3 = require("d3"),
    jsdom = require("jsdom"),
    restify = require("restify"),
    parseWKT = require("wellknown");

var db = require("./db")();

var buildFeatureCollection = function(rows) {
    var features = rows.map(function(row) {
        return {
            type: "Feature",
            id: row.id,
            properties: row.properties,
            geometry: parseWKT(row.geom.split(";", 2)[1]) // EWKT includes SRID=4326;...
        };
    });

    return {
        type: "FeatureCollection",
        features: features
    };
};

var getTrip = function(id, callback) {
    var query = "SELECT id, properties, ST_AsEWKT(geom) geom FROM tnt_trips WHERE id=$1";

    return db.runQuery(query, [id], function(err, data) {
        if (err) {
            return callback(err);
        }

        if (data.rows.length === 0) {
            return callback();
        }

        return callback(null, buildFeatureCollection(data.rows));
    });
};

var render = require("./trip_elevation_profile");

var renderSVGtoPNG = function(svg, callback) {
    var convert = spawn("convert", [
        "-background", "none",
        "-",
        "png:-"
    ]);

    var stdout = [],
        stderr = [];

    convert.stdout.on("data", function(chunk) {
        stdout.push(chunk);
    });

    convert.stderr.on("data", function(chunk) {
        stderr.push(chunk);
    });

    convert.on("close", function(code) {
        if (code === 0) {
            return callback(null, Buffer.concat(stdout));
        }

        var err = new Error(Buffer.concat(stderr));
        err.code = code;

        return callback(err);
    });

    convert.stdin.write(svg);
    convert.stdin.end();
};

module.exports.getElevationProfileForTripAsPNG = function(req, res, next) {
    var tripId = +req.params.id;

    // TODO attempt to load the SVG from cache
    // write it if it had to be generated
    return async.waterfall([
        function(callback) {
            return getTrip(tripId, callback);
        },
        function(trip, callback) {
            return jsdom.env("<svg></svg>", ["../node_modules/d3/d3.min.js"], function(err, window) {
                return callback(err, window, trip);
            });
        },
        function(window, trip, callback) {
            return render(window, {
                // TODO should getTrip return a Feature or a FeatureCollection?
                trip: trip.features[0]
            }, function(err, node) {
                // check to see if this is a d3 selection, and if so get the DOM node
                if (node instanceof window.d3.selection) {
                    node = node.node();
                }

                return callback(err, window, node);
            });
        },
        function(window, node, callback) {
            // set the xmlns attribute on the root node
            node.setAttribute("xmlns", "http://www.w3.org/2000/svg");

            // write the XML declaration first
            var svg = '<?xml version="1.0" standalone="yes"?>';
            // then "serialize" using outerHTML
            svg += node.outerHTML;

            window.close();

            return callback(null, svg);
        },
        function(svg, callback) {
            return renderSVGtoPNG(svg, callback);
        }
    ], function(err, png) {
        if (err) {
            console.warn(err);
            return next(err);
        }

        res.setHeader("Content-Type", "image/png");
        return res.send(png);
    });
};

module.exports.getElevationProfileForTrip = function(req, res, next) {
    var tripId = +req.params.id;
    
    // TODO attempt to load the SVG from cache
    // write it if it had to be generated
    return async.waterfall([
        function(callback) {
            return getTrip(tripId, callback);
        },
        function(trip, callback) {
            return jsdom.env("<svg></svg>", ["../node_modules/d3/d3.min.js"], function(err, window) {
                return callback(err, window, trip);
            });
        },
        function(window, trip, callback) {
            return render(window, {
                // TODO should getTrip return a Feature or a FeatureCollection?
                trip: trip.features[0]
            }, function(err, node) {
                // check to see if this is a d3 selection, and if so get the DOM node
                if (node instanceof window.d3.selection) {
                    node = node.node();
                }

                return callback(err, window, node);
            });
        },
        function(window, node, callback) {
            // set the xmlns attribute on the root node
            node.setAttribute("xmlns", "http://www.w3.org/2000/svg");

            // write the XML declaration first
            var svg = '<?xml version="1.0" standalone="yes"?>';
            // then "serialize" using outerHTML
            svg += node.outerHTML;

            window.close();

            return callback(null, svg);
        }
    ], function(err, svg) {
        if (err) {
            console.warn(err);
            return next(err);
        }

        res.setHeader("Content-Type", "image/svg+xml");
        return res.send(svg);
    });
};

module.exports.getTrips = function(req, res, next) {
    var query = "SELECT id, properties, ST_AsEWKT(geom) geom FROM tnt_trips";

    return db.runQuery(query, null, function(err, data) {
        if (err) {
            return next(err);
        }

        if (data.rows.length === 0) {
            return res.send(404);
        }

        return res.json(buildFeatureCollection(data.rows));
    });
};

module.exports.getTripById = function(req, res, next) {
    var query = "SELECT id, properties, ST_AsEWKT(geom) geom FROM tnt_trips WHERE id=$1";

    return db.runQuery(query, [req.params[0]], function(err, data) {
        if (err) {
            return next(err);
        }

        if (data.rows.length === 0) {
            return res.send(404);
        }

        return res.json(buildFeatureCollection(data.rows));
    });
};
