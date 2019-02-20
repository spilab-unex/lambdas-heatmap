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

const dynamoTableName = "umanexus-locations-hybrid";

const resolution = 4;

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
        frequency: location.frequency
    }
}

function buildHeatMap(locationsRegistries) {

    var locations = [];

    locationsRegistries.forEach((locationRegistration) => {
        locationRegistration.locations.forEach((location) => {
            locations.push(location);
        });
    });

    var hmm = new Map(); // HeatMapMatrix[latitude][longitude]

    locations.map(blurLocation).forEach((location) => {
        if (hmm.has(location.latitude)) {
            if (hmm.get(location.latitude).has(location.longitude)) {
                hmm.get(location.latitude).set(location.longitude,
                    hmm.get(location.latitude).get(location.longitude) + location.frequency);
            }
            else {
                hmm.get(location.latitude).set(location.longitude, location.frequency);
            }
        }
        else {
            hmm.set(location.latitude, new Map([
                [location.longitude, location.frequency]
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

function integrationResponse(statusCode, obj) {
    return {
        "statusCode": statusCode,
        "headers": { "Content-Type": "application/json" },
        "body": JSON.stringify(obj),
        "isBase64Encoded": false
    };

}

function deleteItems(items, callback) {

    items.forEach(function(item, i) {
        var deleteParams = {
            TableName: dynamoTableName,
            Key: { "id": item.id }
        };

        dynamo.deleteItem(deleteParams, function(err, data) {
            if (err) {
                log("err", "delete", err);
                callback(new Error(err));
            }
        });
    });
};

exports.handler = function(payload, context, callback) {


    var idRequester = payload.idRequester;

    log("dbg", "getHeatMap", payload);

    var heatmap = [];

    var scanParams = {};
    scanParams.TableName = dynamoTableName;
    scanParams.ExpressionAttributeValues = {
        ":idRequester": idRequester
    };
    scanParams.FilterExpression = "contains (idRequester, :idRequester)";

    dynamo.scan(scanParams, function(err, data) {

        if (err) {
            log("err", "getHeatMap-scan", err);
            callback(new Error(err));
        }
        else {
            var locationsRegistries = data.Items;
            log("dbg", "getHeatMap-locationsRegistries", locationsRegistries);

            heatmap = buildHeatMap(locationsRegistries);

            deleteItems(locationsRegistries,callback);

            log("dbg", "bgetHeatMap-heatmap", payload);
            callback(null,  heatmap);
        }
    });

};
