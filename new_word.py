import json
import random
from dataclasses import dataclass, asdict


@dataclass
class UrbanWord:
    word: str
    description: str
    example: str
    link: str

def to_json(obj) -> str:
    return json.dumps(obj_to_dict(obj), ensure_ascii=False)

def obj_to_dict(obj):
    # Dataclass support
    if hasattr(obj, "__dataclass_fields__"):
        return asdict(obj)
    return {k: v for k, v in vars(obj).items() if not k.startswith("_")}

def get_words():
    with open('words.json', 'r') as f:
        return json.load(f)

def select_fallback(words):
    old_word = words.get('today')
    while words.get('today').get('word') == old_word.get('word'):
        words['today'] = random.choice(words.get('fallback_words'))
    write_state(words)

def write_state(words):
    with open('words.json', 'w') as f:
        json.dump(words, f, indent=2)

if __name__ == '__main__':
    current_words = get_words()
    select_fallback(current_words)