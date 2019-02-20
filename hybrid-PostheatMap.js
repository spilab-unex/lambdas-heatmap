'use strict';
var https = require('https');

const dbg = true;

function log(type, context, object) {
    if (type == "err")
        console.log("ERROR:" + context + ":\n " + JSON.stringify(object, null, 2));
    else if (type == "dbg" && dbg)
        console.log("DEBUG:" + context + ":\n " + JSON.stringify(object, null, 2));
}

exports.handler = function(payload, context, callback) {

    log("dbg", "postHeatMap", payload);

    var idRequester = payload.idRequester;
    var topic = payload.topic;
    var period = payload.period;
    var area = payload.area;



    var data='{"to": "'+topic+'","data":{"requestLocation":{"idRequester": "'+idRequester+'", "beginDate":"'+period.from+'", "endDate": "'+period.to+'", "latitude": '+area.center.latitude+', "longitude": '+area.center.longitude+', "radius": '+area.radius+' }}}';

    var json = JSON.parse(data);
    var final= JSON.stringify(json);



    var options = {
        hostname: 'fcm.googleapis.com',
        path: '/fcm/send',
        method: 'POST',
        headers: {
          "Authorization": "key=AAAAPDQm3PA:APA91bEUSZ2Ezg47cBt0J7pCnvZY480b55jUHaJgPCkOF6xD8OO1wFY_jxaWQLQT6uPEz-oQzRGF4LwE7SgsTgD5n2eOFVdLbfG2XX6s3iGdV4PrUmwuWyjYU87Jm37rZAYSL5HnRdrM",
          'Content-Type': 'application/json'
        }
    };

    log("dbg", "postHeatMap-options", options);


    var req = https.request(options, function(res) {
        log("dbg", "postHeatMap-res-statusCode", res.statusCode);
        log("dbg", "postHeatMap-res-Headers", JSON.stringify(res.headers));
        res.setEncoding('utf8');
         res.on('data', function(responseBody) {
             log("dbg", "postHeatMap-res-responseBody", responseBody);
             var response = JSON.parse(responseBody);
             log("dbg", "postHeatMap-res-response", response);
             callback(null, response);
         });
    });

    req.on('error', function(err) {
        log("err", "postHeatMap", err);
        callback(new Error(err));
    });


     req.write(final);
    req.end();


};
