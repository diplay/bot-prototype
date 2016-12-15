var net = require('net');

var MongoClient = require('mongodb').MongoClient
  , assert = require('assert');

var db = undefined;

MongoClient.connect('mongodb://localhost:27017/airobot', function(err, _db) {
    assert.equal(null, err);
    debug("Connected successfully to server");
    db = _db;
});

var isDebug = true;

function debug(msg) {
    if (isDebug)
        console.log("[Debug]", msg);
}

var userSocket = undefined, operatorSocket = undefined;
var scriptSocket = new net.Socket();
var queueToSendToScript = [];

function tryConnect() {
    scriptSocket.connect(12345, '127.0.0.1', function() {
        debug('Connected to Tolya\'s script');
        sendDataToScript();
    });
}

function sendDataToScript() {
    //KOSTIL, because Tolya's script closes connection after each request
    if (queueToSendToScript.length > 0)
        scriptSocket.write(queueToSendToScript[0]);
}

function processAnswerFromScript(json) {
    debug('Data from script: ' + json);
    var data = JSON.parse(json);

    if (data.context.action == "train") {
        db.collection('questions')
            .insert({'question': data.result, 'answer': data.context.answer}, function (err) {
                debug(err);
        });
    } else {
        var nearestQuestion = data.result['similar_questions'][0].question;
        var p = data.result['similar_questions'][0].probability;
        if (p < 0.2) {
            debug("Cannot find question with ai");
            userSocket.write(JSON.stringify({"question": data.result.question, "ok": false, "origin": "ai"}));
        } else {
            debug("looking for question in db: " + nearestQuestion);

            db.collection('questions')
                .find({'question': nearestQuestion})
                .toArray(function (err, docs) {
                    debug(docs)
                    if (docs.length > 0) {
                        debug("Found answer in db: " + docs[0].answer);
                        userSocket.write(JSON.stringify(
                            {
                                "question": nearestQuestion,
                                "original_question": data.result.question,
                                'answer': docs[0].answer,
                                "ok": data.success,
                                "origin": "ai"
                            }
                        ));
                    } else {
                        userSocket.write(JSON.stringify({"question": data.result.question, "ok": false, "origin": "ai"}));
                    }
                });
        }
    }
}

scriptSocket.on('error', function(err) {
    debug(err);
    setTimeout(tryConnect, 1000);
});

scriptSocket.on('data', function(json) {
    queueToSendToScript.shift();
    processAnswerFromScript(json);
});

tryConnect();

function processUserQuery(json) {
    debug("Processing user query: " + json);
    var data = JSON.parse(json);
    if (data.target == 'operator') {
        if (operatorSocket != undefined)
            operatorSocket.write(json);
    } else if (data.target == 'ai') {
        queueToSendToScript.push(JSON.stringify({'action': 'get', 'input': data.question}));
        sendDataToScript();
    } else {
        debug("Shiiiet");
    }
}

function processOperatorQuery(json) {
    debug("Processing operator query: " + json);
    data = JSON.parse(json);
    data.origin = "operator";
    if (scriptSocket != undefined) {
        queueToSendToScript.push(JSON.stringify(
            {
                'action': 'train',
                'input': data.question,
                'context': {
                    'action': 'train',
                    'answer': data.answer
                }
            }));
        sendDataToScript();
    }
    if (userSocket != undefined)
        userSocket.write(JSON.stringify(data));
}

var server = net.createServer(function(socket) {
    debug("Client connected");

    socket.on('end', function() {
        debug('Client disconnected');
        if (socket == operatorSocket)
            operatorSocket = undefined;
        else if (socket == userSocket)
            userSocket = undefined;
    });

    socket.on('data', function(json) {
        var data = JSON.parse(json);
        debug("Get data: " + JSON.stringify(data));
        if (data.clientType == "user")
        {
            debug("User client connected")
            userSocket = socket;
            socket._events.data = processUserQuery;
        }
        else if (data.clientType == "operator")
        {
            debug("Operator client connected")
            operatorSocket = socket;
            socket._events.data = processOperatorQuery;
        }
        else
        {
            debug("Strange client " + toString(data.clientType));
        }
    });
});

server.listen(3000, function() {
  debug('Server bound on port 3000');
});
