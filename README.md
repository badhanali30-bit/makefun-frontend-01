# make.fun bounty board

[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

A fast, read-only frontend for [make.fun](https://make.fun) bounties, built
for the “Build the best make.fun frontend” bounty ($500 in USDC plus entry
fees). Static files under `app/` — no build step, no framework, no
sign-in — reading only make.fun's public API (`https://make.fun/api`).

## Run it

```sh
# any static server with app/ at its root, e.g.:
python3 -m http.server 8080 --directory app
# then open http://localhost:8080/
```

## Surfaces

| Route | What it shows |
| --- | --- |
| `#/` | Live bounty board — each bounty's live pot, entry fee, ticking time left and entries; type-to-filter, sort by deadline / pot / entries |
| `#/closed` | Bounties past their deadline (cut by deadline, not by the API status, which can still read “open” until results publish) |
| `#/bounty/<slug>` | One bounty: summary, live status banner, live-pot / fee / entries / deadline facts, rewards table with live payouts, description and rules as Markdown, phases |
| `#/bounty/<slug>/leaderboard` | That bounty's leaderboard — rank, account, entry and live scores; top 10 first, full board on demand, 50 rows at a time |
| `#/u/<handle>` | An account's public profile: avatar, bio, record (entered / placed / won / best placement / prizes) and every entry |

The header also has an account lookup: type `@handle` and press Enter.

## Why it's fast

- **Small first load**: the board view, API layer and formatters are the
  only first-load modules; the bounty, leaderboard and profile views load
  on demand with a literal `import()`. System fonts only — nothing else
  to download.
- **Few requests**: the whole board is one request
  (`activity=times`, `limit=100`); the leaderboard defaults to
  `rows=first` (top 10) because a full board can be megabytes — the full
  board loads only when asked for.
- **Caching**: answers are cached in memory for 60 s, then revalidated
  with `If-None-Match` (the API's ETags are bound to the minute, so a
  revalidation inside the same minute answers 304); concurrent views
  share one in-flight request per URL.
- **No rebuilds**: the countdown ticks once a second by rewriting only
  the `[data-deadline]` text nodes; filtering and sorting happen in the
  browser with no re-fetch.

## Files

- `app/index.html` — shell (header, account lookup, footer)
- `app/main.js` — hash router, countdown ticker, error view
- `app/api.js` — the API layer: cache + ETag revalidation + dedup
- `app/format.js` — money, dates, time-left, escaping helpers
- `app/md.js` — tiny safe Markdown renderer (escaped first, then markup)
- `app/views/board.js` — the board and the closed list
- `app/views/bounty.js` — one bounty's page
- `app/views/leaderboard.js` — a bounty's leaderboard
- `app/views/profile.js` — a public profile
- `app/style.css` — dark, responsive, system fonts
- `main.ts` — hands the entry in: copies `app/` + `screenshots/` to
  `/output` and writes `dossier.json` with the vendored library
- `vendor/makefun-frontend.ts` — the kit's dossier library, unchanged
- `screenshots/` — 3 screenshots of the app running on live make.fun data
