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

var userAddress = undefined; //assume we have one user now

function askOperator(question) {
    client.write(JSON.stringify({'target': 'operator', 'question': question}));
}

function showAnswer(answer) {
    if (userAddress != undefined) {
        if (answer.ok == true) {
            if (answer.origin == 'operator')
                bot.beginDialog(userAddress, '/operator_answer_received', answer);
            else
                bot.beginDialog(userAddress, '/ai_answer_received', answer);
        } else {
            askOperator(answer.question);
            bot.beginDialog(userAddress, '/waiting_operator_chat');
        }
    }
}

function askAI(question) {
    client.write(JSON.stringify({'target': 'ai', 'question': question}));
}

bot.dialog('/', [
    function (session) {
        userAddress = session.message.address;
        if (!session.userData.alreadyHello) {
            session.userData.alreadyHello = true;
            builder.Prompts.text(session, "Здравствуйте, что вы хотите узнать? Вы можете задать вопрос по трудовому кодексу РФ.");
        } else {
            builder.Prompts.text(session, "Вы можете задать еще один вопрос по трудовому кодексу РФ.");
        }
    },
    function (session, results) {
        session.userData.waitingForAnswer = true;
        session.userData.firstWaitingTurn = true;
        session.beginDialog('/waiting_ai_chat');
        askAI(results.response);
    }
]);

bot.dialog('/ai_answer_received', [
    function (session, args) {
        session.userData.waitingForAnswer = false;
        session.send("Я так понял, что вы имели в виду:\n%s", args.question);
        session.send("Я нашел ответ на ваш вопрос:\n%s", args.answer);
        session.replaceDialog('/');
    }
]);

bot.dialog('/operator_answer_received', [
    function (session, args) {
        session.userData.waitingForAnswer = false;
        session.send("Оператор ответил вам:\n%s", args.answer);
        session.replaceDialog('/');
    }
]);

bot.dialog('/waiting_ai_chat', [
    function (session) {
        if (session.userData.waitingForAnswer)
            builder.Prompts.text(session, "Секундочку...");
        else
            session.replaceDialog('/');
    },
    function (session) {
        session.replaceDialog('/waiting_ai_chat');
    }
]);

bot.dialog('/waiting_operator_chat', [
    function (session) {
        if (session.userData.waitingForAnswer) {
            if (session.userData.firstWaitingTurn) {
                session.send("К сожалению, я не понял вас.");
                builder.Prompts.text(session, "Подождите немного, пока оператор лично ответит на ваш вопрос.");
            } else {
                builder.Prompts.text(session, "Оператор пока что не ответил, подождите немного.");
            }
        } else {
            session.endDialog();
        }
    },
    function (session) {
        session.userData.firstWaitingTurn = false;
        session.replaceDialog('/waiting_operator_chat');
    }
]);
