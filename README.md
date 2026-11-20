# Hindi Typing Practice Tutor (MERN)

Learn Hindi typing on the **Kruti Dev / Remington** keyboard with the eight exercises of
*हिंदी शब्द संसाधन* (`Chap11-HindiShabadSansadhan2ndEditionPart2.pdf`, pages 73–80),
rendered in the supplied **KRDV010.TTF** font, with real-time mistake underlining,
automatic next-line focus, celebrations, and saved progress.

```
hindi-typing-tutor/
├── backend/    Express + MongoDB REST API (JWT in HTTP-only cookie)
└── frontend/   React 19 + Vite + Redux Toolkit + React Bootstrap
```

---

## 1. Quick start

Prerequisites: **Node.js ≥ 20** and **MongoDB** running on `mongodb://127.0.0.1:27017`.

```bash
# 1) backend
cd backend
npm install
# create backend/.env (see "Environment files" below)
npm run seed                  # loads the 8 PDF exercises (84 lines) into MongoDB
npm run dev                   # http://localhost:5000

# 2) frontend (second terminal)
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

Open http://localhost:5173, register, and you are taken to the dashboard.
The Vite dev server proxies `/api` to `:5000`, so the browser talks to a single origin.

### Environment files

There are exactly two env files, both in `backend/`, and both are git-ignored
(never committed, because they contain the database password and the JWT secret):

| file | used by | content |
|---|---|---|
| `.env` | `npm run dev`, `npm start`, `npm run seed` | development settings |
| `.env.production` | `npm run prod`, `npm run start:prod`, `npm run seed:prod` | production settings |

Variables:

```ini
NODE_ENV=development            # production in .env.production
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/hindi_typing_tutor   # or your Atlas URI
JWT_SECRET=<long random value>  # different in development and production
JWT_EXPIRES_IN=1d
CLIENT_URL=http://localhost:5173  # production: the public URL of the site
# production only (optional): COOKIE_SECURE=true, TRUST_PROXY=1, LOG_LEVEL=info,
# AUTH_RATE_LIMIT=20, API_RATE_LIMIT=1000, BCRYPT_ROUNDS=12
```

Generate a JWT secret with:
`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

### Production mode

Production settings live in **`backend/.env.production`**. In production **only**
that file is read, so development values can never leak in. On a hosting platform
the file is not deployed; the same variables are set in the platform's
dashboard instead (see *Deploy on Render*). The server refuses to start, and lists
what is missing, if `JWT_SECRET` is weak or `MONGO_URI` / `CLIENT_URL` are not set.

```bash
cd backend
npm run seed:prod     # load / update the 8 exercises in the production database
npm run prod          # build the frontend, then start in production mode
# or, if the frontend is already built:
npm run start:prod    # = node server.js --production
```

