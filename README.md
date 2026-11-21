# CyberLab

Interactive cybersecurity learning platform — lessons, live simulations, and quizzes that run entirely in the browser. No paid API keys or real infrastructure required.

**Stack:** React 19 · TypeScript · Vite 8 · Tailwind CSS v4 · Vitest · Recharts · Lucide icons

Optionally installable as a lightweight PWA (`public/manifest.webmanifest`).

## Features

### Modules
| Module | Lessons | Interactive labs |
|--------|---------|------------------|
| **Network Security** | Layers, firewalls | Topology diagram, firewall rule lab, packet-flow animation, TCP handshake |
| **Encryption & Hashing** | Symmetric/asymmetric, key derivation, hashing | Caesar/Vigenère playground, AES-256-GCM with PBKDF2-derived key (Web Crypto; shows salt, IV, iterations), hashing + salting |
| **Phishing** | Social engineering | Spot-the-phish email lab |
| **Malware** | Worms & containment | Infection spread on a network graph |
| **DDoS** | Availability attacks | Live RPS chart with rate-limit / CDN toggles |
| **MITM** | HTTP vs HTTPS | Alice / Bob / Mallory animation |
| **SQL Injection** | Concat vs parameters, precedence, UNION, JOIN, subqueries, functions | Login · UNION search · JOIN order-lookup · blind boolean/EXISTS labs; parameterized toggle on each |
| **Defense Basics** | MFA, patching, least privilege | Password strength checker, defense-in-depth checklist |

### Cross-cutting
- Quizzes with immediate feedback and explanations
- Progress tracking in `localStorage`
- Lab provider interface: `simulated` (default) ↔ `real` (stub) via `VITE_LAB_MODE`

## Prerequisites

- Node.js 20+ (18+ may work)
- npm 10+

## Install

```bash
cd cyberlab
npm install
```

## Run (development)

```bash
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Build

```bash
npm run build
```

Output goes to `dist/`. Routes and each lab are lazy-loaded, so the first page only downloads the entry and React vendor chunks (~95 KB gzip). Recharts (`charts-*.js`) loads only when you open the DDoS lab.

```bash
VITE_BASE=/cyberlab/ npm run build   # sub-path build (GitHub Pages project site)
npm run build:mac                    # macOS bundle → release/cyberlab-mac.zip (see "macOS / Safari")
```

## Preview production build

```bash
npm run preview
```

## Test

```bash
npm test
```

Unit tests (Vitest) cover the fullscreen helpers (standard + WebKit-prefixed API) and button, router/base selection, ciphers, firewall, the SQL engine (WHERE, UNION, ORDER BY, LIKE, JOIN, subqueries, functions), login/search/JOIN/blind simulators, AES-GCM + PBKDF2, providers/mode switching, quiz scoring, password strength, and input validation. Server validators run with `npm run server:test` (node:test).

## SQL injection lab: how the simulator works

In vulnerable mode the login builds `SELECT * FROM users WHERE username = '<u>' AND password = '<p>'` by string concatenation and runs it through a small SQL engine (`src/lib/sqli.ts`) that follows real SQL rules:

- `--` starts a comment (outside string literals); `''` is an escaped quote
- precedence is `NOT` > `AND` > `OR`; parentheses work
- an unbalanced quote is a syntax error; stacked queries (`; DROP …`) are refused

| Username | Password | Vulnerable result |
|----------|----------|-------------------|
| `' OR 1=1 --` | anything | Bypass — returns all users |
| `admin' --` | anything | Bypass — logs in as admin |
| `' OR '1'='1` | `x` | **Fails** — parses as `username='' OR ('1'='1' AND password='x')` |
| `' OR '1'='1` | `' OR '1'='1` | Bypass — the tautology is in both fields |
| `'` | anything | Syntax error (shows why error leakage matters) |

Parameterized mode binds both inputs as values, so every payload above fails.

### UNION attack lab (product search)

A second scenario searches a **products** table with a fixed **3-column** shape (`id, title, body`):

```sql
SELECT id, title, body FROM products WHERE title LIKE '%{input}%'
```

The same SQL engine now also parses `UNION [ALL] SELECT`, `ORDER BY n`, and `LIKE`. One-click payloads probe the column count and leak the `users` table into the result grid.

