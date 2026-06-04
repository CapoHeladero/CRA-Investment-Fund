# CRA Investment Fund — Investment Terminal

A private investment dashboard with autonomous daily market scans. Runs entirely on free tier services.

## What this does

- **Standalone mode:** Open `index.html` in any browser. Use as a self-contained dashboard with positions, watchlist, deep-dive research, scoring, DCF, sector strength, and on-demand scanners. Your data lives in your browser only.
- **Autonomous mode:** Deploy to GitHub. GitHub Actions runs the scanner every weekday at market open, fetches insider transactions, earnings momentum, sector rotation, and news from Finnhub, and commits the JSON results to the repo. The dashboard reads that JSON on load — so when you open it each morning, fresh data is already there.

## Quick start — Standalone mode

1. Open `index.html` in your browser.
2. Go to Settings, get a free Finnhub API key from [finnhub.io/register](https://finnhub.io/register), paste it.
3. Done — all scanners now work on demand.

That's it. The standalone version is fully functional. The rest of this README is for the autonomous (deployed) version.

---

## Autonomous mode — full deployment (~15 minutes)

You need:
- A free GitHub account
- A free Finnhub API key
- ~10 minutes of clicking

### Step 1 — Push to GitHub

1. Create a new repository on GitHub (e.g. `cra-fund`). Can be public or private.
2. On your computer:
   ```bash
   cd cra-fund-deploy
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/cra-fund.git
   git push -u origin main
   ```
3. (Or upload the folder via GitHub's web UI — drag and drop works.)

### Step 2 — Add your Finnhub API key as a repo secret

1. On GitHub, go to your repo → **Settings** → **Secrets and variables** → **Actions**.
2. Click **New repository secret**.
3. Name: `FINNHUB_API_KEY`
4. Value: paste your Finnhub key
5. Save.

The scanner reads this from the environment when GitHub Actions runs. Your key is never committed to the repo.

### Step 3 — Enable GitHub Pages (to host the dashboard)

1. Repo → **Settings** → **Pages**.
2. Source: **Deploy from a branch**
3. Branch: **main** / **(root)**
4. Save.
5. After ~1 minute, your dashboard is live at `https://YOUR-USERNAME.github.io/cra-fund/`

### Step 4 — Run the first scan manually

GitHub Actions runs the scan on schedule (weekdays at 14:30 UTC), but you can trigger it manually for the first time:

1. Repo → **Actions** tab.
2. If asked, click **I understand my workflows, enable them**.
3. Click **Daily market scan** in the left sidebar.
4. Click **Run workflow** dropdown → **Run workflow** button.
5. Wait ~2-3 minutes. A green checkmark means success.
6. Check that `results/latest.json` now exists in your repo.

### Step 5 — Open the live dashboard

Visit `https://YOUR-USERNAME.github.io/cra-fund/` — you should see a small "Autonomous mode · data Xh ago" badge in the bottom right corner confirming the JSON loaded. The Daily Brief and Live Scanners sections will be populated with the latest data.

That's it. Every weekday at 14:30 UTC the scanner runs automatically and updates the data. You just open the page and read the brief.

---

## How the autonomous flow works

```
┌──────────────────────────────────────────────────────────────┐
│  GitHub Actions cron (14:30 UTC weekdays)                   │
│  └─→ runs scanner/scanner.js                                │
│       ├─→ Fetches from Finnhub API (your key from secrets)  │
│       ├─→ Scans 45 tickers for insider buys (last 30d)      │
│       ├─→ Scans 45 tickers for 4+ earnings beat streaks     │
│       ├─→ Scans 14 sector/benchmark ETFs                    │
│       ├─→ Pulls top 25 market news headlines                │
│       └─→ Writes results to results/latest.json              │
│            and results/archive-YYYY-MM-DD.json              │
│  └─→ Commits & pushes the JSON files to main                │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  GitHub Pages serves index.html + results/latest.json       │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  You open https://you.github.io/cra-fund/                   │
│  └─→ Page loads, fetches ./results/latest.json              │
│  └─→ Populates Daily Brief + Live Scanners with fresh data  │
│  └─→ Shows "Autonomous mode" badge                          │
└──────────────────────────────────────────────────────────────┘
```

---

## Customizing the universe

The scanner scans a hardcoded list of 45 tickers (the "CRA universe"). To add or remove names:

1. Edit `scanner/scanner.js` — the `UNIVERSE` array at the top.
2. Also edit `index.html` — search for `const UNIVERSE = [` and update the same list.
3. Commit and push. Next scan uses the new list.

Keep the list under ~80 tickers to stay safely within Finnhub's 60-calls-per-minute free tier. Each scan makes roughly 2 calls per ticker (insider + earnings), so 80 tickers ≈ 160 calls ≈ 3 minutes per full run.

## Customizing the schedule

`.github/workflows/daily-scan.yml` line:
```yaml
- cron: '30 14 * * 1-5'
```
This is in UTC. Format: `minute hour day-of-month month day-of-week`.
- `30 14 * * 1-5` = 14:30 UTC, Mon-Fri
- `0 13 * * 1-5` = 13:00 UTC, Mon-Fri (US market open during EDT)
- `0 6 * * 1-5` = 06:00 UTC, Mon-Fri (good for European pre-market)
- `0 6,18 * * 1-5` = twice daily, 06:00 and 18:00 UTC

Note: GitHub's cron is best-effort and can be delayed by up to ~1 hour during peak load. Not real-time, but reliably daily.

## Costs

- **Finnhub free tier:** 60 API calls per minute. The daily scan uses ~150 calls total over ~3 minutes — well within limits. Free.
- **GitHub Actions:** Free tier gives 2,000 minutes/month for public repos, 500 for private. Each scan takes ~3 minutes = ~60 minutes/month. Free.
- **GitHub Pages:** Free static hosting. Free.
- **Total:** $0/month.

## Privacy notes

- Your portfolio data (positions, watchlist, signals) lives **only in your browser's localStorage**. It is never sent to GitHub, the scanner, or anywhere else.
- The scanner writes only market-wide data to `results/latest.json` (insider clusters, earnings beats, sector quotes, public news). No personal data.
- Your Finnhub API key lives in GitHub Secrets (encrypted, never visible in logs) and only the scanner reads it. It's never written to any committed file.
- If you make the repo public, the JSON files are public too. That's fine — they only contain market data anyone could fetch themselves.

## Troubleshooting

**Scanner fails with "401 Unauthorized"**
→ The `FINNHUB_API_KEY` secret isn't set, or the key is invalid. Check Settings → Secrets and variables → Actions.

**Scanner fails with rate limit (429)**
→ Your Finnhub free tier was exhausted by other usage. Either wait 1 minute or upgrade. The scanner already throttles to 1 call/sec to stay under the limit, so this usually means the key is being used elsewhere too.

**Dashboard doesn't show "Autonomous mode" badge**
→ Either you haven't run the workflow yet (Step 4), or the JSON file path is wrong. Visit `https://you.github.io/cra-fund/results/latest.json` directly — if you see JSON, the dashboard should load it. If you see 404, the file isn't committed yet.

**Want twice-daily scans (morning + evening)?**
→ Change the cron line to `0 14,21 * * 1-5` (14:00 and 21:00 UTC = market open + close in EST).

**Want to scan a custom universe per industry?**
→ Run multiple workflows or modify the scanner to write multiple JSON files (e.g. `results/tech.json`, `results/energy.json`) and update the dashboard to read them.

---

## What this does NOT do

Things the autonomous version still won't give you, that no free tool can:

- **Real-time intraday data.** Finnhub free tier has end-of-day delayed data for many feeds. For live trading, you need a paid feed (Polygon $29/mo, IEX Cloud, Alpaca's paid tier).
- **Politician trades.** Finnhub does not have congressional trading data. To track Pelosi etc., use [capitoltrades.com](https://www.capitoltrades.com/trades) or [quiverquant.com](https://www.quiverquant.com/congresstrading/) manually, or pay Quiver Quantitative for API access (~$10-50/mo).
- **Sell-side analyst forecasts in detail.** Finnhub has consensus EPS but not full price targets / individual analyst notes. That's Bloomberg / FactSet territory ($24k+/year).
- **X / Twitter sentiment.** X charges $100-5000/month for API access. Not viable for personal use. Use [TweetDeck](https://tweetdeck.twitter.com/) lists manually.
- **A buy/sell recommendation.** This entire system surfaces information. The decisions are yours. No tool reliably predicts stocks.

## Alternative deployment platforms

If you don't want to use GitHub Actions:

- **Vercel + Vercel Cron:** Free tier includes scheduled functions. Slightly more complex setup but identical capability.
- **Netlify + Netlify Scheduled Functions:** Same idea.
- **Cloudflare Workers + Cron Triggers:** Free tier, very fast.
- **Self-hosted:** Run `cd scanner && node scanner.js` on a cron job on any always-on machine (Raspberry Pi works fine).
- **Lovable:** You can paste the HTML and ask Lovable to add a backend layer. Locks you into their platform but easier if you don't want to touch code.

The GitHub Actions path in this README is the simplest free option and what we recommend.

---

## File structure

```
cra-fund/
├── index.html                          ← The dashboard (open this)
├── README.md                           ← This file
├── results/
│   ├── latest.json                     ← Daily scan data (auto-generated)
│   └── archive-YYYY-MM-DD.json         ← Historical archives (auto-generated)
├── scanner/
│   ├── scanner.js                      ← Node script (runs in GH Actions)
│   └── package.json                    ← Scanner dependencies
└── .github/
    └── workflows/
        └── daily-scan.yml              ← Cron schedule
```

## Investment philosophy disclaimer

This tool is an aid to your own research and decision-making. Nothing in it constitutes investment advice. The opportunities section reflects research themes, not buy recommendations. The scanners surface data, they do not interpret it. You are responsible for your trades. Most retail traders lose money. Read the mandate page in the dashboard before using.
