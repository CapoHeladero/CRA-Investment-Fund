/* CRA WATCHLIST IDEAS + DOSSIERS + AUTO-SUGGEST  (v2)
   (1) Daily ideas panel — now full dossier cards (why-now, bull, bear, verify, invalidation,
       entry/stop/target + live fundamentals), matching the Opportunities book.
   (2) Saved-watchlist enrichment — each saved ticker gets a collapsible daily dossier
       (fundamental + technical) pulled from watchlist-dossiers-latest.json.
   (3) Auto-suggest — type ANY ticker; computes levels AND a real fundamental thesis
       from the live Finnhub quote + metrics (no more "ask the analyst"). */
(function(){
  function num(v){ return Math.round(v*100)/100; }
  function esc(s){ return (''+(s==null?'':s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // ---------- shared rich-card renderer (reuses Opportunities CSS) ----------
  function dossierCard(x, opts){
    opts=opts||{};
    var conv=x.conv||3;
    var stars='★'.repeat(conv)+'<span style="color:var(--text-tert);">'+'★'.repeat(5-conv)+'</span>';
    var addBtn = opts.addIndex!=null
      ? '<button class="btn-sec btn-sm wl-add" data-i="'+opts.addIndex+'">+ Add</button>' : '';
    var levels='<div class="opp-pos-info">'+
        '<span class="bdg bdg-info">'+esc(x.type||'Setup')+'</span>'+
        '<span class="bdg bdg-brass">Conv: '+conv+'/5</span>'+
        '<span class="bdg bdg-brass">Buy $'+x.buy+'</span>'+
        '<span class="bdg bdg-brass">Stop $'+x.stop+'</span>'+
        '<span class="bdg bdg-brass">Sell $'+x.sell+'</span></div>';
    var bull=(x.bull||[]).map(function(b){return '<li>'+esc(b)+'</li>';}).join('');
    var bear=(x.bear||[]).map(function(b){return '<li>'+esc(b)+'</li>';}).join('');
    var ver =(x.v||[]).map(function(b){return '<li>'+esc(b)+'</li>';}).join('');
    return ''+
      '<div class="opp-card">'+
        '<div class="opp-card-top"><div><span class="opp-ticker">'+esc(x.t)+'</span>'+
          '<span class="opp-name">'+esc(x.n||'')+'</span> <span style="color:var(--brass);font-size:12px;">'+stars+'</span></div>'+addBtn+'</div>'+
        levels+
        '<div class="opp-why"><span class="opp-why-label">Why now</span> '+esc(x.why||x.thesis||'')+'</div>'+
        '<div class="opp-split">'+
          '<div class="opp-block opp-block-bull"><div class="opp-block-h">Bull case</div><ul>'+bull+'</ul></div>'+
          '<div class="opp-block opp-block-bear"><div class="opp-block-h">Bear case · risks</div><ul>'+bear+'</ul></div>'+
        '</div>'+
        '<div class="opp-verify"><div class="opp-verify-h">Verify before entry</div><ul>'+ver+'</ul></div>'+
        (x.inv?'<div class="opp-invalidator"><span class="opp-invalidator-label">Invalidation trigger</span> '+esc(x.inv)+'</div>':'')+
      '</div>';
  }

  // ---------- (1) ideas panel ----------
  function renderIdeas(){
    var sec=document.getElementById('s-watchlist'); if(!sec) return;
    var board=document.getElementById('wl-ideas-board');
    if(!board){ board=document.createElement('div'); board.id='wl-ideas-board'; board.className='card'; sec.insertBefore(board, sec.firstChild); }
    board.innerHTML='<div class="card-h">Watchlist ideas</div><div class="muted">Loading…</div>';
    fetch('watchlist-ideas-latest.json?cb='+Date.now(),{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).then(function(j){
      if(!j||!j.ideas||!j.ideas.length){ board.innerHTML='<div class="card-h">Watchlist ideas</div><div class="muted">No ideas feed yet.</div>'; return; }
      window.__wlIdeas=j.ideas;
      var cards=j.ideas.map(function(x,i){ return dossierCard(x,{addIndex:i}); }).join('');
      board.innerHTML='<div class="card-h">Watchlist ideas <span class="muted" style="font-size:11px;">- full dossiers · '+esc(j.asof||'')+'</span></div>'+
        '<div class="card-sub">Each idea carries entry/stop/target, bull &amp; bear case, live fundamentals and an Eden deep-dive check. One click adds it to your watchlist. Re-check live before acting.</div>'+
        cards;
      board.querySelectorAll('.wl-add').forEach(function(btn){
        btn.addEventListener('click', function(){
          var x=window.__wlIdeas[parseInt(btn.getAttribute('data-i'))]; if(!x) return;
          fillForm(x.t, x.conv||3, x.buy, x.sell, x.thesis||x.why||'');
          clickAdd(); btn.textContent='Added ✓'; btn.disabled=true;
        });
      });
    }).catch(function(){ board.innerHTML='<div class="card-h">Watchlist ideas</div><div class="muted">Ideas feed unavailable.</div>'; });
  }

  // ---------- (2) saved-watchlist enrichment ----------
  function loadDossiers(){
    if(window.__wlDossP) return window.__wlDossP;
    window.__wlDossP=fetch('watchlist-dossiers-latest.json?cb='+Date.now(),{cache:'no-store'})
      .then(function(r){return r.ok?r.json():null;})
      .then(function(j){ window.__wlDoss=(j&&j.dossiers)||{}; window.__wlDossAsof=(j&&j.asof)||''; return window.__wlDoss; })
      .catch(function(){ window.__wlDoss={}; return {}; });
    return window.__wlDossP;
  }
  function augmentSaved(){
    var list=document.getElementById('w-list'); if(!list) return;
    loadDossiers().then(function(doss){
      list.querySelectorAll('.row-item').forEach(function(row){
        if(row.getAttribute('data-doss')) return;
        var tEl=row.querySelector('.row-ticker'); if(!tEl) return;
        var t=(tEl.textContent||'').trim().toUpperCase();
        var x=doss[t];
        row.setAttribute('data-doss','1');
        if(!x){
          var hint=document.createElement('div'); hint.className='muted'; hint.style.cssText='font-size:11px;margin-top:6px;';
          hint.innerHTML='No daily dossier for '+esc(t)+' yet — use ✨ Auto-suggest (live) for a fundamental+technical read.';
          row.appendChild(hint); return;
        }
        var det=document.createElement('details'); det.className='wl-doss'; det.style.cssText='margin-top:8px;';
        det.innerHTML='<summary style="cursor:pointer;color:var(--brass);font-size:12px;">▸ Daily dossier · '+esc(window.__wlDossAsof||'')+' · Buy $'+x.buy+' / Stop $'+x.stop+' / Sell $'+x.sell+'</summary>'+
          '<div style="margin-top:8px;">'+dossierCard(x,{})+'</div>';
        row.appendChild(det);
      });
    });
  }

  // ---------- helpers ----------
  function fillForm(t,conv,buy,sell,note){
    var set=function(id,v){ var el=document.getElementById(id); if(el){ el.value=v; el.dispatchEvent(new Event('input',{bubbles:true})); } };
    set('w-tick',t); set('w-conv',conv); set('w-buy',buy); set('w-sell',sell); set('w-note',note);
  }
  function clickAdd(){
    var b=[].slice.call(document.querySelectorAll('#s-watchlist button')).find(function(x){return /Add/i.test(x.textContent)&&(x.getAttribute('onclick')||'').indexOf('Watch.add')>=0;});
    if(b) b.click();
  }
  function patchWatchRender(){
    if(typeof Watch==='undefined' || !Watch || typeof Watch.render!=='function' || Watch.__wlPatched) return;
    var _r=Watch.render.bind(Watch);
    Watch.render=function(){ _r(); setTimeout(augmentSaved,30); };
    Watch.__wlPatched=true;
  }

  // ---------- (3) auto-suggest (now fundamental + technical) ----------
  function injectSuggest(){
    if(document.getElementById('wl-suggest-btn')) return;
    var addBtn=[].slice.call(document.querySelectorAll('#s-watchlist button')).find(function(x){return /Add/i.test(x.textContent)&&(x.getAttribute('onclick')||'').indexOf('Watch.add')>=0;});
    if(!addBtn) return;
    var b=document.createElement('button'); b.id='wl-suggest-btn'; b.type='button'; b.className='btn-sec'; b.style.marginLeft='8px'; b.textContent='✨ Auto-suggest (live)';
    addBtn.parentNode.insertBefore(b, addBtn.nextSibling);
    var msg=document.createElement('div'); msg.id='wl-suggest-msg'; msg.className='muted'; msg.style.cssText='font-size:11.5px;margin-top:6px'; addBtn.parentNode.appendChild(msg);
    b.addEventListener('click', suggest);
  }
  function suggest(){
    var t=(document.getElementById('w-tick').value||'').trim().toUpperCase();
    var msg=document.getElementById('wl-suggest-msg');
    if(!t){ msg.textContent='Type a ticker first.'; return; }
    var key=(function(){var k=localStorage.getItem('cra.apikey')||'';try{k=JSON.parse(k);}catch(e){}return (''+(k||'')).replace(/^"|"$/g,'').trim();})();
    if(!key){ msg.innerHTML='<span class="txt-neg">Add your Finnhub key in Settings to auto-suggest.</span>'; return; }
    msg.textContent='Computing '+t+' from live quote + fundamentals…';
    Promise.all([
      fetch('https://finnhub.io/api/v1/quote?symbol='+encodeURIComponent(t)+'&token='+key).then(function(r){return r.json();}).catch(function(){return null;}),
      fetch('https://finnhub.io/api/v1/stock/metric?symbol='+encodeURIComponent(t)+'&metric=all&token='+key).then(function(r){return r.json();}).catch(function(){return null;})
    ]).then(function(res){
      var q=res[0]||{}, m=(res[1]&&res[1].metric)||{};
      var price=q.c;
      if(!price){ msg.innerHTML='<span class="txt-neg">No live quote for '+t+' — check the ticker or your key.</span>'; return; }
      var hi=m['52WeekHigh']||price*1.2, lo=m['52WeekLow']||price*0.8;
      var pos=(price-lo)/((hi-lo)||1);
      var buy=num(price*0.96);
      var sell=num(Math.min(hi*1.02, price*1.18));
      var fromHi=Math.round((1-price/hi)*100);
      var fromLo=Math.round((price/lo-1)*100);
      var trend= pos>0.6?'upper-range momentum' : (pos>0.35?'mid-range':'lower-range / weak');
      // fundamentals
      var pe=m.peTTM, ps=m.psTTM, pm=m.netProfitMarginTTM, rg=m.revenueGrowthTTMYoy, roe=m.roeTTM, de=m['totalDebt/totalEquityAnnual'];
      var f=[];
      if(pe!=null) f.push('P/E '+(+pe).toFixed(1));
      else if(ps!=null) f.push('P/S '+(+ps).toFixed(1)+' (no positive P/E)');
      if(rg!=null) f.push('rev '+(rg>=0?'+':'')+(+rg).toFixed(0)+'% YoY');
      if(pm!=null) f.push('net margin '+(+pm).toFixed(1)+'%');
      if(roe!=null) f.push('ROE '+(+roe).toFixed(0)+'%');
      if(de!=null) f.push('D/E '+(+de).toFixed(1));
      var profit = (pm!=null)? (pm>0?'currently profitable':'currently loss-making') : '';
      var quality = (pm!=null&&pm>0&&rg!=null&&rg>10)?'profitable grower' : (pm!=null&&pm<=0?'pre-profit / story':'mixed');
      // conviction blends trend + quality
      var conv = pos>0.85?4:(pos>0.55?3:(pos>0.3?3:2));
      if(pm!=null&&pm>10&&rg!=null&&rg>15) conv=Math.min(5,conv+1);
      if(pm!=null&&pm<0) conv=Math.min(conv,2);
      var fundStr=f.length?('Fundamentals: '+f.join(' · ')+'.'):'Fundamentals: limited data.';
      var thesis=t+' ~$'+price.toFixed(2)+': '+fromHi+'% below 52w high ($'+num(hi)+'), +'+fromLo+'% off low ($'+num(lo)+'); '+trend+'. '+fundStr+(profit?(' '+profit.charAt(0).toUpperCase()+profit.slice(1)+' ('+quality+').'):'')+' Accumulate ~$'+buy+', target ~$'+sell+'. Technical+fundamental auto-read; run '+t+' in Eden for WACC/DCF.';
      fillForm(t, conv, buy, sell, thesis);
      msg.innerHTML='<span class="txt-pos">Suggested for '+t+' (buy $'+buy+' / sell $'+sell+' / conv '+conv+').</span> Review, then click Add.';
    });
  }

  function boot(){
    renderIdeas(); injectSuggest(); patchWatchRender(); augmentSaved();
    var nv=document.querySelector('.nav-item[data-section="watchlist"]');
    if(nv) nv.addEventListener('click', function(){ setTimeout(function(){ renderIdeas(); injectSuggest(); patchWatchRender(); augmentSaved(); },150); });
  }
  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', function(){ setTimeout(boot,800); }); } else { setTimeout(boot,800); }
})();
