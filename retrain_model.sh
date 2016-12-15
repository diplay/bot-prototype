#!/usr/bin/env bash
set -e

if [ "$#" -ne 3 ]; then
    echo "Illegal number of parameters"
    echo "Usage: ./retrain_model.sh <path_to_config> <path_to_questions> <model_save_to>"
    exit 1
fi

echo "----> Removing old collection ..."
mongo airobot --eval "db.questions.drop();"

echo "----> Trianing new model ..."
python3 CoreLogic/main.py -c "$1" -v DEBUG --train -t_in "$2" -t_out "$3"

echo "----> Uploading questions to DB ..."
mongoimport --db airobot --collection questions --file "$2"
