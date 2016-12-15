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
* `python3 main.py -c config.json -v DEBUG --train -t_in data/q_parsed.txt -t_out models/new_model.dat`

### Использование

* Запуск: `python3 main.py -c config.json -v DEBUG`
* Общение: `python3 -c "import json;print(json.dumps({'action':'get','input':'Как получить отпуск?'}))" | nc 127.0.0.1 12345`
* Обучение "на лету": `python3 -c "import json;print(json.dumps({'action':'train','input':'Когда приходит зарплата?'}))" | nc 127.0.0.1 12345`

