import argparse
import logging
import os
import sys

from config import config
from socket_server import start_server


def create_parser():
    m = argparse.ArgumentParser(description='Sentence\' similarity check %(prog)s',
                                epilog='Enjoy!', prog='SentSimCheck')

    m.add_argument('-c', '--config', type=str, required=True, help='Config file path')
    m.add_argument('--host', type=str, default='127.0.0.1', help='Socket host to listen on')
    m.add_argument('-p', '--port', type=int, default=12345, help='Socket port to listen on')
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
        config.load_config(options.config)
    except Exception as e:
        logging.error('Exception during config parsing: {e}'.format(e=e))

    start_server(options.host, options.port)


if __name__ == '__main__':
    main()
