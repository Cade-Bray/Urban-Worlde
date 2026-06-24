// ─────────────────────────────────────────────
//  CONFIGURATION
// ─────────────────────────────────────────────
const WORDS_JSON_URL = 'https://raw.githubusercontent.com/Cade-Bray/Urban-Worlde/refs/heads/master/words.json';
const MAX_GUESSES    = 6;
const WORD_LENGTH    = 5;
const COOKIE_WORD    = 'uw_word';
const COOKIE_STATE   = 'uw_state';

// ─────────────────────────────────────────────
//  COOKIE HELPERS
// ─────────────────────────────────────────────
function setCookie(name, value, days = 1) {
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(JSON.stringify(value))};expires=${d.toUTCString()};path=/`;
}

function getCookie(name) {
    const prefix = name + '=';
    const parts  = document.cookie.split(';');
    for (let part of parts) {
        let p = part.trim();
        if (p.startsWith(prefix)) {
            try { return JSON.parse(decodeURIComponent(p.substring(prefix.length))); }
            catch { return null; }
        }
    }
    return null;
}

function deleteCookie(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
}

// ─────────────────────────────────────────────
//  GAME STATE
// ─────────────────────────────────────────────
let secretWord   = '';
let wordList     = [];
let currentRow   = 0;
let currentCol   = 0;
let currentGuess = [];
let guesses      = [];   // array of completed guess strings
let gameOver     = false;

// ─────────────────────────────────────────────
//  FETCH + INIT
// ─────────────────────────────────────────────
async function fetchWords() {
    // Check if we already have a word stored in cookie for today
    const storedWord = getCookie(COOKIE_WORD);
    const storedState = getCookie(COOKIE_STATE);

    // If cookie word exists and matches today (we use a date key), restore it
    const todayKey = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

    if (storedWord && storedWord.date === todayKey) {
        secretWord = storedWord.word;
        wordList   = storedWord.words || [];
        if (storedState && storedState.date === todayKey) {
            restoreState(storedState);
        } else {
            initBoard();
        }
        return;
    }

    // Otherwise fetch fresh
    try {
        const res  = await fetch(WORDS_JSON_URL);
        const data = await res.json();

        secretWord = data.word.toLowerCase().trim();
        wordList   = (data.words || []).map(w => w.toLowerCase().trim());

        // Store in cookie (expires in 2 days)
        setCookie(COOKIE_WORD, { word: secretWord, words: wordList, date: todayKey }, 2);
        deleteCookie(COOKIE_STATE);  // fresh game

        initBoard();
    } catch (err) {
        console.error('Failed to load words:', err);
        document.getElementById('loading').textContent = '⚠️ Couldn\'t load today\'s word. Check the URL in the source.';
    }
}

// ─────────────────────────────────────────────
//  BOARD + KEYBOARD BUILD
// ─────────────────────────────────────────────
function initBoard() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';

    buildBoard();
    buildKeyboard();
    attachKeyListeners();
}

function buildBoard() {
    const board = document.getElementById('board');
    board.innerHTML = '';
    for (let r = 0; r < MAX_GUESSES; r++) {
        const row = document.createElement('div');
        row.className = 'row';
        row.id = `row-${r}`;
        for (let c = 0; c < WORD_LENGTH; c++) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.id = `tile-${r}-${c}`;
            row.appendChild(tile);
        }
        board.appendChild(row);
    }
}

const KEYBOARD_ROWS = [
    ['q','w','e','r','t','y','u','i','o','p'],
    ['a','s','d','f','g','h','j','k','l'],
    ['Enter','z','x','c','v','b','n','m','⌫']
];

function buildKeyboard() {
    const kb = document.getElementById('keyboard');
    kb.innerHTML = '';
    for (const row of KEYBOARD_ROWS) {
        const kbRow = document.createElement('div');
        kbRow.className = 'kb-row';
        for (const k of row) {
            const btn = document.createElement('button');
            btn.className = 'key' + (k === 'Enter' || k === '⌫' ? ' wide' : '');
            btn.textContent = k;
            btn.dataset.key = k;
            btn.addEventListener('click', () => handleKey(k));
            kbRow.appendChild(btn);
        }
        kb.appendChild(kbRow);
    }
}

// ─────────────────────────────────────────────
//  RESTORE STATE FROM COOKIE
// ─────────────────────────────────────────────
function restoreState(state) {
    initBoard();
    guesses    = state.guesses || [];
    gameOver   = state.gameOver || false;

    // Replay all past guesses visually (instant, no animation)
    for (let r = 0; r < guesses.length; r++) {
        const guess = guesses[r];
        const result = scoreGuess(guess, secretWord);
        for (let c = 0; c < WORD_LENGTH; c++) {
            const tile = getTile(r, c);
            tile.textContent = guess[c].toUpperCase();
            tile.classList.add(result[c]);
        }
        updateKeyboard(guess, result);
    }

    currentRow = guesses.length;
    currentCol = 0;
    currentGuess = [];

    if (gameOver) {
        const won = guesses.length > 0 && guesses[guesses.length - 1] === secretWord;
        showResult(won);
    }
}

// ─────────────────────────────────────────────
//  INPUT HANDLING
// ─────────────────────────────────────────────
function attachKeyListeners() {
    document.addEventListener('keydown', e => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const k = e.key;
        if (k === 'Enter') { handleKey('Enter'); return; }
        if (k === 'Backspace') { handleKey('⌫'); return; }
        if (/^[a-zA-Z]$/.test(k)) handleKey(k.toLowerCase());
    });
}

function handleKey(key) {
    if (gameOver) return;

    if (key === '⌫' || key === 'Backspace') {
        deleteLetter();
    } else if (key === 'Enter') {
        submitGuess();
    } else if (/^[a-z]$/.test(key) && currentCol < WORD_LENGTH) {
        addLetter(key);
    }
}

function addLetter(letter) {
    if (currentCol >= WORD_LENGTH) return;
    const tile = getTile(currentRow, currentCol);
    tile.textContent = letter.toUpperCase();
    tile.classList.add('filled');
    currentGuess.push(letter);
    currentCol++;
}

function deleteLetter() {
    if (currentCol <= 0) return;
    currentCol--;
    currentGuess.pop();
    const tile = getTile(currentRow, currentCol);
    tile.textContent = '';
    tile.classList.remove('filled');
}

// ─────────────────────────────────────────────
//  GUESS SCORING
// ─────────────────────────────────────────────
function scoreGuess(guess, target) {
    const result     = Array(WORD_LENGTH).fill('absent');
    const targetArr  = target.split('');
    const guessArr   = guess.split('');
    const targetUsed = Array(WORD_LENGTH).fill(false);
    const guessUsed  = Array(WORD_LENGTH).fill(false);

    // Pass 1 — correct
    for (let i = 0; i < WORD_LENGTH; i++) {
        if (guessArr[i] === targetArr[i]) {
            result[i]     = 'correct';
            targetUsed[i] = true;
            guessUsed[i]  = true;
        }
    }
    // Pass 2 — present
    for (let i = 0; i < WORD_LENGTH; i++) {
        if (guessUsed[i]) continue;
        for (let j = 0; j < WORD_LENGTH; j++) {
            if (targetUsed[j]) continue;
            if (guessArr[i] === targetArr[j]) {
                result[i]     = 'present';
                targetUsed[j] = true;
                break;
            }
        }
    }
    return result;
}

// ─────────────────────────────────────────────
//  SUBMIT GUESS
// ─────────────────────────────────────────────
function submitGuess() {
    if (currentCol < WORD_LENGTH) {
        shakeRow(currentRow);
        showToast('Not enough letters, fam');
        return;
    }

    const guess = currentGuess.join('');

    const result = scoreGuess(guess, secretWord);

    // Animate tiles with flip + color
    for (let c = 0; c < WORD_LENGTH; c++) {
        const tile = getTile(currentRow, c);
        const delay = c * 300;
        setTimeout(() => {
            tile.classList.add('flip');
            setTimeout(() => {
                tile.classList.remove('filled');
                tile.classList.add(result[c]);
                tile.classList.remove('flip');
            }, 250);
        }, delay);
    }

    // After animation, update keyboard + check win/lose
    setTimeout(() => {
        updateKeyboard(guess, result);
        guesses.push(guess);
        currentRow++;
        currentCol = 0;
        currentGuess = [];

        const won = guess === secretWord;
        if (won || currentRow >= MAX_GUESSES) {
            gameOver = true;
            saveState();
            setTimeout(() => showResult(won), 400);
        } else {
            saveState();
        }
    }, WORD_LENGTH * 300 + 300);
}

// ─────────────────────────────────────────────
//  KEYBOARD COLORING
// ─────────────────────────────────────────────
const KEY_PRIORITY = { correct: 3, present: 2, absent: 1 };

function updateKeyboard(guess, result) {
    for (let i = 0; i < WORD_LENGTH; i++) {
        const letter = guess[i];
        const btn    = document.querySelector(`.key[data-key="${letter}"]`);
        if (!btn) continue;
        const newClass = result[i];
        const curClass = ['correct','present','absent'].find(c => btn.classList.contains(c));
        if (!curClass || KEY_PRIORITY[newClass] > KEY_PRIORITY[curClass]) {
            if (curClass) btn.classList.remove(curClass);
            btn.classList.add(newClass);
        }
    }
}

// ─────────────────────────────────────────────
//  RESULT DISPLAY
// ─────────────────────────────────────────────
const WIN_MESSAGES = [
    'BASED 🔥',
    'No cap, you got it! 🧢',
    'bussin fr fr 💯',
    'slay, bestie 💅',
    'straight up W 🏆',
    'down bad but came through 😤'
];

function showResult(won) {
    const section = document.getElementById('result-section');
    const title   = document.getElementById('result-title');
    const sub     = document.getElementById('result-sub');
    const answer  = document.getElementById('result-answer');

    if (won) {
        title.textContent = WIN_MESSAGES[Math.min(guesses.length - 1, WIN_MESSAGES.length - 1)];
        sub.textContent   = `Solved in ${guesses.length} / ${MAX_GUESSES} tries`;
        answer.style.display = 'none';
    } else {
        title.textContent    = 'L + ratio 💀';
        sub.textContent      = 'The word was:';
        answer.textContent   = secretWord;
        answer.style.display = 'inline-block';
    }

    section.style.display = 'block';
    section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ─────────────────────────────────────────────
//  SAVE / LOAD STATE
// ─────────────────────────────────────────────
function saveState() {
    const todayKey = new Date().toISOString().slice(0, 10);
    setCookie(COOKIE_STATE, {
        date: todayKey,
        guesses,
        gameOver
    }, 2);
}

// ─────────────────────────────────────────────
//  SAVE BOARD STATE TO CLIPBOARD
// ─────────────────────────────────────────────
function copyResultToClipboard() {
    if (!gameOver) return;

    const won = guesses[guesses.length - 1] === secretWord;
    const score = won ? guesses.length : 'X';

    const emojiGrid = guesses.map(guess => {
        const result = scoreGuess(guess, secretWord);
        return result.map(r => {
            if (r === 'correct') return '🟩';
            if (r === 'present') return '🟨';
            return '⬛';
        }).join('');
    }).join('\n');

    const text = `Urban Wordle ${score}/${MAX_GUESSES}\n${emojiGrid}`;

    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard! 📋');
    }).catch(() => {
        // Fallback for browsers that block clipboard access
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        // Intentional depreciated use for browsers that are blocking clipboard access.
        // noinspection JSDeprecatedSymbols
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('Copied to clipboard! 📋');
    });
}

// ─────────────────────────────────────────────
//  TOAST
// ─────────────────────────────────────────────
let toastTimer = null;
function showToast(msg, duration = 1800) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), duration);
}

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────
function getTile(r, c) {
    return document.getElementById(`tile-${r}-${c}`);
}

function shakeRow(r) {
    const row = document.getElementById(`row-${r}`);
    row.classList.add('shake');
    setTimeout(() => row.classList.remove('shake'), 400);
}

// ─────────────────────────────────────────────
//  BOOT
// ─────────────────────────────────────────────
fetchWords().then();