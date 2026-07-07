/* CRA MARKET RISK RADAR ADD-ON — whole-market risk feed (not just the watchlist).
   Purely additive: fetches market-risk-latest.json (refreshed by the daily scan)
   and injects a "Market risk radar" card at the top of the Risk & alerts section. */
(function () {
  function sevBadge(sev) {
    var map = {
      high: ['HIGH', 'var(--neg)', 'var(--neg-bg)'],
      med:  ['MEDIUM', 'var(--warn)', 'var(--warn-bg)'],
      low:  ['WATCH', 'var(--pos)', 'var(--pos-bg)']
    };
    var m = map[sev] || map.low;
    return '<span style="display:inline-block;background:' + m[2] + ';color:' + m[1] +
      ';border-radius:9999px;padding:2px 10px;font-size:10px;letter-spacing:1.5px;font-weight:600;white-space:nowrap">' + m[0] + '</span>';
  }
  function render(data) {
    var sec = document.getElementById('s-riskalerts');
    if (!sec || document.getElementById('mr-card')) return;
    var card = document.createElement('div');
    card.className = 'card';
    card.id = 'mr-card';
    var rows = (data.items || []).map(function (it) {
      return '<div style="display:flex;gap:14px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--border)">' +
        '<div style="padding-top:2px">' + sevBadge(it.sev) + '</div>' +
        '<div><div style="font-weight:600;color:var(--text)">' + it.title + '</div>' +
        '<div style="font-size:12.5px;color:var(--text-sec);line-height:1.55;margin-top:2px">' + it.detail + '</div></div></div>';
    }).join('');
    card.innerHTML = '<div class="card-h">Market risk radar</div>' +
      '<div class="card-sub">Whole-market conditions, refreshed with the daily scan (as of ' + (data.asof || '—') + '). Independent of your positions & watchlist.</div>' +
      rows;
    // insert as first card in the section (right after the section header block)
    var firstCard = sec.querySelector('.card');
    if (firstCard) sec.insertBefore(card, firstCard); else sec.appendChild(card);
    // red badge on the nav item when any HIGH risk is active
    var highs = (data.items || []).filter(function (i) { return i.sev === 'high'; }).length;
    var badge = document.getElementById('ra-badge');
    if (badge && highs > 0) { badge.style.display = 'inline-block'; badge.textContent = highs; }
  }
  function boot(tries) {
    if (!document.getElementById('s-riskalerts')) {
      if (tries < 40) return setTimeout(function () { boot(tries + 1); }, 250);
      return;
    }
    fetch('market-risk-latest.json?cb=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (j && j.items) render(j); })
      .catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { boot(0); });
  else boot(0);
})();