| Search input | Vulnerable result |
|--------------|-------------------|
| `Patch` | Normal match — "Patch Tuesday" |
| `' ORDER BY 1 --` … `' ORDER BY 3 --` | OK (probe succeeds) |
| `' ORDER BY 4 --` | Error: `ORDER BY position 4 is out of range` |
| `' UNION SELECT username, password FROM users --` | Error: column count 3 vs 2 |
| `' UNION SELECT null, null, null, null FROM users --` | Error: column count 3 vs 4 |
| `' UNION SELECT null, username, password FROM users --` | **Leak** — usernames appear under `title`, passwords under `body` (highlighted rows) |
| (any of the above, safe mode) | Bound `LIKE ?` — no UNION / ORDER BY / leak |

**Engine limits (current):** SELECT / WHERE / LIKE / IN / EXISTS / scalar subqueries / INNER|LEFT JOIN … ON / aliases / UNION [ALL] / ORDER BY / functions (`COUNT`, `LOWER`, `UPPER`, `LENGTH`, `SUBSTR`, `CONCAT`/`||`, `ASCII`). No RIGHT/FULL JOIN, no GROUP BY beyond a single aggregate SELECT, no LIMIT/OFFSET, no window functions, no DDL/DML, no stacked queries. Tables: `products` (3), `users` (4), `orders` (5), `api_keys` (3, hidden).

### JOIN order-lookup lab

```sql
SELECT o.id, o.item, u.username, o.ship_to
FROM orders o INNER JOIN users u ON o.user_id = u.id
WHERE o.id = '{input}'
```

| Input | Vulnerable result |
|-------|-------------------|
| `1001` | Alice's order only |
| `' OR 1=1 --` | Every customer's orders + shipping addresses (highlighted) |
| `' UNION SELECT null, username, password, role FROM users --` | UNION against the 4-column JOIN shape |
| (any, safe mode) | Bound `o.id = ?` — no leak |

### Blind boolean / subquery lab

Same product-search page; payloads ask yes/no questions:

| Input | Oracle |
|-------|--------|
| `' AND (SELECT SUBSTR(password,1,1) FROM users WHERE username='admin')='s' --` | TRUE (rows) |
| `…='x' --` | FALSE (0 rows) |
| `' AND EXISTS(SELECT 1 FROM api_keys) --` | TRUE |
| `' AND EXISTS(SELECT 1 FROM secrets) --` | Error `no such table` |

## Real tools mode (local lab API)

```bash
npm run server          # http://127.0.0.1:8787  (loopback only)
npm run dev             # Vite UI
# or both:
npm run dev:all
```

Set `VITE_LAB_MODE=real` and `VITE_LAB_API_URL=http://127.0.0.1:8787`, or use the in-app **Tools** page toggle (persisted in `localStorage`, overrides the env default). Endpoints: `/health`, `/ping`, `/traceroute`, `/dns`, `/headers`, `/port`.

**Security notes:** the API binds to `127.0.0.1` only, rate-limits to 30 req/min, validates hosts with a strict hostname/IPv4 allowlist (no shell metacharacters), and always invokes system binaries via `execFile` with an argument array (never a shell string). ICMP ping/traceroute fall back to a TCP `:443` connect probe when binaries are missing or ICMP is blocked — common inside containers. Packet capture is still simulated (needs root/pcap). The frontend allowlist permits loopback `http://` and any `https://` base without credentials (`src/lib/validation.ts`).

## AES lab: key derivation

`src/lib/aes.ts` derives a 256-bit AES-GCM key from the passphrase with PBKDF2-HMAC-SHA-256 (600,000 iterations, random 16-byte salt) and uses a fresh random 12-byte IV per encryption. The stored blob is `base64(salt ‖ IV ‖ ciphertext+tag)`; the UI shows salt, IV, iteration count and timing. A wrong passphrase or a flipped bit fails GCM authentication.

## Lab mode: simulated → real tools

Default (`.env`):

```
VITE_LAB_MODE=simulated
```

All labs use `src/labs/providers/simulated`. The `real` adapter is a no-network stub: it never calls `fetch` or contacts a host. To prepare for real tooling later:

1. Copy `.env.example` → `.env` and set `VITE_LAB_MODE=real`
2. Optionally set `VITE_LAB_API_BASE` to an `https://` URL or a same-origin path (no credentials)
3. Implement methods in `src/labs/providers/real/index.ts`, routing every URL through `resolveLabApiUrl()` so arbitrary hosts cannot be called
4. Keep educational UI the same — only the provider swaps

