/* CRA RISK & ALERTS ADD-ON — portfolio risk, watchlist buy triggers, earnings-next-7-days.
   Purely additive; reads existing localStorage (cra.positions / cra.watchlist / cra.signals / cra.apikey). */
(function () {
  function $(id){ return document.getElementById(id); }
  if (document.getElementById('s-riskalerts')) return;
  var LS = window.localStorage;
  function gp(){ try{ return JSON.parse(LS.getItem('cra.positions')||'[]'); }catch(e){ return []; } }
  function gw(){ try{ return JSON.parse(LS.getItem('cra.watchlist')||'[]'); }catch(e){ return []; } }
  function gs(){ try{ return JSON.parse(LS.getItem('cra.signals')||'[]'); }catch(e){ return []; } }
  function apikey(){ var k=LS.getItem('cra.apikey')||''; try{ k=JSON.parse(k); }catch(e){} return (''+(k||'')).replace(/^"|"$/g,'').trim(); }
  function acct(){ return parseFloat(LS.getItem('cra.risk.acct'))||4000; }
  function money(v){ return '$'+(Math.round(v)).toLocaleString(); }
  var SECT={AAPL:'Tech',MSFT:'Tech',NVDA:'Tech',AVGO:'Tech',AMD:'Tech',TSM:'Tech',MU:'Tech',ASML:'Tech',ADBE:'Tech',CRM:'Tech',ORCL:'Tech',PANW:'Tech',CRWD:'Tech',IONQ:'Tech',RGTI:'Tech',QBTS:'Tech',
    GOOGL:'Comm',META:'Comm',NFLX:'Comm',AMZN:'Cons Disc',HD:'Cons Disc',NKE:'Cons Disc',M:'Cons Disc',
    JPM:'Financials',BAC:'Financials',GS:'Financials',BX:'Financials',V:'Financials',MA:'Financials',
    XOM:'Energy',CVX:'Energy',COP:'Energy',EOG:'Energy',SLB:'Energy',HAL:'Energy',
    VST:'Utilities',CEG:'Utilities',NEE:'Utilities',OKLO:'Nuclear',SMR:'Nuclear',CCJ:'Nuclear',
    ETN:'Industrials',GEV:'Industrials',GE:'Industrials',CAT:'Industrials',HON:'Industrials',DE:'Industrials',RTX:'Industrials',LMT:'Industrials',RKLB:'Space',
    LLY:'Healthcare',UNH:'Healthcare',ABBV:'Healthcare',DGX:'Healthcare',
    COST:'Staples',WMT:'Staples',PG:'Staples',KO:'Staples',CPB:'Staples',FCX:'Materials',NEM:'Materials',FSLR:'Renewables'};
  function sect(t){ return SECT[(t||'').toUpperCase()]||'Other'; }

  // ---- section + nav ----
  var anchor = document.getElementById('s-sizer') || document.querySelector('.section');
  if (!anchor) return;
  var sec=document.createElement('div'); sec.className='section'; sec.id='s-riskalerts';
  sec.innerHTML=
    '<div class="card"><div class="card-h">Risk &amp; alerts</div>'+
    '<div class="card-sub">Portfolio risk, watchlist buy triggers and upcoming earnings — pulled live from your book and Finnhub.</div>'+
    '<div class="f2" style="max-width:520px"><div><label class="lbl">Account size ($)</label><input type="number" id="ra-acct" step="100"></div>'+
    '<div style="display:flex;align-items:flex-end"><button type="button" id="ra-refresh">Refresh data</button></div></div>'+
    '<div id="ra-msg" class="muted" style="margin-top:8px"></div></div>'+
    '<div class="card"><div class="card-h">Portfolio risk</div><div id="ra-port"></div></div>'+
    '<div class="card"><div class="card-h">Watchlist — buy triggers</div><div class="card-sub">Sorted by closest to your target-buy. Green = at or below your buy level.</div><div id="ra-watch"><div class="muted">Click "Refresh data".</div></div></div>'+
    '<div class="card"><div class="card-h">Earnings — next 7 days</div><div class="card-sub">Any position / watchlist / signalled name reporting soon. Don\'t get caught holding into a print.</div><div id="ra-earn"><div class="muted">Click "Refresh data".</div></div></div>';
  anchor.parentNode.appendChild(sec);
  var sizerNav=document.querySelector('.nav-item[data-section="sizer"]');
  var nav=document.createElement('div'); nav.className='nav-item'; nav.setAttribute('data-section','riskalerts');
  nav.innerHTML='<span class="nav-icon">⚠</span> Risk &amp; alerts <span id="ra-badge" style="display:none;margin-left:6px;background:var(--neg);color:#fff;border-radius:10px;padding:0 7px;font-size:11px"></span>';
  var chartsNav=document.querySelector('.nav-item[data-section="charts"]');
  var ref=chartsNav||sizerNav;
  if(ref) ref.parentNode.insertBefore(nav, ref.nextSibling);
  function show(){
    var all=document.querySelectorAll('.section'); for(var i=0;i<all.length;i++) all[i].classList.remove('active');
    sec.classList.add('active');
    var it=document.querySelectorAll('.nav-item'); for(var j=0;j<it.length;j++) it[j].classList.toggle('active', it[j].getAttribute('data-section')==='riskalerts');
    setTimeout(function(){ var t=$('page-title'); if(t) t.textContent='Risk & alerts'; },0);
    window.scrollTo(0,0);
    if(!$('ra-acct').value) $('ra-acct').value=acct();
    renderPort(); refresh();
  }
  nav.addEventListener('click', show);
  $('ra-acct').addEventListener('change', function(){ LS.setItem('cra.risk.acct', $('ra-acct').value||'4000'); renderPort(); });

  function quote(sym){ var k=apikey(); if(!k) return Promise.resolve(null);
    return fetch('https://finnhub.io/api/v1/quote?symbol='+encodeURIComponent(sym)+'&token='+k).then(function(r){return r.json();}).catch(function(){return null;}); }

  // ---- portfolio risk ----
  function renderPort(){
    var pos=gp(), A=acct(); var el=$('ra-port');
    if(!pos.length){ el.innerHTML='<div class="muted">No open positions yet. Add positions in the Positions tab to see exposure, sector concentration and cash. (This is where the 1–2% rule and over-concentration checks live.)</div>'; return; }
    var invested=0, value=0, bySec={}, riskTotal=0;
    pos.forEach(function(p){ var px=(p.current&&p.current>0)?p.current:p.entry; var v=(p.shares||0)*px; invested+=(p.shares||0)*p.entry; value+=v; var s=sect(p.ticker); bySec[s]=(bySec[s]||0)+v; if(p.stop&&p.entry){ riskTotal+=Math.abs(p.entry-p.stop)*(p.shares||0); } });
    var cashPct=Math.max(0,(A-value)/A*100);
    var rows=pos.slice().sort(function(a,b){return ((b.shares||0)*((b.current||b.entry)))-((a.shares||0)*((a.current||a.entry)));}).map(function(p){
      var px=(p.current&&p.current>0)?p.current:p.entry; var v=(p.shares||0)*px; var w=v/A*100;
      var rk=(p.stop&&p.entry)?Math.abs(p.entry-p.stop)*(p.shares||0):null;
      var warn=w>20?' style="color:var(--neg);font-weight:600"':'';
      return '<tr><td>'+p.ticker+'</td><td>'+sect(p.ticker)+'</td><td class="ta-r">'+money(v)+'</td><td class="ta-r"'+warn+'>'+w.toFixed(1)+'%</td><td class="ta-r">'+(rk!=null?money(rk)+' ('+(rk/A*100).toFixed(1)+'%)':'set stop')+'</td></tr>';
    }).join('');
    var secRows=Object.keys(bySec).sort(function(a,b){return bySec[b]-bySec[a];}).map(function(s){var w=bySec[s]/A*100;var warn=w>40?' style="color:var(--neg);font-weight:600"':'';return '<span'+warn+'>'+s+' '+w.toFixed(0)+'%</span>';}).join(' · ');
    var flags=[]; if(cashPct<10) flags.push('Cash below 10% — thin buffer');
    pos.forEach(function(p){var px=(p.current&&p.current>0)?p.current:p.entry;if((p.shares||0)*px/A>20)flags.push(p.ticker+' is >20% of book');});
    Object.keys(bySec).forEach(function(s){if(bySec[s]/A*100>40)flags.push(s+' sector >40% of book');});
    if(riskTotal/A*100>6) flags.push('Total open risk '+(riskTotal/A*100).toFixed(1)+'% — above ~6% guideline');
    el.innerHTML='<div style="display:flex;flex-wrap:wrap;gap:18px;margin-bottom:12px">'+
      '<div><div class="lbl">Invested</div><div style="font-size:18px;font-weight:600">'+money(value)+'</div></div>'+
      '<div><div class="lbl">Cash</div><div style="font-size:18px;font-weight:600">'+cashPct.toFixed(0)+'%</div></div>'+
      '<div><div class="lbl">Open risk ($/%)</div><div style="font-size:18px;font-weight:600">'+(riskTotal>0?money(riskTotal)+' / '+(riskTotal/A*100).toFixed(1)+'%':'—')+'</div></div>'+
      '<div><div class="lbl">Positions</div><div style="font-size:18px;font-weight:600">'+pos.length+'</div></div></div>'+
      '<table class="t"><thead><tr><th>Ticker</th><th>Sector</th><th class="ta-r">Value</th><th class="ta-r">% of book</th><th class="ta-r">$ at risk</th></tr></thead><tbody>'+rows+'</tbody></table>'+
      '<div style="margin-top:10px;font-size:12.5px;color:var(--text-tert)">Sector mix: '+secRows+'</div>'+
      (flags.length?'<div class="notice notice-warn" style="margin-top:10px">⚠ '+flags.join(' · ')+'</div>':'<div class="notice" style="margin-top:10px">Concentration &amp; risk within limits.</div>')+
      '<div class="muted" style="font-size:11.5px;margin-top:8px">Per-trade $-at-risk uses the stop saved with each position (add a "stop" field when logging a position).</div>';
  }

  // ---- watchlist buy triggers + earnings ----
  function refresh(){
    var wl=gw(); var wEl=$('ra-watch'); var msg=$('ra-msg');
    if(!apikey()){ wEl.innerHTML='<div class="notice notice-warn">No Finnhub key set — add it in Settings to load live prices.</div>'; $('ra-earn').innerHTML='<div class="muted">Needs Finnhub key.</div>'; return; }
    if(!wl.length){ wEl.innerHTML='<div class="muted">Watchlist is empty.</div>'; }
    msg.textContent='Loading live quotes…';
    Promise.all(wl.map(function(w){ return quote(w.ticker).then(function(q){ return {w:w, c:(q&&q.c)||0}; }); })).then(function(rows){
      var triggered=0;
      rows.forEach(function(r){ if(r.c && r.w.buy && r.c<=r.w.buy) triggered++; });
      rows.sort(function(a,b){ var da=a.w.buy?(a.c-a.w.buy)/a.w.buy:9; var db=b.w.buy?(b.c-b.w.buy)/b.w.buy:9; return da-db; });
      var html='<table class="t"><thead><tr><th>Ticker</th><th class="ta-r">Conv</th><th class="ta-r">Price</th><th class="ta-r">Buy ≤</th><th class="ta-r">To buy</th><th class="ta-r">Sell ≥</th></tr></thead><tbody>'+
        rows.map(function(r){ var c=r.c, b=r.w.buy, s=r.w.sell, conv=r.w.conv||'';
          var toBuy = (c&&b)?((c-b)/b*100):null;
          var inBuy = c&&b&&c<=b;
          var tag = inBuy? '<span style="color:var(--pos);font-weight:700">BUY ZONE</span>' : (toBuy!=null? (toBuy>0?'+':'')+toBuy.toFixed(1)+'%' : '—');
          var rowStyle = inBuy? ' style="background:var(--pos-bg)"':'';
          return '<tr'+rowStyle+'><td>'+r.w.ticker+'</td><td class="ta-r">'+conv+'</td><td class="ta-r">'+(c?('$'+c.toFixed(2)):'—')+'</td><td class="ta-r">'+(b?('$'+b):'—')+'</td><td class="ta-r">'+tag+'</td><td class="ta-r">'+(s?('$'+s):'—')+'</td></tr>';
        }).join('')+'</tbody></table>';
      wEl.innerHTML=html;
      var badge=$('ra-badge'); if(triggered>0){ badge.textContent=triggered; badge.style.display='inline-block'; } else { badge.style.display='none'; }
      msg.textContent='Updated '+new Date().toLocaleTimeString();
    });
    var names={}; gp().forEach(function(p){names[(p.ticker||'').toUpperCase()]=1;}); gw().forEach(function(w){names[(w.ticker||'').toUpperCase()]=1;}); gs().forEach(function(s){names[(s.ticker||'').toUpperCase()]=1;});
    var set=Object.keys(names).filter(Boolean);
    var today=new Date(); var to=new Date(Date.now()+7*864e5);
    function d(x){return x.toISOString().slice(0,10);}
    fetch('https://finnhub.io/api/v1/calendar/earnings?from='+d(today)+'&to='+d(to)+'&token='+apikey()).then(function(r){return r.json();}).then(function(j){
      var cal=(j&&j.earningsCalendar)||[]; var hits=cal.filter(function(e){return set.indexOf((e.symbol||'').toUpperCase())!==-1;});
      var eEl=$('ra-earn');
      if(!hits.length){ eEl.innerHTML='<div class="muted">No tracked names report in the next 7 days (or the calendar isn\'t available on the free tier).</div>'; return; }
      hits.sort(function(a,b){return (a.date||'').localeCompare(b.date||'');});
      eEl.innerHTML='<table class="t"><thead><tr><th>Ticker</th><th>Date</th><th>Hour</th><th class="ta-r">EPS est.</th></tr></thead><tbody>'+
        hits.map(function(e){return '<tr><td>'+e.symbol+'</td><td>'+(e.date||'')+'</td><td>'+(e.hour||'')+'</td><td class="ta-r">'+(e.epsEstimate!=null?e.epsEstimate:'—')+'</td></tr>';}).join('')+'</tbody></table>';
    }).catch(function(){ $('ra-earn').innerHTML='<div class="muted">Earnings calendar unavailable (free-tier limit).</div>'; });
  }
  $('ra-refresh').addEventListener('click', refresh);

  setTimeout(function(){ if(apikey()){ try{ var wl=gw(); Promise.all(wl.map(function(w){return quote(w.ticker).then(function(q){return {b:w.buy,c:(q&&q.c)||0};});})).then(function(rows){var t=rows.filter(function(r){return r.c&&r.b&&r.c<=r.b;}).length;var badge=$('ra-badge');if(t>0){badge.textContent=t;badge.style.display='inline-block';}});}catch(e){} } }, 1500);
})();
