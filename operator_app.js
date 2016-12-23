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
        session.userData.currentDependencies = args.dependencies;
        builder.Prompts.text(session, "Пришел вопрос:\n" + args.question + "\nВаш ответ:");
    },
    function (session, results) {
        if (session.userData.currentDependencies.length == 1) {
            session.userData.answer = results.response;
            session.replaceDialog('/add_question_rule', questionsQueue.shift());
        } else {
            answeringNow = false;
            sayThanks(session, session.userData.currentQuestion, results.response, {});
        }
    }
]);

bot.dialog('/add_question_rule', [
    function (session, args) {
        session.send('Cпасибо за ответ. Помогите, пожалуйста, улучшить систему.\n' +
            'Ответьте на несколько вопросов:');
        var deps = session.userData.currentDependencies;
        if (deps.length == 1) {
            builder.Prompts.text(session,'Влияют ли на положительность ответа следующие данные: "' +
                 deps[0].l + ' ' + deps[0].r + '"?');
        } else {
            builder.Prompts.text(session, 'Влияют ли введенные данные на ответ?');
        }
    },
    function (session, results) {
        var answer = results.response.toLowerCase();
        if (answer == 'да') {
            session.replaceDialog('/question_rule_type');
        } else if (answer == 'нет') {
            answeringNow = false;
            rule = {
                'rule_type': 'static'
            };
            sayThanks(session, session.userData.currentQuestion, session.userData.answer, rule);
        } else {
            debug('Shiiiet');
        }
    }
]);

bot.dialog('/question_rule_type', [
    function (session, args) {
        builder.Prompts.text(session,'Каким именно образом это влияет на ответ (выберите цифру)?\n' +
                     '1. Ответ зависит от того больше или меньше введенные данные какой-то величины\n' +
                     '2. Другое\n');
    },
    function (session, results) {
        if (results.response == '1') {
            session.userData.ruleType = 'less';
            session.replaceDialog('/question_cmp_op');
        } else if (results.response == '2') {
            answeringNow = false;
            rule = {
                'rule_type': 'unknown'
            };
            sayThanks(session, session.userData.currentQuestion, session.userData.answer, rule);
        } else {
            session.replaceDialog('/question_rule_type');
        }
    }
]);

bot.dialog('/question_cmp_op', [
    function (session, args) {
        builder.Prompts.text(session, 'Чтобы ответ был положительный данные в ответе должны быть больше или равны (>=) или ' +
                     'меньше или равны (<=) какой-то величины (введите >= или <=)?');
    },
    function (session, results) {
        if (results.response == '>=') {
            session.userData.op = '>=';
        } else if (results.response == '<=') {
            session.userData.op = '<=';
        } else {
            session.replaceDialog('/question_cmp_op')
        }
        session.replaceDialog('/question_cmp_val')
    }
]);

bot.dialog('/question_cmp_val', [
    function (session, args) {
        builder.Prompts.text(session, 'Введите, пожалуйста, значение меньше или больше которого должно быть значение' +
                     ', чтобы ответ был положительным.');
    },
    function (session, results) {
        answeringNow = false;
        rule = {
            'rule_type': 'less',
            'op': session.userData.op,
            'value': results.response,
            'dep': session.userData.currentDependencies[0]
        };
        sayThanks(session, session.userData.currentQuestion, session.userData.answer, rule);
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

function sendAnswer(question, answer, rule) {
    client.write(JSON.stringify({'answer': answer, 'question': question, 'rule': rule, 'ok': true}));
}

function sayThanks(session, currentQuestion, answer, rule) {
    sendAnswer(currentQuestion, answer, rule);
    session.send("Спасибо за ответ, %s! Система запомнит его.", userName);
    if (questionsQueue.length > 0)
        session.replaceDialog('/question_received', questionsQueue.shift());
    else
        session.replaceDialog('/waiting_question_chat');
}
