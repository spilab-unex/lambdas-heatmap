const dbg = false;

function log(type, context, object) {
    if (type == "err")
        console.log("ERROR:" + context + ":\n " + JSON.stringify(object, null, 2));
    else if (type == "dbg" && dbg)
        console.log("DEBUG:" + context + ":\n " + JSON.stringify(object, null, 2));
}


const doc = require('dynamodb-doc');

const dynamo = new doc.DynamoDB();

const dynamoTableName = "umanexus-server-centric";

exports.handler =  function (payload,context, callback) {

    log("dbg", "registerLocations", payload);

    var location = {
        id: Number(new Date()),
        latitude: payload.latitude,
        longitude: payload.longitude,
        timestamp: new Date().toISOString()
    };

    log("dbg", "registerLocation", location);

    var returnData = {
        "statusCode": 200,
        "headers": {
            "Content-Type" : "application/json"
        },
        "body": location
    };


    var putParams = {};
    putParams.TableName = dynamoTableName;
    putParams.Item = location;

    dynamo.putItem(putParams, function(err, data) {
        if (err) {
            returnData.statusCode = 503;
            returnData.body = "Service Unavailable";
            callback(new Error(returnData.statusCode + " " + returnData.body), returnData);
        }
        else {
            callback(null, location);
        }
    });

};
