import json
import random

with open('words.json', 'r') as f:
    d = json.load(f)

old_word = d.get('word')
while d.get('word') == old_word:
    d['word'] = random.choice(d.get('words'))

with open('words.json', 'w') as f:
    json.dump(d, f, indent=2)