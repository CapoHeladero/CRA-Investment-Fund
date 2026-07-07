/* CRA AUTO-SUGGEST ADD-ON — type a ticker, get everything filled in.
   Works on: Position sizer, Signal log, Watchlist add form.
   Data: watchlist-dossiers-latest.json (primary) + opportunities-latest.json (fallback).
   Purely additive; no existing behavior changes. */
(function () {
  var DOSS = null, OPPS = null, loading = null;

  function load() {
    if (loading) return loading;
    loading = Promise.all([
      fetch('watchlist-dossiers-latest.json?cb=' + Date.now(), { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      fetch('opportunities-latest.json?cb=' + Date.now(), { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
    ]).then(function (res) {
      DOSS = (res[0] && res[0].dossiers) || {};
      OPPS = res[1] || [];
    });
    return loading;
  }

  function lookup(t) {
    t = (t || '').trim().toUpperCase();
    if (!t) return null;
    var d = DOSS && DOSS[t];
    if (d) return {
      t: t, n: d.n || '', theme: d.theme || '', conv: d.conv || 3,
      entry: d.buy, stop: d.stop, target: d.sell, price: d.p,
      thesis: d.thesis || d.why || '', inv: d.inv || '', rating: (d.why || '').indexOf('Strong Buy') >= 0 ? 'Strong Buy' : ((d.why || '').indexOf('Buy') >= 0 ? 'Buy' : ''),
      src: 'dossier'
    };
    var o = null;
    if (OPPS) for (var i = 0; i < OPPS.length; i++) if (OPPS[i].t === t) { o = OPPS[i]; break; }
    if (o) return {
      t: t, n: o.n || '', theme: o.theme || '', conv: 3,
      entry: o.entry, stop: o.stop, target: o.target, price: null,
      thesis: (o.bull && o.bull[0]) || o.why || '', inv: o.inv || '', rating: o.a || '',
      src: 'opportunities book'
    };
    return null;
  }

  function hint(afterEl, id, html, ok) {
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.className = 'muted';
      el.style.cssText = 'margin-top:6px;font-size:11.5px;';
      afterEl.parentNode.appendChild(el);
    }
    el.innerHTML = html;
    el.style.color = ok ? 'var(--brass-light)' : 'var(--text-tert)';
  }

  function debounce(fn, ms) {
    var to; return function () { var a = arguments, c = this; clearTimeout(to); to = setTimeout(function () { fn.apply(c, a); }, ms); };
  }

  function setVal(id, v) { var el = document.getElementById(id); if (el && v != null && v !== '') el.value = v; }

  /* ---------- Position sizer: inject a ticker field that fills everything ---------- */
  function armSizer() {
    var acctInput = document.getElementById('ps-acct');
    if (!acctInput || document.getElementById('ps-tkr')) return;
    var grid = acctInput.closest('.f2') || acctInput.parentNode.parentNode;
    var wrap = document.createElement('div');
    wrap.innerHTML = '<label class="lbl">Ticker — type to auto-fill</label><input type="text" id="ps-tkr" placeholder="e.g. NVDA" style="text-transform:uppercase;">';
    grid.insertBefore(wrap, grid.firstChild);
    var inp = wrap.querySelector('#ps-tkr');
    inp.addEventListener('input', debounce(function () {
      var t = inp.value.trim().toUpperCase();
      if (t.length < 2) return;
      load().then(function () {
        var m = lookup(t);
        if (!m) { hint(inp, 'ps-auto-msg', 'No research on ' + t + ' yet — it joins the book after the next daily scan, or fill levels manually.', false); return; }
        var acct = parseFloat(localStorage.getItem('cra.risk.acct')) || parseFloat(acctInput.value) || 10000;
        setVal('ps-acct', acct); setVal('ps-risk', 1.5);
        setVal('ps-entry', m.entry); setVal('ps-stop', m.stop); setVal('ps-target', m.target);
        try { Sizer.run(); } catch (e) {}
        hint(inp, 'ps-auto-msg', '✓ ' + t + (m.n ? ' — ' + m.n : '') + ' · entry/stop/target loaded from the ' + m.src + (m.rating ? ' (' + m.rating + ')' : ''), true);
      });
    }, 350));
  }

  /* ---------- Signal log: ticker fills direction, strength, note ---------- */
  function armSignals() {
    var inp = document.getElementById('sig-tick');
    if (!inp || inp.dataset.craAuto) return;
    inp.dataset.craAuto = '1';
    inp.addEventListener('input', debounce(function () {
      var t = inp.value.trim().toUpperCase();
      if (t.length < 2) return;
      load().then(function () {
        var m = lookup(t);
        if (!m) { hint(inp, 'sig-auto-msg', 'No research dossier for ' + t + ' — log your own read.', false); return; }
        var dir = document.getElementById('sig-dir');
        if (dir) dir.value = /Buy/.test(m.rating) ? 'bull' : 'neut';
        setVal('sig-str', Math.max(1, Math.min(5, m.conv || 3)));
        var src = document.getElementById('sig-src');
        if (src && src.selectedIndex === 0) src.value = 'Analyst note';
        var note = document.getElementById('sig-note');
        if (note && !note.value.trim()) {
          note.value = (m.thesis ? m.thesis + ' ' : '') +
            (m.entry ? '[Research levels: entry $' + m.entry + ' · stop $' + m.stop + ' · target $' + m.target + ']' : '');
        }
        hint(inp, 'sig-auto-msg', '✓ ' + t + ' auto-filled from the ' + m.src + ' (conviction ' + (m.conv || 3) + '/5). Edit anything before logging.', true);
      });
    }, 350));
  }

  /* ---------- Watchlist add form: ticker fills conviction, buy, sell, thesis ---------- */
  function armWatchlist() {
    var inp = document.getElementById('w-tick');
    if (!inp || inp.dataset.craAuto) return;
    inp.dataset.craAuto = '1';
    inp.addEventListener('input', debounce(function () {
      var t = inp.value.trim().toUpperCase();
      if (t.length < 2) return;
      load().then(function () {
        var m = lookup(t);
        if (!m) { hint(inp, 'w-auto-msg', 'No research dossier for ' + t + ' yet — set your own levels.', false); return; }
        setVal('w-conv', m.conv || 3);
        setVal('w-buy', m.entry); setVal('w-sell', m.target);
        var note = document.getElementById('w-note');
        if (note && !note.value.trim()) note.value = (m.thesis || '') + (m.inv ? ' Invalidation: ' + m.inv : '');
        hint(inp, 'w-auto-msg', '✓ ' + t + (m.n ? ' — ' + m.n : '') + ' · levels + thesis from the ' + m.src, true);
      });
    }, 350));
  }

  function boot(tries) {
    var ready = document.getElementById('ps-acct') && document.getElementById('sig-tick') && document.getElementById('w-tick');
    if (!ready && tries < 40) return setTimeout(function () { boot(tries + 1); }, 250);
    try { armSizer(); armSignals(); armWatchlist(); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { boot(0); });
  else boot(0);
})();
