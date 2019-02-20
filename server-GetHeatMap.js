'use strict';

const dbg = true;

function log(type, context, object) {
    if (type == "err")
        console.log("ERROR:" + context + ":\n " + JSON.stringify(object, null, 2));
    else if (type == "dbg" && dbg)
        console.log("DEBUG:" + context + ":\n " + JSON.stringify(object, null, 2));
}

const doc = require('dynamodb-doc');

const dynamo = new doc.DynamoDB();

const dynamoTableName = "umanexus-server-centric";

const resolution = 4;
const EarthRadius = 6371000; // m

function blur(n, digits) {

    if (!digits)
        digits = resolution;

    var roundFunction = Math.floor;

    if (n < 0)
        roundFunction = Math.ceil;


    return roundFunction(n * Math.pow(10, digits)) / Math.pow(10, digits);

}


function blurLocation(location) {
    return {
        latitude: blur(location.latitude),
        longitude: blur(location.longitude),
        timestamp: location.timestamp
    }
}

function toRadians(n) {
    return n * (Math.PI / 180.0);
}

function toDegrees(n) {
    return n * (180.0 / Math.PI);
}

function calculateDerivedPosition(location, radius, bearing) {

    log("dbg", "derived-location", location);
    log("dbg", "derived-radius", radius);
    log("dbg", "derived-bearing", bearing);

    var latA = toRadians(location.latitude);
    var lonA = toRadians(location.longitude);

    log("dbg", "derived-latA", latA);
    log("dbg", "derived-lonA", lonA);

    var angularDistance = radius / EarthRadius;
    var trueCourse = toRadians(bearing);

    log("dbg", "derived-angDist", angularDistance);
    log("dbg", "derived-true-C", trueCourse);


    var lat = Math.asin(
        Math.sin(latA) * Math.cos(angularDistance) +
        Math.cos(latA) * Math.sin(angularDistance) *
        Math.cos(trueCourse));

    log("dbg", "derived-lat", lat);


    var dlon = Math.atan2(
        Math.sin(trueCourse) * Math.sin(angularDistance) *
        Math.cos(latA),
        Math.cos(angularDistance) - Math.sin(latA) * Math.sin(lat));

    log("dbg", "derived-dlon", dlon);


    var lon = ((lonA + dlon + Math.PI) % (Math.PI * 2)) - Math.PI;

    log("dbg", "derived-lon", lon);


    lat = toDegrees(lat);
    lon = toDegrees(lon);

    log("dbg", "derived-latDf", lat);
    log("dbg", "derived-lonDg", lon);


    return {
        latitude: lat,
        longitude: lon
    };
}

function buildHeatMap(area, period, locations) {


    var north = calculateDerivedPosition(area.center, area.radius, 0);
    var east = calculateDerivedPosition(area.center, area.radius, 90);
    var south = calculateDerivedPosition(area.center, area.radius, 180);
    var west = calculateDerivedPosition(area.center, area.radius, 270);

    log("dbg", "buildHeatMap-north", north);
    log("dbg", "buildHeatMap-east", east);
    log("dbg", "buildHeatMap-south", south);
    log("dbg", "buildHeatMap-west", west);


    // filter by area
    var filteredlocations = locations.filter((location) => {
        return (location.latitude > south.latitude && location.latitude < north.latitude &&
            location.longitude > west.longitude && location.longitude < east.longitude);
    });


    // filter by time
    filteredlocations = filteredlocations.filter((location) => {
        return ((new Date(period.from).getTime() < new Date(location.timestamp).getTime()) &&
            (new Date(location.timestamp).getTime() < new Date(period.to).getTime()));
    });


    var hmm = new Map(); // HeatMapMatrix[latitude][longitude]

    filteredlocations.map(blurLocation).forEach((location) => {
        if (hmm.has(location.latitude)) {
            if (hmm.get(location.latitude).has(location.longitude)) {
                hmm.get(location.latitude).set(location.longitude,
                    hmm.get(location.latitude).get(location.longitude) + 1);
            }
            else {
                hmm.get(location.latitude).set(location.longitude, 1);
            }
        }
        else {
            hmm.set(location.latitude, new Map([
                [location.longitude, 1]
            ]));
        }
    });


    var heatmap = [];

    hmm.forEach((latitudeMap, latitude) => {
        latitudeMap.forEach((frequency, longitude) => {
            heatmap.push({
                "frequency": frequency,
                "latitude": latitude,
                "longitude": longitude
            });
        });
    });


    return heatmap;
}

exports.handler = function(payload, context, callback) {


    log("dbg", "getHeatMap", payload);

    var period = {};
    var area = {};
    var heatmap = [];



    period = {
        from: payload.periodfrom,
        to: payload.periodto

    }


    area = {
        center: {

            latitude: Number(payload.areacenterlatitude),
            longitude: Number(payload.areacenterlongitude)
        },

        radius: Number(payload.arearadius)
    }


    log("dbg", "getHeatMap-period", period);
    log("dbg", "getHeatMap-area", area);


    var scanParams = {};
    scanParams.TableName = dynamoTableName;

    log("dbg", "dynamo scan set up ", scanParams);

    dynamo.scan(scanParams, function(err, data) {

        log("dbg", "dynamo scan");

        if (err) {
            log("err", "getHeatMap-scan", err);
            callback(new Error(err));
        }
        else {
            log("dbg", "dynamo data: ",data);
            log("dbg", "dynamo data items: ",data.items);
            var locations = data.Items;
            log("dbg", "getHeatMap-locations", locations);

            heatmap = buildHeatMap(area, period, locations);

            log("dbg", "bgetHeatMap-heatmap", payload);
            callback(null, heatmap);
        }
    });
};
