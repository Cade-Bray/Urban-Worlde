# 🏙️ Urban Wordle

A Wordle-style 5-letter word game powered by Urban Dictionary slang, acronyms, and internet culture.

![Urban Wordle Header](favicon.ico)

---

## 🎮 How to Play

1. Guess the **5-letter slang word or acronym** in 6 tries or less.
2. Each guess must be a valid slang word from our dictionary or a standard 5-letter English word.
3. After each guess, tiles change color to show how close your guess was:
   - 🟩 **Green**: Letter is in the word and in the correct spot.
   - 🟨 **Yellow**: Letter is in the word but in the wrong spot.
   - ⬛ **Gray**: Letter is not in the secret word.
4. Solve the word to unlock its full Urban Dictionary definition, example sentence, and link!

---

## 🚀 Features

- **Slang-First Wordlist**: Daily words featuring viral slang, internet acronyms, and Urban Dictionary favorites (e.g., `based`, `bussy`, `hardo`, `thicc`, `finna`).
- **Real-Time Word Validation**:
  - Validates guesses against local Urban Dictionary slang.
  - Queries the [Free Dictionary API](https://api.dictionaryapi.dev/) for standard English 5-letter words with a 2-second timeout and spinner indicator.
  - In-memory caching for instant repeated guess lookups.
- **State Persistence**: Uses cookies to save your daily game progress and streak state.
- **Results Sharing**: Copy your score and emoji grid to the clipboard with one click to share on Discord, Twitter, or messages.
- **Automated Word Scraper (`new_word.py`)**: Python scraper that automatically extracts new 5-letter slang words from the Urban Dictionary homepage and updates `words.json`.

---

## 📂 Project Structure

```text
Urban-Worlde/
├── index.html        # Game UI markup & structure
├── script.js         # Game engine, guess scoring, API validation & state management
├── style.css         # Urban Dictionary visual design, responsive layout & animations
├── words.json        # Database of today's word and fallback slang definitions
├── new_word.py       # Python script for scraping Urban Dictionary & updating daily words
├── requirements.txt # Python dependencies (requests, lxml)
├── favicon.ico       # Site favicon
└── CNAME             # Custom domain configuration
```

---

## 🛠️ Local Development & Setup

### Web Game
Simply open `index.html` in your web browser or serve it using any HTTP server:

```bash
python3 -m http.server 8000
```
Then navigate to `http://localhost:8000`.

### Running the Python Scraper (`new_word.py`)

1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Run the word scraper script:
   ```bash
   python new_word.py
   ```
   This will attempt to scrape 5-letter words from the Urban Dictionary homepage and update `words.json`.

---

## 📜 License

Not affiliated with Urban Dictionary. Made for fun!
