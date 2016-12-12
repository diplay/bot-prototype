var builder = require('botbuilder');
var net = require('net');

var isDebug = true;

function debug(msg) {
    if (isDebug)
        console.log("[Debug]", msg);
}

var socket = undefined;

var connector = new builder.ConsoleConnector().listen();
var bot = new builder.UniversalBot(connector);

var userAddress = undefined;
var userName;

var answeringNow = false;
var questionsQueue = [];

bot.dialog('/', [
    function (session) {
        builder.Prompts.text(session, "Здравствуйте, как вас зовут?");
    },
    function (session, results) {
        userName = results.response;
        userAddress = session.message.address;
        session.send("Здравствуйте, %s, вы зашли в систему как оператор. Вам будут приходить вопросы, на которые еще нет ответа в базе.", userName);
    }
]);

bot.dialog('/question_received', [
    function (session, args) {
        answeringNow = true;
        builder.Prompts.text(session, "Пришел вопрос:\n" + args.question + "\nВаш ответ:");
    },
    function (session, results) {
        //TODO: send answer to Tolya's script
        answeringNow = false;
        sendAnswer(results.response);
        session.endDialog("Спасибо за ответ, %s! Система запомнит его.", userName);
    }
]);

setInterval(
    function () {
        if (!answeringNow && userAddress != undefined && questionsQueue.length > 0)
            bot.beginDialog(userAddress, '/question_received', questionsQueue.shift());
    },
    1000);

var server = net.createServer(function(sock) {
    debug("Client connected");
    socket = sock;

    socket.on('end', function() {
        debug('Client disconnected');
    });

    socket.on('data', function(json) {
        var data = JSON.parse(json);
        debug("Get data: " + JSON.stringify(data));
        questionsQueue.push(data);
    });
});

server.listen(3000, function() {
  debug('Server bound');
});

function sendAnswer(answer) {
    socket.write(JSON.stringify({'answer': answer}));
}
