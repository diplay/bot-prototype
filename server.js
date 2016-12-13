var net = require('net');
var mongodb = require('mongodb');

var isDebug = true;

function debug(msg) {
    if (isDebug)
        console.log("[Debug]", msg);
}

var userSocket = undefined, operatorSocket = undefined;

function processUserQuery(json) {
    var data = JSON.parse(json);
    debug("Processing user query: " + data);
    if (data.target == 'operator') {
        if (operatorSocket != undefined)
            operatorSocket.write(json);
    } else if (data.target == 'ai') {
        //TODO: pass question to script
        //for now assume we cannot find a question
        userSocket.write(JSON.stringify({"question": data.question, "ok": false, "origin": "ai"}));
    } else {
        debug("Shiiiet");
    }
}

function processOperatorQuery(data) {
    debug("Processing operator query: " + data);
    data.origin = "operator";
    if (userSocket != undefined)
        userSocket.write(data);
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
