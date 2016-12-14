# Сервис для определения семантической близости предложений

### Установка

* Поддерживается только третий python!
* [Скачать модели Word2Vec](models/README.md)
* `pip3 install -r requirements.txt` *(Лучше в virtualenv)*
* `python3 main.py --config config.json`

> См. `python3 main.py -h`

### Обучение

* [Скачать модели Word2Vec](models/README.md)
* [Подготовить список предложений](data/README.md)
* `python core/q_model.py <path_to_questions> <path_to_w2v_model>`

### Использование

* Запуск: `python3 main.py -c config.json -v DEBUG`
* Общение: `python3 -c "import json;print(json.dumps({'action':'get','input':'Как получить отпуск?'}))" | nc 127.0.0.1 12345`

> Общение пока реализовано частично и будет полностью готово вместе со связью с БД