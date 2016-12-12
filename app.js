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
    client.write(JSON.stringify({'question': question}));
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
        builder.Prompts.text(session, "Здравствуйте, что вы хотите узнать? Вы можете задать вопрос по трудовому кодексу РФ.");
    },
    function (session, results) {
        //TODO: pass question to Tolya's script and receive a result
        session.send("К сожалению, я не понял вас. Подождите немного, пока оператор лично ответит на ваш вопрос.");
        userAddress = session.message.address;
        askOperator(results.response);
        session.beginDialog('/waiting_chat');
    }
]);

bot.dialog('/answer_received', [
    function (session, args) {
        session.endDialog("Оператор ответил вам:\n%s", args.answer);
    }
]);

bot.dialog('/waiting_chat', [
    function (session) {
        if (waitingForAnswer)
            session.send("Оператор пока что не ответил, подождите немного.");
        else
            session.endDialog();
    },
    function (session) {
        session.replaceDialog('/waiting_chat');
    }
]);