See `src/labs/providers/types.ts` for the `LabProvider` interface.

## Deploy

Any static host works after `npm run build`; publish `dist/`.

CyberLab is a single-page app with client-side routes (`/modules/sqli`, `/progress`, …). Static hosts must serve `index.html` for unknown paths, or deep links and refreshes return 404. Fallbacks are already included:

| Host | File | What it does |
|------|------|--------------|
| Netlify / Cloudflare Pages | `public/_redirects` → `dist/_redirects` | `/*  /index.html  200` |
| Vercel | `vercel.json` | rewrites all paths to `/index.html` |
| GitHub Pages | `dist/404.html` (copied from `index.html` by a small plugin in `vite.config.ts`) | serves the app for any unknown path |
| nginx | — | add `try_files $uri /index.html;` |
| S3 + CloudFront | — | set the error document / custom 403 & 404 responses to `/index.html` with status 200 |

### Sub-path and router settings (build-time env)

| Variable | Default | Effect |
|----------|---------|--------|
| `VITE_BASE` | `/` | Public base path. `VITE_BASE=/cyberlab/ npm run build` for a GitHub Pages project site (`vite build --base /cyberlab/` also works). The router `basename` follows automatically (`import.meta.env.BASE_URL`). |
| `VITE_BASE=./` | — | Relocatable build: every asset URL is relative, and the app switches to `HashRouter` automatically (`index.html#/modules/sqli`), so it runs from any folder with no rewrite rules. Used by the Mac zip. |
| `VITE_ROUTER=hash` | browser | Force `HashRouter` with any base. |

Preview a sub-path build exactly as it will be served:

```bash
VITE_BASE=/cyberlab/ npm run build
VITE_BASE=/cyberlab/ npx vite preview     # → http://localhost:4173/cyberlab/
```

The PWA manifest uses relative `start_url`/`scope`/icons, so it is correct under any base.

### GitHub Pages (workflow included, not yet enabled)

`.github/workflows/pages.yml` runs the tests, builds with `VITE_BASE=/<repo-name>/` and deploys to Pages on every push to `main`. One-time setup by the repo owner: **Settings → Pages → Source: GitHub Actions**. On free GitHub plans Pages only works for **public** repositories. The site is then at `https://<owner>.github.io/<repo>/` (for a user site `<owner>.github.io` or a custom domain, change `VITE_BASE` to `/` in the workflow).

### GitHub Release with the Mac zip

`.github/workflows/release.yml` builds `cyberlab-mac.zip` and attaches it to a Release whenever a `v*` tag is pushed (or manually via *Actions → Release (macOS zip) → Run workflow*):

```bash
git tag v1.0.0 && git push origin v1.0.0
```

Manual alternative with the GitHub CLI (from a machine logged in with `gh auth login`):

```bash
npm run build:mac                                   # → release/cyberlab-mac.zip
gh release create v1.0.0 release/cyberlab-mac.zip \
  --title "CyberLab v1.0.0" \
  --notes "Mac : décompressez puis double-cliquez « Lancer CyberLab.command ». En ligne : https://<owner>.github.io/<repo>/"
# later builds: gh release upload v1.0.0 release/cyberlab-mac.zip --clobber
```

Direct download link after publishing: `https://github.com/<owner>/<repo>/releases/latest/download/cyberlab-mac.zip`.

## macOS / Safari

CyberLab is tested against **WebKit 27.2 with Playwright's *Desktop Safari* profile** (`npm run smoke:webkit`, see below). The smoke test covers all four main routes, all 8 modules, all 17 labs and quizzes, the animations (packet flow, MITM, malware spread, DDoS chart), Web Crypto AES-256-GCM + PBKDF2 encrypt/decrypt/wrong-key, localStorage persistence, deep-link reload, header navigation, and both fullscreen buttons. It passes at the root (`/`), under `/cyberlab/`, and from the Mac zip served with `python3 -m http.server`.

### Three ways to use it on a Mac

