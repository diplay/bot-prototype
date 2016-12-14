import json
import logging

from SentSimCheck.core import semantics
import sys
from SentSimCheck.core.utils import clear_line


def read_data_model(file_name: str) -> dict:
    file = open(file_name, mode='r', encoding='utf-8')
    return json.load(file)


def write_data_model(file_name: str, data_model: dict):
    file = open(file_name, mode='w', encoding='utf-8')
    json.dump(data_model, file, separators=(',', ':'), ensure_ascii=False)


def read_questions(file_name: str, remove_punctuation=False) -> list:
    file = open(file_name, encoding='utf-8')
    questions = file.readlines()
    if remove_punctuation:
        cleared_questions = []
        for line in questions:
            cleared_questions.append(clear_line(line))
        return cleared_questions
    else:
        return questions


def make_bags(texts: list) -> (list, dict):
    bags = []
    vocabulary = {}
    for txt in texts:
        bag = []  # {}
        words = semantics.canonize_words(txt.split())
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


def generate_questions_model(file_name: str, w2v_model_file: str, with_semantics=True) -> dict:
    logging.info('Generating questions model...')
    questions = read_questions(file_name, remove_punctuation=True)
    logging.info('Questions count: %s' % len(questions))
    bags, voc = make_bags(questions)
    sa = []
    sd = []
    if with_semantics:
        w2v_model = semantics.load_w2v_model(w2v_model_file)
        logging.info('Adding semantics to model...')
        sd = [semantics.semantic_density(bag, w2v_model, unknown_coef=-0.001) for bag in bags]
        sa = [semantics.semantic_association(bag, w2v_model) for bag in bags]
    rates = [0.0 for _ in range(len(questions))]
    logging.info('Questions model created')
    return {'questions': questions,
            'bags': bags,
            'vocabulary': voc,
            'density': sd,
            'associations': sa,
            'rates': rates}


def append_model_to_model(head_model, tail_model):
    questions_len = dens_len = assoc_len = rates_len = 0
    for w in tail_model['vocabulary'].keys():
        head_model['vocabulary'][w] = head_model['vocabulary'].get(w, 0) + tail_model['vocabulary'][w]

        questions_len = len(tail_model['questions'])
        dens_len = len(tail_model['density'])
        assoc_len = len(tail_model['associations'])
        rates_len = len(tail_model['rates'])
    for i in range(questions_len):
        if tail_model['bags'][i] not in head_model['bags']:
            head_model['questions'].append(tail_model['questions'][i])
            head_model['bags'].append(tail_model['bags'][i])
            if dens_len == questions_len:
                head_model['density'].append(tail_model['density'][i])
            if assoc_len == questions_len:
                head_model['associations'].append(tail_model['associations'][i])
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
        qmodel['matrices'] = [semantics.bag_to_matrix(bag, w2v_model) for bag in qmodel['bags']]
        qmodel['a_matrices'] = [semantics.bag_to_matrix(bag, w2v_model) for bag in qmodel['associations']]
    logging.warning('Questions model (\'%s\') successfully loaded' % file_name)
    return qmodel


def save_questions_to_file(qm, file_name):
    f_out = open(file_name, mode='w', encoding='utf-8')
    for question in qm['questions']:
        f_out.write(question + '\n')


if __name__ == '__main__':
    logging.basicConfig(format='%(asctime)s : %(levelname)s : %(message)s', level=logging.INFO)
    if len(sys.argv) != 3:
        logging.error('Usage: python script.py <path_to_questions> <path_to_w2v_model>')
    logging.info('Generating questions model')
    qm = generate_questions_model('../data/q_parsed.txt', '../models/ruwikiruscorpora.model.bin.gz')
    qm_file = 'questions_model.dat'
    write_data_model(qm_file, qm)
    logging.info('Model was saved to file \'%s\'' % qm_file)
