# bot-prototype
minimal prototype of chatbot

Установить зависимости:
`npm install`

Запуск сервера:
`node server.js`

Запуск чата оператора (которому сыпятся неизвестные вопросы):
`node operator_app.js [--console]`

Запуск чата для пользователя:
`node app.js [--console]`

Из файла db.txt можно заполнить базу командой
`./retrain_model.sh CoreLogic/config.json db.txt CoreLogic/models/questions_model.json`

Пример конфига CoreLogic/config.json:
```
{
  "w2v_model": "/home/diplay/projects/chatbot/bot/CoreLogic/models/ruwikiruscorpora.model.bin.gz",
  "q_model": "/home/diplay/projects/chatbot/bot/CoreLogic/models/questions_model.json",
  "confidence_threshold": 0.2
}
```

И смотри в другие README в поддиректориях.
