# Handoff brief — for Claude Code

This is a brief for picking up a project that was started in Claude.ai chat. Read this first, then `README.md`, then look at the actual files.

## What this project is

**CRA Investment Fund** — a private investment terminal for a retail investor in Madrid. Single-user dashboard with autonomous daily market scans. Designed to feel like a buy-side desk's internal tool, not a generic retail dashboard.

The user is a serious retail investor enthusiast who wants institutional-quality research workflows. They are not a professional developer but can handle terminal commands with guidance.

## Architecture decisions already made

- **Standalone HTML + Node scanner + GitHub Actions cron** — chosen over Lovable/Vercel/Netlify because it's fully free, fully owned by the user, and runs forever with zero maintenance. The HTML file works completely standalone (no backend needed) and gains autonomous daily updates when deployed.
- **Finnhub free tier** for market data (60 calls/min). 45-ticker curated "CRA universe" — keeps scans well under rate limits.
- **GitHub Pages** for hosting. Secrets for API key. The user's portfolio data (positions, watchlist) stays in browser localStorage, never committed.
- **Visual design:** Wall Street institutional aesthetic. Cream/parchment background, deep navy primary, brass accents, Playfair Display serif for headlines, Inter sans, IBM Plex Mono for numbers. This was iterated through several versions to get the "private fund's internal tool" feel rather than retail-app feel.
- **Opportunities format:** Each name has angle → why-now → bull case → bear case → verification checklist → invalidation trigger → position type → suggested sizing. The user specifically asked for "real professional analysis," not one-liners.

## Current state

Standalone mode works fully — open `index.html`, add Finnhub key, all features functional. Autonomous mode is built but not yet deployed by the user.

What's in this folder:
- `index.html` — the dashboard (127KB single-file, no build step)
- `scanner/scanner.js` — Node script that runs in GitHub Actions
- `scanner/package.json` — dependencies
- `.github/workflows/daily-scan.yml` — cron at 14:30 UTC weekdays
- `results/latest.json` — placeholder, will be overwritten on first scan
- `README.md` — full deployment guide for the user
- `.gitignore`

## What was deliberately NOT built (with reasons)

- **Politician trade scanner** — Finnhub doesn't have congressional trading data. User uses capitoltrades.com and quiverquant.com manually. Adding a paid API ($10-50/mo for Quiver) is an option but the user didn't request it yet.
- **X/Twitter sentiment** — X API costs $100-5000/mo. Not viable for personal use.
- **Real-time intraday data** — Finnhub free tier is delayed. Live feeds need paid tiers (Polygon $29/mo). User accepted this.
- **Buy/sell recommendations** — out of scope by design. The tool surfaces information, the user makes decisions. The Mandate page in the dashboard makes this explicit.
- **Push notifications / email digests** — possible future addition. Would require either a server (cron job + SendGrid/Resend) or a third-party webhook service. User hasn't requested it.

## Pending decisions and likely next steps

In rough priority order:

1. **Deploy.** Walk the user through README steps 1-5. Most likely sticking points: GitHub account creation if they don't have one, setting the secret, enabling Pages. The first manual workflow run is the moment of truth — watch the Actions tab logs together.

2. **Tune the universe.** The 45 tickers in `scanner/scanner.js` UNIVERSE array were curated by AI as a starting point. The user may want to add Spanish/European names (they're in Madrid), or remove names they don't follow. The same list exists in `index.html` — keep both in sync.

3. **Schedule tuning.** The cron is 14:30 UTC (~9:30 NYSE during EST, ~10:30 during EDT, 15:30/16:30 Madrid time). If they want morning Madrid time pre-market view, change to 06:00 UTC.

4. **Add per-position alerts.** If a position hits its stop or target, show a warning on the Daily Brief. Feasible client-side using the existing quote API and position data in localStorage. Would not need backend changes.

5. **Cross-watchlist insider scanner button.** A button on the watchlist page that runs insider scan only across watched tickers (faster than full universe). Small addition to scanner.js + UI in index.html.

6. **Multiple workflow files for different scan cadences.** Daily for insiders/news, weekly for earnings momentum, hourly for sector strength during market hours. Each writes its own JSON file.

7. **Email digest** (bigger lift). Would need a small Vercel/Netlify function with Resend or SendGrid. Generates a daily HTML email summarizing the brief. The user hasn't asked yet but is the obvious next major feature.

## How to work with this user

- They prefer ambitious, decisive output over hedging. When in doubt, build and show, don't ask.
- They appreciate honesty about limits. Specifically: this is research support, not prediction. Saying "no tool reliably predicts markets" earns trust.
- They're enthusiastic and sometimes want "moonshot" framing. Push back gently when a request stretches into something that won't actually help (e.g. real-time X sentiment for $100/mo isn't worth it for them).
- They write in mixed English with some typos and Spanish-inflected phrasing. That's fine — interpret charitably, don't ask for clarification on minor language ambiguity.
- They mentioned the name "CRA Investment Fund" is the name of the tool / their conceptual private fund. Treat it as their brand.

## First things to do in this session

1. Read `README.md`.
2. Skim `index.html` (search for `==================== ` to find section markers).
3. Read `scanner/scanner.js` end to end (it's small).
4. Ask the user where they are in the deployment process. Most likely: "I haven't started yet, walk me through it" — in which case start at README Step 1.
