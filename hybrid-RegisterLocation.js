const dbg = false;

function log(type, context, object) {
    if (type == "err")
        console.log("ERROR:" + context + ":\n " + JSON.stringify(object, null, 2));
    else if (type == "dbg" && dbg)
        console.log("DEBUG:" + context + ":\n " + JSON.stringify(object, null, 2));
}



const doc = require('dynamodb-doc');

const dynamo = new doc.DynamoDB();

const dynamoTableName = "umanexus-locations-hybrid";



exports.handler = function (payload,context, callback) {


    log("dbg", "registerLocations", payload);

    var locationsRegister = {
        id: Number(new Date()),
        idRequester: payload.idRequester,
        locations: payload.locations,
        timestamp: new Date().toISOString()
    };

    log("dbg", "registerLocation", locationsRegister);

    var returnData = {
        "statusCode": 200,
        "headers": {
            "Content-Type" : "application/json"
        },
        "body": locationsRegister
    };


    var putParams = {};
    putParams.TableName = dynamoTableName;
    putParams.Item = locationsRegister;



    dynamo.putItem(putParams, function(err, data) {
        if (err) {
            returnData.statusCode = 503;
            returnData.body = "Service Unavailable";
            callback(new Error(returnData.statusCode + " " + returnData.body), returnData);

         }
         else {
            callback(null, locationsRegister);

         }
    });



};
