import json
import random
import requests
from dataclasses import dataclass, asdict
from lxml import html


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

def scrape_urban_dictionary():
    url = 'https://www.urbandictionary.com/'

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }

    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"Failed to fetch Urban Dictionary: {e}")
        return None

    tree = html.fromstring(response.content)

    # Target the main definition cards using the exact class
    cards = tree.xpath("//div[contains(@class, 'definition')]")

    for card in cards:
        # Pull the word directly from the data attribute on the container
        word_text = card.get("data-word", "")

        if len(word_text) == 5 and word_text.isalpha():

            # Extract description using the specific class
            meaning_parts = card.xpath(".//div[contains(@class, 'meaning')]//text()")
            description = "".join(meaning_parts).strip()

            # Extract example using the specific class
            example_parts = card.xpath(".//div[contains(@class, 'example')]//text()")
            example = "".join(example_parts).strip()

            # Construct the link manually for maximum reliability
            link = f"https://www.urbandictionary.com/define.php?term={word_text}"

            return UrbanWord(
                word=word_text.lower(),
                description=description,
                example=example,
                link=link
            )

    return None

if __name__ == '__main__':
    current_words = get_words()

    print("Scraping Urban Dictionary homepage...")
    scraped_word_obj = scrape_urban_dictionary()

    if scraped_word_obj:
        new_word_dict = obj_to_dict(scraped_word_obj)
        print(f"Found a 5-letter word: {new_word_dict['word']}")

        current_words['today'] = new_word_dict

        existing_words = [w.get('word') for w in current_words.get('fallback_words', [])]
        if new_word_dict['word'] not in existing_words:
            current_words['fallback_words'].append(new_word_dict)
            print("Added new word to fallback_words list.")

        write_state(current_words)
    else:
        print("No 5-letter words found on the homepage today.")
        select_fallback(current_words)