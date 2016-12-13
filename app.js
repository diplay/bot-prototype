var builder = require('botbuilder');
var net = require('net');

var isDebug = true;

function debug(msg) {
    if (isDebug)
        console.log("[Debug]", msg);
}

var client = new net.Socket();

client.connect(3000, '127.0.0.1', function() {
    debug('Connected to server');
    client.write(JSON.stringify({'clientType': 'user'}));
});

client.on('data', function (json) {
    var data = JSON.parse(json);
    debug("Get data: " + JSON.stringify(data));
    showAnswer(data);
});

var connector = new builder.ConsoleConnector().listen();
var bot = new builder.UniversalBot(connector);

var userAddress = undefined;
var waitingForAnswer = false;

function askOperator(question) {
    client.write(JSON.stringify({'target': 'operator', 'question': question}));
    waitingForAnswer = true;
}

function showAnswer(answer) {
    if (waitingForAnswer && userAddress != undefined) {
        waitingForAnswer = false;
        bot.beginDialog(userAddress, '/answer_received', answer);
    }
}

bot.dialog('/', [
    function (session) {
        if (!session.userData.alreadyHello) {
            session.userData.alreadyHello = true;
            builder.Prompts.text(session, "Здравствуйте, что вы хотите узнать? Вы можете задать вопрос по трудовому кодексу РФ.");
        } else {
            builder.Prompts.text(session, "Вы можете задать еще один вопрос по трудовому кодексу РФ.");
        }
    },
    function (session, results) {
        session.send("К сожалению, я не понял вас.");
        userAddress = session.message.address;
        askOperator(results.response);
        session.userData.firstWaitingTurn = true;
        session.beginDialog('/waiting_operator_chat');
    }
]);

bot.dialog('/answer_received', [
    function (session, args) {
        session.send("Оператор ответил вам:\n%s", args.answer);
        session.replaceDialog('/');
    }
]);

bot.dialog('/waiting_operator_chat', [
    function (session) {
        if (waitingForAnswer) {
            if (session.userData.firstWaitingTurn)
                builder.Prompts.text(session, "Подождите немного, пока оператор лично ответит на ваш вопрос.");
            else
                builder.Prompts.text(session, "Оператор пока что не ответил, подождите немного.");
        } else {
            session.endDialog();
        }
    },
    function (session) {
        session.userData.firstWaitingTurn = false;
        session.replaceDialog('/waiting_operator_chat');
    }
]);
