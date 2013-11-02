"use strict";

var fs = require("fs"),
    path = require("path"),
    spawn = require("child_process").spawn,
    qs = require("querystring");

var async = require("async"),
    jsdom = require("jsdom"),
    parseWKT = require("wellknown");

var db = require("./db")();

var defaultImageSize =  [750, 150],
    imageSizes = {
        big:            [800, 200],
        small:          [300, 60],
        tiny:           [150, 30],
        default:        defaultImageSize
    };

var buildFeatureCollection = function(rows) {
    var ascending = function(a, b) {
        return a - b;
    };

    var features = rows.map(function(row) {
        var geometry = parseWKT(row.geom.split(";").pop()); // EWKT includes SRID=4326;...

        if (!row.properties.heightRange) {
            var heights = geometry.coordinates.map(function(c) {
                return c[2];
            }).sort(ascending);

            row.properties.heightRange = [heights[0], heights[heights.length - 1]];
        }

        if (!row.properties.distanceRange) {
            var distances = geometry.coordinates.map(function(c) {
                return c[3];
            }).sort(ascending);

            row.properties.distanceRange = [distances[0], distances[distances.length - 1]];
        }

        return {
            type: "Feature",
            id: row.id,
            properties: row.properties,
            geometry: geometry
        };
    });

    var heights = features
        .map(function(f) {
            return f.properties.heightRange;
        })
        .reduce(function(a, b) {
            return a.concat(b);
        }, [])
        .sort(ascending);

    var distances = features
        .map(function(f) {
            return f.properties.distanceRange;
        })
        .reduce(function(a, b) {
            return a.concat(b);
        }, [])
        .sort(ascending);

    var properties = {
        heightRange: [heights[0], heights[heights.length - 1]],
        distanceRange: [distances[0], distances[distances.length - 1]]
    };

    return {
        type: "FeatureCollection",
        features: features,
        properties: properties
    };
};

var getTrip = function(id, callback) {
    var query = "SELECT id, properties, ST_AsEWKT(ST_Transform(geom, 4326)) geom FROM tnt_trips WHERE id=$1";

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

var renderElevationProfileAsSVG = function(options, callback) {
    // console.warn("rendering trip:", options);
    var tripId = options.trip;
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
                trip: trip.features[0],
                width: options.width,
                height: options.height
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
    ], callback);
};

var convertSVGtoPNG = function(svg, callback) {
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
    var tripId = +req.params.id,
        params = getImageParams({trip: tripId}, req),
        filename = getImageFilename(tripId, params),
        cachedFile = path.join(process.env.TMPDIR || "/tmp", filename + ".png");

    return async.waterfall([
        function(callback) {
            return fs.readFile(cachedFile, function(err, data) {
                if (err) {
                    return renderElevationProfileAsSVG(params, function(err, svg) {
                        if (err) {
                            return callback(err);
                        }

                        return convertSVGtoPNG(svg, function(err, png) {
                            if (err) {
                                return callback(err);
                            }

                            return fs.writeFile(cachedFile, png, function(err) {
                                return callback(err, png);
                            });
                        });
                    });
                }

                return callback(null, data);
            });
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
    var tripId = +req.params.id,
        params = getImageParams({trip: tripId}, req),
        filename = getImageFilename(tripId, params),
        cachedFile = path.join(process.env.TMPDIR || "/tmp", filename + ".svg");

    return async.waterfall([
        function(callback) {
            return fs.readFile(cachedFile, function(err, data) {
                if (err) {
                    return renderElevationProfileAsSVG(params, function(err, svg) {
                        if (err) {
                            return callback(err);
                        }

                        return fs.writeFile(cachedFile, svg, function(err) {
                            return callback(err, svg);
                        });
                    });
                }

                return callback(null, data);
            });
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
    var options = qs.parse(req.query());

    var query = "SELECT id, properties, ST_AsEWKT(ST_Transform(geom, 4326)) geom FROM tnt_trips";

    return db.runQuery(query, null, function(err, data) {
        if (err) {
            return next(err);
        }

        if (data.rows.length === 0) {
            return res.send(404);
        }

        var collection = buildFeatureCollection(data.rows);

        if (options.minimal) {
            collection.features.forEach(function(f) {
                delete f.geometry;
            });
        }

        if (options.trailhead) {
            // TODO after upgrading to pg 9.3, move this into the database
            // query
            collection.features = collection.features.filter(function(f) {
                return f.properties.starting_trailhead_id === +options.trailhead ||
                       f.properties.ending_trailhead_id === +options.trailhead;
            });
        }

        return res.json(collection);
    });
};

module.exports.getTripById = function(req, res, next) {
    var options = qs.parse(req.query());

    return getTrip(req.params[0], function(err, collection) {
        if (err) {
            return next(err);
        }

        if (options.minimal) {
            collection.features.forEach(function(f) {
                delete f.geometry;
            });
        }

        return res.json(collection);
    });
};

function getImageParams(params, req) {
    var query = qs.parse(req.query()),
        width,
        height;
    if (imageSizes.hasOwnProperty(query.size)) {
        var size = imageSizes[query.size];
        params.width = size[0];
        params.height = size[1];
    // TODO kill this clause to prevent DDOS attacks that start our server
    // rendering an infinite combination of image sizes
    } else if (query.width && query.height) {
        params.width = +query.width;
        params.height = +query.height;
    } else {
        params.width = defaultImageSize[0];
        params.height = defaultImageSize[1];
    }
    // console.warn("params:", params, query);
    return params;
}

function getImageFilename(key, params) {
    return (params.width && params.height)
        ? [key, "@", params.width, "x", params.height].join("")
        : key;
}