from subprocess import Popen, PIPE, STDOUT
from dateparser.date import DateDataParser
from datetime import datetime, timedelta

import json
import logging
import os

ddp = DateDataParser(languages=['ru'], settings={
  'RELATIVE_BASE': datetime(1000, 1, 1, 0, 0)})

def get_seman_info_json(question):
  p = Popen([os.environ['RML'] + '/Bin/JsonSeman'], stdout=PIPE, stdin=PIPE, stderr=STDOUT)
  stdout = p.communicate(input=question.encode('cp1251'))[0]
  json_data = stdout.decode('cp1251')
  json_data = json_data[json_data.find('{'):]
  return json.loads(json_data)

def find_num_nodes_ids(sem_info):
  res = []
  nodes = sem_info['nodes']
  for node in nodes:
    if 'part' in node and node['part'].find(u'ЧИСЛ') != -1:
      res.append(node['num'])
  return res

def find_sem_prop_dep(node_ids, sem_info):
  res = []
  relations = sem_info['relations']
  for rel in relations:
    logging.error(rel)
    if ((rel['rnum'] in node_ids or rel['lnum'] in node_ids) and
       (rel['type'] == u'PROPERT' or rel['type'] == u'QUANTIT' or
        rel['type'] == u'PARAM')):
      res.append(rel)
  return res

def find_possible_deps(question):
  try:
    sem_info = get_seman_info_json(question)
    logging.error(sem_info)
    num_nodes_ids = find_num_nodes_ids(sem_info)
    if len(num_nodes_ids) == 0:
      return []
    return find_sem_prop_dep(num_nodes_ids, sem_info)

  except Exception as e:
    logging.error('Something goes wrong while finding dependency: {e}'.format(e=e))
    return []

def find_def_dependency(dep, sem_info):
  if dep['l'].isdigit():
    node = dep['rnum']
    num_node = dep['lnum']
  else:
    node = dep['lnum']
    num_node = dep['rnum']
  for rel in sem_info['relations']:
    if (rel['lnum'] == node and rel['rnum'] != num_node) or (rel['rnum'] == node and rel['lnum'] != num_node):
      return rel
  return {}

def yes_no_question_answ(yes, answer):
  if yes:
    if answer.lower().find('да') != -1:
      return 'Да'
    else:
      return answer.lower().replace('нет', 'Да')
  else:
    if answer.lower().find('нет') != -1:
      return 'Нет'
    else:
      return answer.lower().replace('да', 'Нет')

def get_val_from_rule(rule):
  if rule['value_type'] == 'num':
    return int(rule['value'])
  else :
    return datetime.strptime(rule['value'], '%Y-%m-%d %H:%M')

def get_val_from_dep(dep, value_type):
  if value_type == 'num':
    return int(dep['l']) if dep['l'].isdigit() else int(dep['r'])
  else:
    date_data = ddp.get_date_data(dep['l'] + u' ' + dep['r'])
    return date_data['date_obj']

def apply_less_rule(question, answer, rule):
  sem_info = get_seman_info_json(question)
  dep = find_def_dependency(rule['def_dependency'], sem_info)
  rule_val = get_val_from_rule(rule)
  dep_val = get_val_from_dep(dep, rule['value_type'])

  if rule['op'] == '>=':
    if rule['value_type'] == 'date' and rule_val.year < 1000:
      res = rule_val >= dep_val
    else:
      res = (rule_val <= dep_val)
  else:
    if rule['value_type'] == 'date' and rule_val.year < 1000:
      res = rule_val <= dep_val
    else:
      res = rule_val >= dep_val
  return yes_no_question_answ(res, answer)

def apply_rule(question, answer, rule):
  try:
    if rule['rule_type'] == 'less':
      return apply_less_rule(question, answer, rule)
    return answer
  except Exception as e:
    logging.error('Something goes wrong while applying rule: {e}'.format(e=e))
    return ''

def add_rule(rule, question):
  try:
    if rule['rule_type'] == 'static':
      return rule
    val = rule['value']
    if len(rule['value'].split()) > 1:
      date_data = ddp.get_date_data(val)
      if date_data['date_obj'] == None:
        return {'rule_type': 'unknown'}
      date = date_data['date_obj']
      value_type = 'date'
      value = date.strftime('%Y-%m-%d %H:%M')
      if date.year < 1000:
        value = '0'*(4 - len(str(date.year))) + value;
    elif val.isdigit():
      value_type = 'num'
      value = int(val)
    else:
      return {'rule_type': 'unknown'}
    rule['value_type'] = value_type
    rule['value'] = value
    def_dep = find_def_dependency(rule['dep'], get_seman_info_json(question))
    rule['def_dependency'] = def_dep
    return rule
  except Exception as e:
    logging.error('Something goes wrong while adding rule: {e}'.format(e=e))
    return {'rule_type': 'unknown'}