Open the URL in `CLIENT_URL` (default http://localhost:5000). The API serves the
built frontend from `frontend/dist` on the same port, so no separate frontend server is needed.

The `--production` flag replaces `NODE_ENV=production`, which does not work in the
Windows command prompt. On Linux both work.

What changes in production:

| | development | production |
|---|---|---|
| env file | `.env` | `.env.production` |
| frontend | Vite dev server :5173 | built files served by Express |
| auth cookie | HttpOnly, SameSite=Lax | HttpOnly, **Secure**, SameSite=**Strict** |
| logs | coloured console + `logs/dev.log` | JSON → console, `logs/combined.log`, `logs/error.log` |
| error details | full messages | 500 errors hidden from clients |
| proxy | – | `trust proxy` = `TRUST_PROXY` (for Nginx/Render/Heroku) |

Deploying on a server: put the app behind **HTTPS**, since Secure cookies are only sent
over https (browsers also allow them on http://localhost). Set `CLIENT_URL` to the public
URL. For a plain-http intranet install only, set `COOKIE_SECURE=false`.

### Deploy on Render

`render.yaml` (repository root) describes both services. You can use it as a Render
Blueprint, or copy its settings into services created by hand.

**A. One Web Service (simplest, recommended).** The API serves the website too.

| setting | value |
|---|---|
| Root Directory | `backend` |
| Build Command | `npm install` (on Render, a postinstall step also builds `frontend/dist`) |
| Start Command | `node server.js` |
| Health Check Path | `/api/health` |

Environment, with the same values as `backend/.env.production`: `NODE_ENV=production`,
`MONGO_URI`, `JWT_SECRET`, and `CLIENT_URL=https://<api-service>.onrender.com`. Do not
set `PORT`; Render provides it. Open `https://<api-service>.onrender.com`.

**B. Separate Static Site for the website** (e.g. `hindi-typing-tutor-frontend`), in
addition to the Web Service from A. A static site only serves files, so it needs **two
rewrite rules** (Static Site → *Redirects/Rewrites*, in this order):

| Source | Destination | Action |
|---|---|---|
| `/api/*` | `https://<api-service>.onrender.com/api/*` | Rewrite |
| `/*` | `/index.html` | Rewrite |

Without the first rule, `/api/auth/csrf` and `/api/auth/me` return 404 "Not Found".
Without the second, opening `/login` or refreshing any page returns 404. With the
proxy rule the browser sees one domain, so the cookies stay first-party. Static Site
settings: Root Directory `frontend`, Build Command `npm install --include=dev && npm run build`,
Publish Directory `dist`. On the Web Service, add the static site's URL to `CLIENT_URL`
(comma-separated).

*Alternative to the proxy rule:* build the static site with
`VITE_API_URL=https://<api-service>.onrender.com/api` and set `COOKIE_SAMESITE=none` on
the Web Service. The login cookie is then a cross-site cookie, which some browsers
(Safari, strict tracking protection) block, so the proxy rule is preferred.

**MongoDB Atlas:** open **Network Access** and allow Render to connect (`0.0.0.0/0` or
Render's outbound IPs). Load the exercises once with `npm run seed:prod` from your PC.

---

## 2. How to type (Kruti Dev mode)

Keep the operating-system keyboard on **English (US)**. Each key gives the Remington
character that the Kruti Dev font draws. The on-screen keyboard shows every key and
its Shift glyph, and highlights the **next key** (plus the correct Shift key).

| You want | Keys | Notes |
|---|---|---|
| क ग म त … | `d` `x` `e` `r` | full consonants |
| क् म् त् … (half) | `D` `E` `R` | Shift + same key |
| ख श ष ण थ ध घ भ क्ष | `[k` `'k` `"k` `.k` `Fk` `/k` `?k` `Hk` `{k` | half glyph + ा completes it (PDF p. 71) |
| ि | `f` **before** the consonant | कि = `fd`, स्थिति = `fLFkfr` |
| ा ी ु ू े ै ो ौ | `k h q w s S ks kS` | |
| ं ँ ः | `a`, **Alt+W** (or Alt+0161), `%` | |
| ृ ़ ् | `` ` `` `+` `~` | |
| reph र् | `Z` **after** the syllable | कर्म = `deZ` |
| rakar ्र | `z` after the consonant | प्र = `iz`, ट्र = `Vz` |
| ज्ञ श्र त्र द्ध द्य द्व | `K J = ) \| }` | single keys |
| रु रू ऋ | `# : _` | |
| ई ऊ ऑ | `bZ`, `mw` (or Alt+0197), `vkW` | |
| । , - | `A ] &` | |

Prefer a Hindi IME (Inscript, phonetic)? Switch the practice toolbar to
**Unicode IME** mode. Composition events are handled, so an unfinished IME composition
never completes a line.

**How a line works.** Every line has its own box below it.
* **Space after the last word** finishes the line. The end is detected from the word count, the length, or the last word, even if the line has mistakes. The result is saved and the cursor moves to a **new line in the same box**, so you can type the line again. Uncorrected mistakes stay red and are counted; skipped letters count as mistakes.
* **Enter** always moves the cursor to the next line of the box. On an empty line it moves to the next exercise line.
* **5 perfect repetitions in a row** move the cursor to the next line automatically.
* A perfect line plays a "✓ शाबाश!" animation plus likes and sound. A line finished with mistakes shows an amber notice.
* The reference text of the line being typed stays visible (sticky) below the top navigation bar while you scroll; the exercise header itself scrolls away with the page.
* The box grows to 7 lines while it has focus and shrinks again afterwards.

**Shortcuts** on the practice page: `Alt+H` hint · `Alt+R` reset line · `Alt+N` / `Alt+P` next / previous exercise ·
`Alt+↓` / `Alt+↑` next / previous line · `Alt+K` keyboard on/off · `Alt+M` sound on/off · `Alt+W` ँ.
The hint (💡) of a line lists the characters of that line that need **Alt codes** (e.g. ऊ = Alt+0197, ँ = Alt+0161), with an easier key sequence where one exists.

**Light / dark mode:** the ☀/🌙 button in the top bar. Until you choose, the app follows the operating system. The choice is saved in a cookie and in your account.

---

## 3. The Kruti Dev encoding layer (`frontend/src/utils/kruti/`)

Kruti Dev is a **legacy font**. It re-draws Latin/Windows-1252 code points as Hindi glyphs
(`d` → क, `k` → ा, `‚` → ॉ). Unicode Hindi shown in that font would be garbage, and
comparing raw Kruti codes would reject correct text typed with different keys. So:

* **Canonical data is Unicode.** MongoDB stores NFC Unicode text.
* **`unicodeToKruti(text, {mode})`** converts it for display (`display` mode can use
  ligature glyphs like `í` = द्द and `â` = हृ) and for key guidance (`typable` mode
  only uses keys found on a US keyboard). It handles ि reordering, reph placement,
  rakar, half forms, halant fallbacks, the conjunct keys, nukta, and punctuation.
* **`krutiToUnicode(raw)`** decodes what the learner typed. It uses longest-match
  tokenising, moves the pending ि after the consonant cluster, moves reph to the front,
  completes "half + ा", and accepts alternative sequences (`Dk` = `d` = क, `mw` = `Å` = ऊ).
* **`segmentAksharas()`** splits Unicode into aksharas (consonant clusters with matras
  and modifiers). It is deterministic, rather than browser-ICU dependent.
* **`compareLine(reference, typedUnicode)`** compares akshara by akshara with
  word-level alignment. It reports `correct / incorrect / missing / pending / current`
  per akshara, plus extra text and error types: `character`, `matra`, `missing`, `extra`,
  `space`, `wordOrder`. An unfinished Kruti syllable (e.g. only `f` typed so far for कि,
  or a reph not yet typed) is shown as neutral *current*, not red. A line completes
  **only** when the decoded text equals the reference.
* **`ligatures.js`** is the input layer. It replaces typable sequences with the font's
  ligature glyphs as you type, so the input box looks like the reference.

The glyph table was checked by rendering every code point of `KRDV010.TTF` in Chrome.
A test also parses the font's `cmap` and asserts that every code the converter emits
has a glyph.

---

## 4. Speed & accuracy

Hindi typing tests count key depressions; **1 word = 5 keystrokes** (spaces included).

```
Gross WPM = (characters typed / 5) / minutes
Net WPM   = max(0, Gross WPM − incorrect characters / minutes)
Accuracy  = correct characters / characters typed × 100
```

* *Characters typed* counts every inserted keystroke, including ones later deleted
  (Kruti mode: keys; IME mode: Unicode code points).
* *Incorrect characters* are keystrokes that increased the number of errors.
* *Time* is active typing time. Idle gaps over 10 s are not counted.
* The server **recomputes** all statistics from the raw counts. Client-sent WPM is ignored.
* Flying likes, the sound, and the per-line Hindi popup appear **only** for a line typed
  with 100 % accuracy. The completion modal appears once per finished exercise.

---

## 5. REST API

All responses are JSON: `{ success, ... }` or `{ success:false, message, errors? }`.
State-changing requests need the `X-CSRF-Token` header. Its value is the readable
`csrf_token` cookie, which `GET /api/auth/csrf` sets (double-submit cookie). Every route
except `csrf`, `register`, `login`, and `logout` requires the HTTP-only `token` cookie.

### Auth
| Method | Path | Body / notes |
|---|---|---|
| GET | `/api/auth/csrf` | returns `{ csrfToken }` and sets the cookie |
| POST | `/api/auth/register` | `{ name, username, email, password, confirmPassword }` → 201, sets cookie · 409 duplicate · 400 validation |
| POST | `/api/auth/login` | `{ identifier (email or username), password }` → sets cookie · 401 |
| POST | `/api/auth/logout` | clears cookie |
| GET | `/api/auth/me` | current user (never includes the password hash) |
| PATCH | `/api/auth/preferences` | `{ soundEnabled?, showKeyboard?, lineCelebration?, inputMode?: 'kruti'\|'unicode' }` |

### Exercises
| Method | Path | |
|---|---|---|
| GET | `/api/exercises` | list (with `totalLines`, `sampleLine`; no line texts) |
| GET | `/api/exercises/:id` | full exercise with lines |
| GET | `/api/exercises/number/:number` | full exercise by number (1–8) |

### Progress
| Method | Path | |
|---|---|---|
| POST | `/api/progress/save` | `{ exerciseId, lineNumber, totalCharacters, incorrectCharacters, mistakes?, timeTaken (s), errorTypes? }` → `{ lineResult, progress, exerciseCompleted }` |
| POST | `/api/progress/reset/:exerciseId` | abandon the open attempt |
| GET | `/api/progress` | per-exercise status (not-started / in-progress / completed), best & last results |
| GET | `/api/progress/dashboard?tz=Asia/Kolkata` | totals, averages, best speed, 14-day daily progress, recent activity, daily goal |
| GET | `/api/progress/history?exerciseNumber=&exerciseId=&from=YYYY-MM-DD&to=&status=all\|completed\|in-progress&page=&limit=` | paginated sessions |
| GET | `/api/progress/continue` | where to resume `{ reason, exercise, progress, nextLine }` |
| GET | `/api/progress/:exerciseId` | `{ current (open attempt), lastCompleted, best, timesCompleted }` |
| GET | `/api/health` | liveness + DB state |

### Data model
* **User**: name, username (unique), email (unique), password (bcrypt, `select:false`),
  preferences {soundEnabled, showKeyboard, lineCelebration, inputMode, lastExerciseId, lastLineNumber}, timestamps.
* **Exercise**: exerciseNumber (unique), title, titleEnglish, description, keyboardRow,
  shiftPractice, keys, instructions[], difficulty, sourcePage,
  lines[{lineNumber, referenceText, hint, keyboardRow, difficulty}].
* **Progress**: one document per attempt, with userId, exerciseId, lineResults[],
  completedLines, lastCompletedLine, accuracy, grossWPM, netWPM, mistakes,
  total/correct/incorrect characters, timeTaken, completed, startedAt, completedAt.
  A partial unique index allows **one open attempt per user and exercise**. Further
  indexes cover history, dashboard, and resume queries.

---

## 6. Where data is kept

| Data | Storage |
|---|---|
| Session (JWT) | HTTP-only cookie `token` (`SameSite=Lax` dev / `Strict` + `Secure` prod), never readable by JS |
| CSRF token | readable cookie `csrf_token`, echoed in a header |
| UI preferences | cookie `htt_prefs` (instant restore) **and** the user document (synced) |
| Half-typed text of the current exercise | `localStorage` (per user and exercise), cleared once saved |
| Line results, sessions, statistics | **MongoDB** (the permanent record) |

On the next login, `/practice` resumes the most recent unfinished exercise at its first
unfinished line. Completed lines are restored from MongoDB and the half-typed draft from
localStorage.

---

## 7. Security

bcrypt (12 rounds) · JWT HS256 with expiry · HTTP-only cookies · CSRF double-submit ·
Helmet with CSP · CORS restricted to `CLIENT_URL` · rate limiting (API-wide and stricter
on login/register) · express-validator on every input · password hashes never returned ·
Winston logs redact passwords, tokens, and cookies.

---

## 8. Tests

```bash
cd backend  && npm test     # node:test + supertest against MongoDB database hindi_typing_tutor_test
cd frontend && npm test     # Vitest + Testing Library (jsdom)
```

The backend tests drop and re-create the separate `hindi_typing_tutor_test` database
(override it with `MONGO_URI_TEST`). They never touch the development database.

| Area | Where |
|---|---|
| Registration, login, logout, JWT (missing/tampered/expired/deleted user), CSRF, preferences | `backend/tests/auth.test.js` |
| Exercise retrieval, seeded text equals the PDF transcription | `backend/tests/exercise.test.js` |
| WPM formulas, save/resume/complete/reset, dashboard, history filters, privacy | `backend/tests/progress.test.js` |
| Kruti ↔ Unicode for matras, half letters, reph, rakar, conjuncts, nukta, punctuation; all 84 PDF lines round-trip; glyph coverage of the real KRDV010.TTF | `frontend/src/test/kruti.test.js` |
| Comparison engine: underlining states, error types, spaces, word order, IME normalisation | `frontend/src/test/compare.test.js` |
| Typing line: red underline, completion only when correct and only once, IME composition, Alt+W, paste blocked | `frontend/src/test/TypingLine.test.jsx` |
| Practice flow: auto-focus of the next line, likes + sound + Hindi popup only for perfect lines, sound OFF, congratulations modal, progress persistence and restore | `frontend/src/test/Practice.test.jsx` |
| Protected routes, login form, registration validation | `frontend/src/test/auth.test.jsx` |

---

## 9. Exercise content

All eight exercises were transcribed from the page images of PDF pages 73–80. The PDF's
embedded text layer uses a broken font mapping, so it could not be copied. Numbering,
order, and wording follow the book. Drill lines that print a lone matra (e.g. `ि4ि`,
`ापा`) are key drills and are kept exactly as printed. Visarga printed as a colon
(`प्रात:`) is stored as the real visarga `ः`. Data: `backend/seed/exerciseData.js`.
Per-line Hindi hints are generated from the line's content by `backend/seed/hintBuilder.js`.

The success sound `frontend/public/sounds/success.mp3` is an original synthesized chime.
If it cannot play, the app falls back to a Web Audio chime.
#   H i n d i _ T y p i n g _ T u t o r  
 