import json
import logging
import socket
import sys
import traceback
from pprint import pprint
from threading import Thread

from config import config
from core import q_analyzator as qa


def process_input(input_string):
    try:
        cmd = json.loads(input_string)
    except Exception as e:
        logging.error('Could not parse json input: {e}'.format(e=e))
        return json.dumps({'success': False, 'result': 'Invalid JSON input'})
    if 'action' not in cmd or 'input' not in cmd:
        logging.error('Missing required JSON fields')
        return json.dumps({'success': False, 'result': 'Missing required JSON fields: \'action\' or \'input\''})
    similar_questions = qa.similar_questions(cmd['input'], config.q_model, config.w2v, topn=3, use_associations=True)
    result = {'success': True, 'result': {'question': cmd['input'],
                                          'similar_questions': [{'question': item[0], 'probability': item[1]} for item
                                                                in similar_questions]}}
    pprint(similar_questions)
    return json.dumps(result)


def client_thread(conn, ip, port, MAX_BUFFER_SIZE=4096):
    input_from_client_bytes = conn.recv(MAX_BUFFER_SIZE)

    siz = sys.getsizeof(input_from_client_bytes)
    if siz >= MAX_BUFFER_SIZE:
        logging.warning('The length of input is probably too long: {}'.format(siz))

    input_from_client = input_from_client_bytes.decode('utf8').rstrip()

    res = process_input(input_from_client)
    logging.debug('Result of processing {} is: {}'.format(input_from_client, res))

    vysl = res.encode('utf8')
    conn.sendall(vysl)
    conn.close()
    logging.debug('Connection ' + ip + ':' + port + ' ended')


def start_server(host, port):
    soc = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    soc.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    logging.debug('Socket created')

    try:
        soc.bind((host, port))
        logging.debug('Socket bind complete')
    except socket.error as msg:
        logging.error('Bind failed. Error : ' + str(sys.exc_info()))
        sys.exit()

    soc.listen(10)
    logging.debug('Socket now listening')

    while True:
        conn, addr = soc.accept()
        ip, port = str(addr[0]), str(addr[1])
        logging.debug('Accepting connection from ' + ip + ':' + port)
        try:
            Thread(target=client_thread, args=(conn, ip, port)).start()
        except Exception as e:
            logging.error('Exception during request handling: {e}'.format(e=e))
            traceback.print_exc()
    soc.close()
