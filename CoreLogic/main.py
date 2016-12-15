import argparse
import logging
import os
import sys

from SentSimCheck.core.q_model import generate_questions_model, write_data_model
from SentSimCheck.helpers.config import config
from SentSimCheck.helpers.socket_server import start_server


def create_parser():
    m = argparse.ArgumentParser(description='Sentence\' similarity check %(prog)s',
                                epilog='Enjoy!', prog='SentSimCheck')

    m.add_argument('-c', '--config', type=str, required=True, help='Config file path')
    m.add_argument('--host', type=str, default='127.0.0.1', help='Socket host to listen on')
    m.add_argument('-p', '--port', type=int, default=12345, help='Socket port to listen on')
    m.add_argument('-t', '--train', action='store_true', help='Train new model')
    m.add_argument('-t_in', '--train_input', type=str, help='Input questions for model training')
    m.add_argument('-t_out', '--train_output', type=str, help='File to save trained model')
    m.add_argument('-l', '--log', type=str, default=None, help='Log file path')
    m.add_argument('-v', '--verbose', choices=['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'], default='WARNING',
                   help="Set logging level")
    return m


def setup_logger(verbosity_level, log_file=None):
    root = logging.getLogger()
    root.handlers = []
    root.setLevel(verbosity_level)

    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')

    ch = logging.StreamHandler(sys.stdout)
    ch.setLevel(verbosity_level)
    ch.setFormatter(formatter)
    root.addHandler(ch)

    if log_file:
        fh = logging.FileHandler(log_file)
        fh.setLevel(verbosity_level)
        fh.setFormatter(formatter)
        root.addHandler(fh)


def main():
    m = create_parser()
    options = m.parse_args()
    setup_logger(options.verbose, log_file=options.log)

    if not os.path.isfile(options.config):
        logging.error('Specified config file (%s) could not be found!' % options.config)
        return 1

    try:
        config.load_config(options.config, with_model=not options.train)
    except Exception as e:
        logging.error('Exception during config parsing: {e}'.format(e=e))
        return 1

    if options.train:
        if not options.train_input or not options.train_output:
            logging.error('Params \'train_input\' and \'train_output\' are required in the training mode!')
            return 1
        logging.warning('Model training started ...')
        qm = generate_questions_model(options.train_input, config.w2v)
        logging.warning('Saving model to file (%s)' % options.train_output)
        write_data_model(options.train_output, qm)
    else:
        start_server(options.host, options.port)


if __name__ == '__main__':
    main()
