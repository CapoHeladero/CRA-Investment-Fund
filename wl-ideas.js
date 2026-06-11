/* CRA WATCHLIST IDEAS — daily momentum/technical setups with target buy/sell/thesis and one-click Add.
   Self-contained; reads watchlist-ideas-latest.json. Adds via the existing Watchlist form. */
(function(){
  function render(){
    var sec=document.getElementById('s-watchlist'); if(!sec) return;
    var board=document.getElementById('wl-ideas-board');
    if(!board){ board=document.createElement('div'); board.id='wl-ideas-board'; board.className='card'; sec.insertBefore(board, sec.firstChild); }
    board.innerHTML='<div class="card-h">Watchlist ideas</div><div class="muted">Loading…</div>';
    fetch('watchlist-ideas-latest.json?cb='+Date.now(),{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).then(function(j){
      if(!j||!j.ideas||!j.ideas.length){ board.innerHTML='<div class="card-h">Watchlist ideas</div><div class="muted">No ideas feed yet.</div>'; return; }
      window.__wlIdeas=j.ideas;
      var rows=j.ideas.map(function(x,i){
        return '<tr><td><span class="row-ticker">'+x.t+'</span> <span class="muted">'+(x.n||'')+'</span></td>'+
          '<td class="ta-r">'+(x.conv||3)+'/5</td>'+
          '<td class="ta-r">$'+x.buy+'</td>'+
          '<td class="ta-r">$'+x.sell+'</td>'+
          '<td class="muted" style="font-size:11.5px;max-width:520px">'+(x.thesis||'')+'</td>'+
          '<td class="ta-r"><button class="btn-sec btn-sm wl-add" data-i="'+i+'">+ Add</button></td></tr>';
      }).join('');
      board.innerHTML='<div class="card-h">Watchlist ideas <span class="muted" style="font-size:11px;">- momentum/technical setups - '+(j.asof||'')+'</span></div>'+
        '<div class="card-sub">Target buy = level to accumulate; target sell = resistance/target. One click adds it to your watchlist. Re-check live before acting.</div>'+
        '<table class="t"><thead><tr><th>Name</th><th class="ta-r">Conv</th><th class="ta-r">Buy</th><th class="ta-r">Sell</th><th>Thesis</th><th></th></tr></thead><tbody>'+rows+'</tbody></table>';
      board.querySelectorAll('.wl-add').forEach(function(btn){
        btn.addEventListener('click', function(){
          var x=window.__wlIdeas[parseInt(btn.getAttribute('data-i'))]; if(!x) return;
          var set=function(id,v){ var el=document.getElementById(id); if(el){ el.value=v; el.dispatchEvent(new Event('input',{bubbles:true})); } };
          set('w-tick',x.t); set('w-conv',x.conv||3); set('w-buy',x.buy); set('w-sell',x.sell); set('w-note',x.thesis||'');
          var addBtn=[].slice.call(document.querySelectorAll('#s-watchlist button')).find(function(b){return /Add/i.test(b.textContent)&&(b.getAttribute('onclick')||'').indexOf('Watch.add')>=0;});
          if(addBtn){ addBtn.click(); }
          btn.textContent='Added ✓'; btn.disabled=true;
        });
      });
    }).catch(function(){ board.innerHTML='<div class="card-h">Watchlist ideas</div><div class="muted">Ideas feed unavailable.</div>'; });
  }
  function boot(){ render(); var nv=document.querySelector('.nav-item[data-section="watchlist"]'); if(nv) nv.addEventListener('click', function(){ setTimeout(render,150); }); }
  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', function(){ setTimeout(boot,800); }); } else { setTimeout(boot,800); }
})();
