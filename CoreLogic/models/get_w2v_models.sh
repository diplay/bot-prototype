#!/usr/bin/env bash

# Trained on full Russian national corpus. Corpus size is 107 561 399 tokens. The model knows 281 776 different lemmas
# wget http://ling.go.mail.ru/static/models/ruscorpora.model.bin.gz -O ruscorpora.model.bin.gz # 302 Mb

# Russian national corpus + Russian Wiki. Corpus size is 280 187 401 tokens. The model knows 604 043 different lemmas
wget http://ling.go.mail.ru/static/models/ruwikiruscorpora.model.bin.gz -O ruwikiruscorpora.model.bin.gz # 1.1 Gb