1. **Online (once Pages is enabled):** open `https://<owner>.github.io/<repo>/` in Safari.
2. **Add to Dock (Safari 17+, macOS Sonoma+):** with the site open, choose **File → Add to Dock…**. CyberLab then opens in its own window with its icon (`apple-touch-icon.png`, `apple-mobile-web-app-*` meta and a `display: standalone` manifest are included). On iPhone/iPad use **Share → Add to Home Screen**.
3. **Offline zip, `cyberlab-mac.zip`** (from the GitHub Release, or build it with `npm run build:mac`):
   ```
   CyberLab-Mac/
   ├── Lancer CyberLab.command   # double-click: starts python3 -m http.server on 127.0.0.1 and opens Safari
   ├── LISEZMOI-MAC.txt          # French instructions (Gatekeeper, chmod +x, file:// explanation)
   └── app/                      # optimized static build, relative paths + HashRouter
   ```
   The launcher picks the first free port from 8765, binds **127.0.0.1 only**, waits until the server answers, then runs `open -a Safari`. Closing the Terminal window stops it.

### Fullscreen

- A **⤢ button in the header** puts the whole app in fullscreen. Each lab also has a **"Fullscreen" button** that fullscreens only that lab's frame, with an opaque background and scrolling.
- The implementation is in `src/lib/fullscreen.ts` and `src/hooks/useFullscreen.ts`. It uses the standard API (`requestFullscreen`, `exitFullscreen`, `fullscreenchange`) and falls back to WebKit's prefixed API (`webkitRequestFullscreen`, `webkitExitFullscreen`, `webkitfullscreenchange`, `webkitFullscreenElement`) for older Safari.
- When neither API exists, the buttons are hidden.
- CSS for `:fullscreen` and `:-webkit-full-screen` is kept in separate rules. Safari drops a whole rule whose selector list contains an unknown pseudo-class.

### Safari fixes made for this release

- **CSP and local HTTP.** The CSP `<meta>` contained `upgrade-insecure-requests`, which made Safari/WebKit rewrite every script and style request on `http://127.0.0.1` / `localhost` to `https://`, so nothing loaded and the page stayed blank. Chrome exempts loopback; WebKit does not. The directive was removed from the meta tag and the `vite preview` headers. The HTTPS-only Vercel header keeps it. `frame-ancestors` was also removed from the meta tag, where browsers ignore it (Safari logs an error). It stays in the HTTP headers.
- `backdrop-filter` (the glass panels) is emitted with `-webkit-backdrop-filter` by Lightning CSS, and the smoke test confirms it.
- There is no regex lookbehind or `structuredClone` in app code. `Array.prototype.at` requires Safari 15.4+, within Vite's default build target (Safari 16+).

### macOS limitations

- **Safari fullscreen behaviour.** Entering fullscreen requires a click (user gesture); it cannot start automatically. Safari shows a short "Press Esc to exit" banner, and pressing **Esc** leaves fullscreen. The green window button / **Ctrl+Cmd+F** (window fullscreen) is separate from the in-page Fullscreen API: both work, but Esc only exits the in-page one. In a Dock web app, fullscreen works the same way.
- **iOS / iPadOS.** iPhone Safari does not support element fullscreen (video only), so the buttons are hidden there. iPadOS 16.4+ supports it. "Add to Home Screen" gives a standalone, chrome-less window instead.
- **Web Crypto needs a secure context.** `crypto.subtle` (AES/PBKDF2 lab) only exists on `https://` or `http://localhost` / `127.0.0.1`. Opening `index.html` directly (`file://`) will **not** work: Safari also blocks ES modules from `file://`. That is why the zip ships a launcher that starts a local server.
- **Gatekeeper.** `Lancer CyberLab.command` is not signed or notarized. On first launch:
  - macOS ≤ 14: right-click → **Open**.
  - macOS 15+: **System Settings → Privacy & Security → Open Anyway**.
  - If the executable bit was lost, run `chmod +x "Lancer CyberLab.command"`.
  - Alternatively, run `xattr -dr com.apple.quarantine CyberLab-Mac`.
- **Python 3.** The launcher uses `python3` from Apple's Command Line Tools (`xcode-select --install`). If it is missing, it shows an alert.
- **Real tools mode (ICMP ping, traceroute…)** needs the source checkout and the local Node lab API (`npm run dev:all`); the zip and the Pages site run the simulated labs.
  - macOS may ask to allow **incoming network connections** for `node`/`python3`, or **local network** access. Both servers bind to `127.0.0.1` only, so "Deny" for external access is fine.
  - The `ping` binary works unprivileged on macOS. If it is unavailable, the server falls back to a TCP :443 probe.
  - From the **HTTPS** Pages site, Safari may block calls to `http://127.0.0.1:8787` as mixed content. Use the real tools mode from `npm run dev:all` (`http://localhost:5173`).
