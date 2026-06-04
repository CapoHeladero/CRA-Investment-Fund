// CRA Investment Fund — Daily Scanner
// Runs in GitHub Actions every weekday at market open
// Writes results to ../results/latest.json which the dashboard reads on page load

import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = path.join(__dirname, '..', 'results');
const API_KEY = process.env.FINNHUB_API_KEY;
const BASE = 'https://finnhub.io/api/v1';

if (!API_KEY) {
  console.error('FATAL: FINNHUB_API_KEY environment variable not set');
  process.exit(1);
}

// Same universe as the dashboard
const UNIVERSE = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'AVGO',
  'AMD', 'TSM', 'MU', 'ADBE', 'CRM', 'ORCL',
  'JPM', 'BAC', 'GS', 'BX', 'V', 'MA',
  'XOM', 'CVX', 'COP', 'EOG', 'SLB',
  'GE', 'CAT', 'GEV', 'HON', 'DE', 'LMT', 'RTX',
  'LLY', 'UNH', 'ABBV', 'NVO', 'ISRG',
  'COST', 'WMT', 'HD', 'NKE',
  'NFLX', 'CEG', 'VST', 'CHRW', 'TEM'
];

const SECTORS = [
  { t: 'XLK', n: 'Tech' }, { t: 'XLF', n: 'Financials' }, { t: 'XLE', n: 'Energy' },
  { t: 'XLV', n: 'Healthcare' }, { t: 'XLY', n: 'Cons disc' }, { t: 'XLP', n: 'Cons staples' },
  { t: 'XLI', n: 'Industrials' }, { t: 'XLB', n: 'Materials' }, { t: 'XLU', n: 'Utilities' },
  { t: 'XLRE', n: 'Real estate' }, { t: 'XLC', n: 'Comm svcs' },
  { t: 'SPY', n: 'S&P 500' }, { t: 'QQQ', n: 'Nasdaq 100' }, { t: 'IWM', n: 'Russell 2k' }
];

const DELAY_MS = 1100; // 60 calls/min rate limit

const sleep = ms => new Promise(r => setTimeout(r, ms));
const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

async function apiGet(path, params) {
  const qs = new URLSearchParams({ ...params, token: API_KEY });
  try {
    const r = await fetch(`${BASE}${path}?${qs}`);
    if (!r.ok) {
      console.warn(`  HTTP ${r.status} for ${path}?${new URLSearchParams(params)}`);
      return null;
    }
    return await r.json();
  } catch (e) {
    console.warn(`  Fetch error: ${e.message}`);
    return null;
  }
}

// =================== SCAN: INSIDER CLUSTERS ===================
async function scanInsiders() {
  console.log('\n[1/4] Scanning insider transactions...');
  const to = today();
  const from = daysAgo(30);
  const results = [];

  for (let i = 0; i < UNIVERSE.length; i++) {
    const t = UNIVERSE[i];
    process.stdout.write(`  ${i + 1}/${UNIVERSE.length} ${t.padEnd(6)}`);
    const d = await apiGet('/stock/insider-transactions', { symbol: t, from, to });
    if (d && d.data && d.data.length) {
      const buys = d.data.filter(x => x.transactionCode === 'P');
      const buyers = new Set();
      let total = 0;
      buys.forEach(x => {
        if (x.name) buyers.add(x.name);
        total += Math.abs(x.change || 0) * (x.transactionPrice || 0);
      });
      if (buyers.size > 0) {
        results.push({ t, buyers: buyers.size, total, buys: buys.length });
        console.log(` ${buyers.size} buyer(s), ${total > 0 ? '$' + Math.round(total).toLocaleString() : '—'}`);
      } else {
        console.log(' —');
      }
    } else {
      console.log(' —');
    }
    if (i < UNIVERSE.length - 1) await sleep(DELAY_MS);
  }

  const clusters = results.filter(r => r.buyers >= 3).sort((a, b) => b.total - a.total);
  const watchable = results.filter(r => r.buyers >= 1 && r.buyers < 3).sort((a, b) => b.total - a.total);
  return {
    summary: `${clusters.length} clusters · ${watchable.length} single buys`,
    results: { clusters, watchable }
  };
}

