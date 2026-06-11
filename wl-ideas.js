/* CRA WATCHLIST IDEAS + AUTO-SUGGEST
   (1) Daily momentum/technical setups panel with one-click Add.
   (2) "Auto-suggest" button on the Add-to-watchlist form: type ANY ticker and it computes
       target buy/sell, conviction and a technical thesis from the live Finnhub quote + 52w range. */
(function(){
  function num(v){ return Math.round(v*100)/100; }

  // ---------- (1) ideas panel ----------
  function renderIdeas(){
    var sec=document.getElementById('s-watchlist'); if(!sec) return;
    var board=document.getElementById('wl-ideas-board');
    if(!board){ board=document.createElement('div'); board.id='wl-ideas-board'; board.className='card'; sec.insertBefore(board, sec.firstChild); }
    board.innerHTML='<div class="card-h">Watchlist ideas</div><div class="muted">Loading…</div>';
    fetch('watchlist-ideas-latest.json?cb='+Date.now(),{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).then(function(j){
      if(!j||!j.ideas||!j.ideas.length){ board.innerHTML='<div class="card-h">Watchlist ideas</div><div class="muted">No ideas feed yet.</div>'; return; }
      window.__wlIdeas=j.ideas;
      var rows=j.ideas.map(function(x,i){
        return '<tr><td><span class="row-ticker">'+x.t+'</span> <span class="muted">'+(x.n||'')+'</span></td>'+
          '<td class="ta-r">'+(x.conv||3)+'/5</td><td class="ta-r">$'+x.buy+'</td><td class="ta-r">$'+x.sell+'</td>'+
          '<td class="muted" style="font-size:11.5px;max-width:520px">'+(x.thesis||'')+'</td>'+
          '<td class="ta-r"><button class="btn-sec btn-sm wl-add" data-i="'+i+'">+ Add</button></td></tr>';
      }).join('');
      board.innerHTML='<div class="card-h">Watchlist ideas <span class="muted" style="font-size:11px;">- momentum/technical setups - '+(j.asof||'')+'</span></div>'+
        '<div class="card-sub">Target buy = level to accumulate; target sell = resistance/target. One click adds it. Re-check live before acting.</div>'+
        '<table class="t"><thead><tr><th>Name</th><th class="ta-r">Conv</th><th class="ta-r">Buy</th><th class="ta-r">Sell</th><th>Thesis</th><th></th></tr></thead><tbody>'+rows+'</tbody></table>';
      board.querySelectorAll('.wl-add').forEach(function(btn){
        btn.addEventListener('click', function(){
          var x=window.__wlIdeas[parseInt(btn.getAttribute('data-i'))]; if(!x) return;
          fillForm(x.t, x.conv||3, x.buy, x.sell, x.thesis||'');
          clickAdd(); btn.textContent='Added ✓'; btn.disabled=true;
        });
      });
    }).catch(function(){ board.innerHTML='<div class="card-h">Watchlist ideas</div><div class="muted">Ideas feed unavailable.</div>'; });
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

  // ---------- (2) auto-suggest ----------
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
    msg.textContent='Computing '+t+' from live data…';
    Promise.all([
      fetch('https://finnhub.io/api/v1/quote?symbol='+encodeURIComponent(t)+'&token='+key).then(function(r){return r.json();}).catch(function(){return null;}),
      fetch('https://finnhub.io/api/v1/stock/metric?symbol='+encodeURIComponent(t)+'&metric=all&token='+key).then(function(r){return r.json();}).catch(function(){return null;})
    ]).then(function(res){
      var q=res[0]||{}, m=(res[1]&&res[1].metric)||{};
      var price=q.c;
      if(!price){ msg.innerHTML='<span class="txt-neg">No live quote for '+t+' — check the ticker or your key.</span>'; return; }
      var hi=m['52WeekHigh']||price*1.2, lo=m['52WeekLow']||price*0.8;
      var pos=(price-lo)/((hi-lo)||1);
      var buy=num(price*0.96);                                   // ~4% pullback accumulate
      var sell=num(Math.min(hi*1.02, price*1.18));               // toward 52w high / +18% cap
      var conv= pos>0.85?4 : (pos>0.55?3 : (pos>0.3?3:2));
      var fromHi=Math.round((1-price/hi)*100);
      var fromLo=Math.round((price/lo-1)*100);
      var trend= pos>0.6?'upper-range momentum' : (pos>0.35?'mid-range':'lower-range / weak');
      var thesis=t+' ~$'+price.toFixed(2)+': '+fromHi+'% below 52w high ($'+num(hi)+'), +'+fromLo+'% off 52w low ($'+num(lo)+'); '+trend+'. Accumulate ~$'+buy+', target ~$'+sell+'. Technical auto-read — ask the analyst for a fundamental thesis.';
      fillForm(t, conv, buy, sell, thesis);
      msg.innerHTML='<span class="txt-pos">Suggested for '+t+' (buy $'+buy+' / sell $'+sell+' / conv '+conv+').</span> Review, then click Add.';
    });
  }

  function boot(){ renderIdeas(); injectSuggest(); var nv=document.querySelector('.nav-item[data-section="watchlist"]'); if(nv) nv.addEventListener('click', function(){ setTimeout(function(){renderIdeas(); injectSuggest();},150); }); }
  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', function(){ setTimeout(boot,800); }); } else { setTimeout(boot,800); }
})();
