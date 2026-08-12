import json
import random
import requests
from dataclasses import dataclass, asdict
from datetime import date
from urllib.parse import quote
from lxml import html


@dataclass
class UrbanWord:
    word: str
    description: str
    example: str
    link: str
    last_used: str = ""

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

def write_state(words):
    with open('words.json', 'w') as f:
        json.dump(words, f, indent=2)

def is_word_eligible(w, today_date, threshold_days, current_today_word):
    w_name = w.get('word', '').lower()
    if w_name == current_today_word:
        return False

    last_used_str = w.get('last_used')
    if not last_used_str:
        return True

    try:
        last_used_date = date.fromisoformat(last_used_str)
        days_since_used = (today_date - last_used_date).days
        return days_since_used > threshold_days
    except ValueError:
        return True

def select_fallback(words):
    fallback_words = words.get('fallback_words', [])
    if not fallback_words:
        print("Warning: fallback_words list is empty.")
        return

    total_items = len(fallback_words)
    threshold_days = total_items / 2.0
    today_date = date.today()
    today_str = today_date.isoformat()
    current_today_word = words.get('today', {}).get('word', '').lower()

    eligible = [
        w for w in fallback_words
        if is_word_eligible(w, today_date, threshold_days, current_today_word)
    ]

    if eligible:
        selected = random.choice(eligible)
    else:
        # Fallback to non-today words sorted by least recently used
        non_today = [w for w in fallback_words if w.get('word', '').lower() != current_today_word]
        if not non_today:
            non_today = fallback_words

        def sort_key(w):
            lu = w.get('last_used')
            if not lu:
                return date.min
            try:
                return date.fromisoformat(lu)
            except ValueError:
                return date.min

        non_today.sort(key=sort_key)
        selected = non_today[0]

    selected['last_used'] = today_str
    words['today'] = selected
    write_state(words)
    print(f"Fallback selection picked: {selected['word']} (last_used: {today_str})")

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
        return []

    tree = html.fromstring(response.content)
    cards = tree.xpath("//div[contains(@class, 'definition')]")

    scraped_words = []
    seen_words = set()

    for card in cards:
        word_text = card.get("data-word", "")
        if not word_text:
            continue

        word_clean = word_text.strip().lower()

        if len(word_clean) == 5 and word_clean.isalpha() and word_clean not in seen_words:
            seen_words.add(word_clean)

            meaning_parts = card.xpath(".//div[contains(@class, 'meaning')]//text()")
            description = "".join(meaning_parts).strip()

            example_parts = card.xpath(".//div[contains(@class, 'example')]//text()")
            example = "".join(example_parts).strip()

            link = f"https://www.urbandictionary.com/define.php?term={quote(word_text)}"

            scraped_words.append(UrbanWord(
                word=word_clean,
                description=description,
                example=example,
                link=link
            ))

    return scraped_words

# Entry Point here
if __name__ == '__main__':
    current_words = get_words()
    today_str = date.today().isoformat()
    fallback_words = current_words.get('fallback_words', [])

    print("Scraping Urban Dictionary homepage...")
    scraped_words = scrape_urban_dictionary()
    print(f"Scraped {len(scraped_words)} 5-letter word(s) from homepage.")

    existing_words_map = {w.get('word', '').lower(): w for w in fallback_words}

    new_scraped_objects = []
    for sw in scraped_words:
        if sw.word.lower() not in existing_words_map:
            new_scraped_objects.append(sw)
        else:
            print(f"Skipping already added word: {sw.word}")

    if new_scraped_objects:
        for sw in new_scraped_objects:
            dict_word = obj_to_dict(sw)
            fallback_words.append(dict_word)
            existing_words_map[sw.word.lower()] = dict_word
            print(f"Added new word to fallback_words list: {sw.word}")

        chosen_today = obj_to_dict(new_scraped_objects[0])
        chosen_today['last_used'] = today_str

        existing_words_map[new_scraped_objects[0].word.lower()]['last_used'] = today_str

        current_words['today'] = chosen_today
        write_state(current_words)
        print(f"Set today's word to new scraped word: {chosen_today['word']}")
    else:
        print("No new 5-letter words found on the homepage today. Falling back to random selection.")
        select_fallback(current_words)