- **Progress storage.** Progress lives in Safari's `localStorage` for the exact origin. A different port (e.g. 8766) or the Pages site means separate progress. Private windows keep nothing, and Safari may purge site data after 7 days without visiting (ITP) for sites not added to the Dock.
- **Minimum version:** Safari 16 / macOS 12 Monterey. "Add to Dock" needs Safari 17 / macOS 14 Sonoma.

### Re-run the WebKit smoke test

```bash
npm install --no-save playwright && npx playwright install webkit   # Linux also needs: npx playwright install-deps webkit
npm run build && npx vite preview --host 127.0.0.1 --port 4173 &
npm run smoke:webkit                                                # BASE_URL=… HASH=1 for the Mac zip
```

## Project structure

```
cyberlab/
├── PROMPTS.md                 # Verbatim user requests
├── README.md
├── .env / .env.example        # VITE_LAB_MODE (no secrets; .env is gitignored)
├── index.html
├── server/                   # Local lab API (ping/traceroute/dns/headers/port)
├── scripts/dev-all.mjs         # Run API + Vite together
├── scripts/build-mac.mjs       # npm run build:mac → release/cyberlab-mac.zip (uses package_mac.py)
├── scripts/webkit-smoke.mjs    # npm run smoke:webkit — Safari/WebKit end-to-end smoke test
├── packaging/mac/              # Lancer CyberLab.command + LISEZMOI-MAC.txt (copied into the Mac zip)
├── .github/workflows/          # pages.yml (GitHub Pages) + release.yml (Mac zip on v* tags)
├── vercel.json                # Vercel SPA rewrite + security headers
├── public/                    # favicon, apple-touch-icon, icons/, PWA manifest, _redirects (Netlify)
├── docs/screenshots/          # UI screenshots
├── src/
│   ├── App.tsx / main.tsx / index.css
│   ├── components/            # Layout, Quiz, LessonCard, PercentBar, FullscreenButton
│   ├── pages/                 # Home, Module, Labs, Progress
│   ├── data/modules/          # Per-topic curriculum files + index
│   ├── data/modules.ts        # Re-exports
│   ├── lib/
│   │   ├── sql/               # modular engine: ast, tokenizer, parser, evaluator, functions, database, scenarios
│   │   ├── sqli.ts / sqlSelect.ts  # thin compatibility façades
│   │   ├── aes, ciphers, firewall, quiz, progress, password, validation, fullscreen, routerConfig
│   ├── labs/
│   │   ├── providers/         # simulated + real adapters
│   │   ├── titles.ts          # lab names (kept separate so lab code stays lazy)
│   │   └── ui/                # Interactive lab components (each lazy-loaded)
│   ├── hooks/                 # useProgress, useFullscreen
│   ├── types/
│   └── test/setup.ts
└── vite.config.ts             # Vite + Tailwind + Vitest, chunk groups, 404.html fallback
```


## Security notes

- There is no backend, so CSRF and classic IDOR against a server do not apply. Progress is stored only in `localStorage` and is parsed with a schema (invalid or oversized JSON is discarded).
- The production build ships a strict Content-Security-Policy (`script-src`/`style-src` `'self'`, no `unsafe-eval`). Vite's dev server strips that meta tag so Hot Module Replacement can run.
  - `connect-src` allows only `'self'` plus the loopback lab API (`http://127.0.0.1:8787`, `http://localhost:8787`).
  - The meta tag has no `upgrade-insecure-requests`, because Safari would then break every plain-HTTP localhost serving (see *macOS / Safari*). HTTPS hosts send it as a header (`vercel.json`).
- The SQL injection labs intentionally concatenate input into a simulated in-memory engine (vulnerable vs parameterized modes). Input is length-capped; the parser does not use `eval`, a real database, or HTML injection. Demo accounts (`alice`/`wonderland`, `bob`/`builder`, `admin`/`s3cret!`) are fake teaching data.
- The phishing lab renders sample emails as text and never uses the displayed destination as a navigable `href`.

## Ethical use

CyberLab simulations are for education only. Do not use these techniques against systems you do not own or lack explicit permission to test.

## License

Source delivered for learning / portfolio use as requested.
