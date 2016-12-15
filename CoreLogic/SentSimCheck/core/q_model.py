import json
import logging
from copy import deepcopy

from .semantics import canonize_words, semantic_association, semantic_density, bag_to_matrix
from .utils import clear_line


def read_data_model(file_name: str) -> dict:
    file = open(file_name, mode='r', encoding='utf-8')
    return json.load(file)


def write_data_model(file_name: str, data_model: dict):
    cleared_model = deepcopy(data_model)
    cleared_model.pop('matrices', None)
    cleared_model.pop('a_matrices', None)
    json_model = json.dumps(cleared_model, separators=(',', ':'), ensure_ascii=False)
    with open(file_name, mode='w', encoding='utf-8') as f:
        f.write(json_model)


def read_questions(file_name: str, remove_punctuation=False, strip=True) -> list:
    file = open(file_name, encoding='utf-8')
    questions = file.readlines()
    cleared_questions = []
    for line in questions:
        try:
            j_line = json.loads(line)['question']
        except:
            continue
        if remove_punctuation:
            cleared_questions.append(clear_line(j_line))
        elif strip:
            cleared_questions.append(j_line.strip())
        else:
            cleared_questions.append(j_line)
    return cleared_questions


def make_bags(texts: list) -> (list, dict):
    bags = []
    vocabulary = {}
    for txt in texts:
        txt = clear_line(txt)
        bag = []  # {}
        words = canonize_words(txt.split())
        for w in words:
            if w not in bag:
                bag.append(w)  # bag[w] = bag.get(w, 0) + 1
            vocabulary[w] = vocabulary.get(w, 0) + 1
        bags.append(bag)
    return bags, vocabulary


def empty_model() -> dict:
    return {'questions': [],
            'bags': [],
            'vocabulary': {},
            'density': [],
            'associations': [],
            'rates': []}


def generate_questions_model(data, w2v_model, with_semantics=True) -> dict:
    logging.info('Generating questions model...')
    if isinstance(data, str):
        questions = read_questions(data)
    elif isinstance(data, list):
        questions = data
    else:
        logging.error('Invalid input data for model training: %s' % data)
        return empty_model()
    logging.info('Questions count: %s' % len(questions))
    bags, voc = make_bags(questions)
    sa = []
    sd = []
    if with_semantics:
        logging.info('Adding semantics to model...')
        sd = [semantic_density(bag, w2v_model, unknown_coef=-0.001) for bag in bags]
        sa = [semantic_association(bag, w2v_model) for bag in bags]
    rates = [0.0 for _ in range(len(questions))]
    logging.info('Questions model created')
    return {'questions': questions,
            'bags': bags,
            'vocabulary': voc,
            'density': sd,
            'associations': sa,
            'rates': rates}


def append_model_to_model(head_model, tail_model, w2v_model):
    questions_len = len(tail_model['questions'])
    dens_len = len(tail_model['density'])
    assoc_len = len(tail_model['associations'])
    rates_len = len(tail_model['rates'])
    for w in tail_model['vocabulary'].keys():
        head_model['vocabulary'][w] = head_model['vocabulary'].get(w, 0) + tail_model['vocabulary'][w]
    for i in range(questions_len):
        if tail_model['bags'][i] not in head_model['bags']:
            head_model['questions'].append(tail_model['questions'][i])
            head_model['bags'].append(tail_model['bags'][i])
            if 'matrices' in head_model:
                head_model['matrices'].append(bag_to_matrix(tail_model['bags'][i], w2v_model))
            if dens_len == questions_len:
                head_model['density'].append(tail_model['density'][i])
            if assoc_len == questions_len:
                head_model['associations'].append(tail_model['associations'][i])
                if 'a_matrices' in head_model:
                    head_model['a_matrices'].append(bag_to_matrix(tail_model['associations'][i], w2v_model))
            if rates_len == questions_len:
                head_model['rates'].append(tail_model['rates'][i])
        else:
            logging.error('<!!!>\n' + tail_model['questions'][i])


def print_questions_model(qm):
    logging.info('questions: %s' % qm['questions'])
    logging.info('bags: %s' % qm['bags'])
    logging.info('vocabulary: %s' % qm['vocabulary'])
    logging.info('density: %s' % qm['density'])
    logging.info('associations: %s' % qm['associations'])
    logging.info('rates: %s' % qm['rates'])


def load_questions_model(file_name, w2v_model, vectorize=True):
    qmodel = read_data_model(file_name)
    logging.warning('Loading questions model...')
    if vectorize:
        logging.info('Vectorizing model...')
        qmodel['matrices'] = [bag_to_matrix(bag, w2v_model) for bag in qmodel['bags']]
        qmodel['a_matrices'] = [bag_to_matrix(bag, w2v_model) for bag in qmodel['associations']]
    logging.warning('Questions model (\'%s\') successfully loaded' % file_name)
    return qmodel


def save_questions_to_file(qm, file_name):
    f_out = open(file_name, mode='w', encoding='utf-8')
    for question in qm['questions']:
        f_out.write(question + '\n')
