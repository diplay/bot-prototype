import json

from SentSimCheck.core import semantics, q_model


def singleton(class_):
    instances = {}

    def getinstance(*args, **kwargs):
        if class_ not in instances:
            instances[class_] = class_(*args, **kwargs)
        return instances[class_]

    return getinstance


@singleton
class Settings:
    def __init__(self):
        self.config_file_path = None
        self.CONF = None
        self.w2v = None
        self.q_model = None
        self.confidence_threshold = 0.2

    def load_config(self, config_path, with_model=True):
        self.config_file_path = config_path
        with open(config_path) as f:
            self.CONF = json.loads(f.read())
        self.w2v = semantics.load_w2v_model(self.CONF['w2v_model'])
        self.w2v.init_sims()
        if with_model:
            self.q_model = q_model.load_questions_model(self.CONF['q_model'], self.w2v, vectorize=True)
        self.confidence_threshold = self.CONF.get('confidence_threshold', 0.2)


config = Settings()
