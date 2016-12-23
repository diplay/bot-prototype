var builder = require('botbuilder');
var net = require('net');
var restify = require('restify');
var process = require('process');

var isDebug = false;

function debug(msg) {
    if (isDebug)
        console.log("[Debug]", msg);
}

var useConsole = false;

for (var i = 1; i < process.argv.length; ++i)
    if (process.argv[i] == '--console')
        useConsole = true;

var socket = undefined;

var connector = useConsole ?
    new builder.ConsoleConnector().listen()
    : new builder.ChatConnector({
        appId: "",
        appPassword: ""
    });

var bot = new builder.UniversalBot(connector);

if (!useConsole) {
    var restifyServer = restify.createServer();
    restifyServer.listen(3979, function () {
        console.log("%s listening to %s", restifyServer.name, restifyServer.url);
    });
    restifyServer.post("/api/messages", connector.listen());
}

var userAddress = undefined;
var userName = "";

var answeringNow = false;
var questionsQueue = [];

bot.dialog('/getUserName', [
    function (session) {
        builder.Prompts.text(session, "Здравствуйте, как вас зовут?");
    },
    function (session, results) {
        userName = results.response;
        session.beginDialog('/waiting_question_chat');
    }
]);

bot.dialog('/waiting_question_chat', [
    function (session) {
        if (session.userData.firstWaitingTurn) {
            session.userData.firstWaitingTurn = false;
            builder.Prompts.text(session, "Здравствуйте, " + userName + ", вы зашли в систему как оператор. Вам будут приходить вопросы, на которые еще нет ответа в базе.");
        } else {
            builder.Prompts.text(session, "Вопросов пока что нет.");
        }
        userAddress = session.message.address;
    },
    function (session) {
        session.replaceDialog('/waiting_question_chat');
    }
]);

bot.dialog('/', [
    function (session) {
        session.userData.firstWaitingTurn = true;
        if (userName == "")
            session.beginDialog('/getUserName');
        else
            session.beginDialog('/waiting_question_chat');
    }
]);

bot.dialog('/question_received', [
    function (session, args) {
        answeringNow = true;
        session.userData.currentQuestion = args.question;
        builder.Prompts.text(session, "Пришел вопрос:\n" + args.question + "\nВаш ответ:");
    },
    function (session, results) {
        answeringNow = false;
        sendAnswer(session.userData.currentQuestion, results.response);
        session.send("Спасибо за ответ, %s! Система запомнит его.", userName);
        if (questionsQueue.length > 0)
            session.replaceDialog('/question_received', questionsQueue.shift());
        else
            session.replaceDialog('/waiting_question_chat');
    }
]);

setInterval(
    function () {
        if (!answeringNow && userAddress != undefined && questionsQueue.length > 0)
            bot.beginDialog(userAddress, '/question_received', questionsQueue.shift());
    },
    1000);

var client = net.Socket();

client.on('data', function(json) {
    var data = JSON.parse(json);
    debug("Get data: " + JSON.stringify(data));
    questionsQueue.push(data);
});

client.connect(3000, '127.0.0.1', function() {
    debug('Connected to server');
    client.write(JSON.stringify({'clientType': 'operator'}));
});

function sendAnswer(question, answer) {
    client.write(JSON.stringify({'answer': answer, 'question': question, 'ok': true}));
}
