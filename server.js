var net = require('net');
var mongodb = require('mongodb');

var isDebug = true;

function debug(msg) {
    if (isDebug)
        console.log("[Debug]", msg);
}

var userSocket = undefined, operatorSocket = undefined;
var scriptSocket = new net.Socket();

function tryConnect() {
    scriptSocket.connect(12345, '127.0.0.1', function() {
        debug('Connected to Tolya\'s script');
    });
}

scriptSocket.on('error', function(err) {
    debug(err);
    setTimeout(tryConnect, 3000);
});

scriptSocket.on('data', function(json) {
    debug('Data from script: ' + json);
    var data = JSON.parse(json);

    //userSocket.write(JSON.stringify({"question": data.question, "ok": false, "origin": "ai"}));
});

tryConnect();

function processUserQuery(json) {
    debug("Processing user query: " + json);
    var data = JSON.parse(json);
    if (data.target == 'operator') {
        if (operatorSocket != undefined)
            operatorSocket.write(json);
    } else if (data.target == 'ai') {
        scriptSocket.write(JSON.stringify({'action': 'get', 'input': data.question}));
        //tmp
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
