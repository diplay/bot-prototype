import logging

import numpy as np

from .semantics import canonize_words, semantic_association, bag_to_matrix, semantic_similarity_fast
from .utils import clear_line


def similar_questions_idx(query: str, qm, w2v_model, topn=5, use_associations=False) -> list:
    query_bag = canonize_words(query.split())
    if use_associations:
        query_bag += semantic_association(query_bag, w2v_model, topn=5)
        query_mx = bag_to_matrix(query_bag, w2v_model)
        similars = [(i, semantic_similarity_fast(query_mx, np.vstack((mx, qm['a_matrices'][i]))))
                    for i, mx in enumerate(qm['matrices']) if len(mx) > 0]
    else:
        query_mx = bag_to_matrix(query_bag, w2v_model)
        similars = [(i, semantic_similarity_fast(query_mx, mx))
                    for i, mx in enumerate(qm['matrices'])]
    similars.sort(key=lambda x: x[1], reverse=True)
    return similars[:topn]


def similar_questions(query: str, qm, w2v_model, topn=5, use_associations=False) -> list:
    query = clear_line(query)
    return [(qm['questions'][idx], sim)
            for idx, sim in similar_questions_idx(query, qm, w2v_model, topn, use_associations)]


def rate_question(question: str, qm: dict, w2v_model, nearest=20) -> float:
    similars = similar_questions_idx(question, qm, w2v_model, nearest)
    res_rate = 0.0
    sim_sum = 0.0
    for idx, sim in similars:
        rate = qm['rates'][idx]
        if sim > 0:
            res_rate += rate * sim
            sim_sum += sim
    if sim_sum > 0:
        return res_rate / sim_sum
    else:
        return 0.0


def print_questions_by_density(qm: dict):
    sd = qm['density']
    sa = qm['associations']
    lsd = list(enumerate(sd))
    lsd.sort(key=lambda x: x[1])
    for i in range(1, 10):
        logging.info(qm['questions'][lsd[-i][0]] + str(lsd[-i][1]))
        logging.info(qm['bags'][lsd[-i][0]])
        logging.info(str(sa[lsd[-i][0]]) + '\n')
    for i in range(0, 10):
        logging.info(qm['questions'][lsd[i][0]] + str(lsd[i][1]))
        logging.info(qm['bags'][lsd[i][0]])
        logging.info(str(sa[lsd[i][0]]) + '\n')