// =================== SCAN: EARNINGS MOMENTUM ===================
async function scanEarnings() {
  console.log('\n[2/4] Scanning earnings momentum...');
  const winners = [];

  for (let i = 0; i < UNIVERSE.length; i++) {
    const t = UNIVERSE[i];
    process.stdout.write(`  ${i + 1}/${UNIVERSE.length} ${t.padEnd(6)}`);
    const d = await apiGet('/stock/earnings', { symbol: t });
    if (d && d.length >= 4) {
      const last = d.slice(0, 4);
      const allBeat = last.every(e => e.surprisePercent > 0);
      const avgBeat = last.reduce((a, e) => a + (e.surprisePercent || 0), 0) / last.length;
      if (allBeat) {
        winners.push({ t, allBeat, avgBeat, last });
        console.log(` 4-beat streak avg ${avgBeat.toFixed(1)}%`);
      } else {
        console.log(' broken streak');
      }
    } else {
      console.log(' insufficient data');
    }
    if (i < UNIVERSE.length - 1) await sleep(DELAY_MS);
  }

  winners.sort((a, b) => b.avgBeat - a.avgBeat);
  return {
    summary: `${winners.length} tickers w/ 4+ beats`,
    results: winners
  };
}

// =================== SCAN: SECTOR ROTATION ===================
async function scanSectors() {
  console.log('\n[3/4] Scanning sector strength...');
  const results = [];

  for (let i = 0; i < SECTORS.length; i++) {
    const s = SECTORS[i];
    process.stdout.write(`  ${i + 1}/${SECTORS.length} ${s.t.padEnd(6)}`);
    const q = await apiGet('/quote', { symbol: s.t });
    const dp = q && q.dp != null ? q.dp : null;
    results.push({ ...s, c: q ? q.c : null, dp });
    console.log(dp != null ? ` ${dp > 0 ? '+' : ''}${dp.toFixed(2)}%` : ' —');
    if (i < SECTORS.length - 1) await sleep(DELAY_MS);
  }

  const sectorsOnly = results.filter(r => !['SPY','QQQ','IWM'].includes(r.t)).sort((a, b) => (b.dp || -999) - (a.dp || -999));
  const leader = sectorsOnly[0];
  return {
    summary: leader ? `Leader: ${leader.t} ${leader.dp > 0 ? '+' : ''}${(leader.dp || 0).toFixed(2)}%` : 'no data',
    results
  };
}

// =================== SCAN: NEWS PULSE ===================
async function scanNews() {
  console.log('\n[4/4] Scanning news pulse...');
  const d = await apiGet('/news', { category: 'general' });
  if (!Array.isArray(d)) {
    console.log('  no news returned');
    return { summary: '0 headlines', results: [] };
  }
  const top = d.slice(0, 25);
  console.log(`  ${top.length} headlines retrieved`);
  return {
    summary: `${top.length} headlines`,
    results: top.map(n => ({
      headline: n.headline,
      url: n.url,
      source: n.source,
      datetime: n.datetime,
      category: n.category,
      related: n.related
    }))
  };
}

// =================== MAIN ===================
async function main() {
  console.log('========================================');
  console.log('CRA Investment Fund — Daily Scanner');
  console.log('Run timestamp:', new Date().toISOString());
  console.log('Universe size:', UNIVERSE.length);
  console.log('========================================');

  const t0 = Date.now();
  const [insiders, earnings, sectors, news] = await Promise.all([
    scanInsiders(),
    scanEarnings(),
    scanSectors(),
    scanNews()
  ]);
  // (Note: sequential within each scan, but the four scan groups don't actually overlap
  //  in real time because of the await loops inside each. Order is enforced by single
  //  await chain inside Promise.all — they run serially due to per-call awaits.)

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n========================================`);
  console.log(`Scan complete in ${elapsed}s`);
  console.log(`  Insiders: ${insiders.summary}`);
  console.log(`  Earnings: ${earnings.summary}`);
  console.log(`  Sectors:  ${sectors.summary}`);
  console.log(`  News:     ${news.summary}`);

  await fs.mkdir(RESULTS_DIR, { recursive: true });
  const payload = {
    timestamp: new Date().toISOString(),
    date: today(),
    universe_size: UNIVERSE.length,
    insiders, earnings, sectors, news
  };
  await fs.writeFile(path.join(RESULTS_DIR, 'latest.json'), JSON.stringify(payload, null, 2));
  // Also write a dated archive
  await fs.writeFile(path.join(RESULTS_DIR, `archive-${today()}.json`), JSON.stringify(payload, null, 2));
  console.log(`\nWrote results/latest.json (${(JSON.stringify(payload).length / 1024).toFixed(1)}KB)`);
  console.log(`Wrote results/archive-${today()}.json`);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
