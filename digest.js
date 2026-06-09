/* CRA MORNING DIGEST — synthesizes the daily feeds into one read at the top of the Brief.
   Self-contained; reads the committed JSON feeds. */
(function(){
  function render(){
    var sec=document.getElementById('s-brief'); if(!sec) return;
    var board=document.getElementById('digest-board');
    if(!board){ board=document.createElement('div'); board.id='digest-board'; board.className='card'; sec.insertBefore(board, sec.firstChild); }
    board.innerHTML='<div class="card-h">Morning digest</div><div class="muted">Loading…</div>';
    var g=function(f){return fetch(f+'?cb='+Date.now(),{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).catch(function(){return null;});};
    Promise.all([g('opportunities-latest.json'),g('macro-latest.json'),g('insiders-latest.json'),g('scorecards-latest.json')]).then(function(res){
      var opp=res[0],mac=res[1],ins=res[2],sc=res[3];
      var asof=(mac&&mac.asof)||'';
      var html='<div class="card-h">Morning digest <span class="muted" style="font-size:11px;">'+(asof?('· '+asof):'')+'</span></div>';
      if(mac){ html+='<div style="margin-bottom:8px"><strong>Regime:</strong> VIX '+mac.vix+' · 10Y '+mac.y10+'% · Brent $'+mac.brent+' · S&amp;P '+(mac.spVs200>=0?'+':'')+mac.spVs200+'% vs 200DMA. '+(mac.note||'')+'</div>'; }
      if(opp&&opp.length){ html+='<div style="margin-bottom:8px"><strong>Top ideas:</strong> '+opp.slice(0,3).map(function(n){return n.t+' ('+n.entry+'/'+n.stop+'/'+n.target+')';}).join(', ')+'</div>'; }
      if(sc&&sc.names&&sc.names.length){ html+='<div style="margin-bottom:8px"><strong>Best-rated:</strong> '+sc.names.slice(0,3).map(function(n){return n.t+' '+n.grade;}).join(', ')+'</div>'; }
      if(ins){ var cl=ins.clusters&&ins.clusters[0]; var pol=ins.politicians&&ins.politicians[0]; html+='<div style="margin-bottom:8px"><strong>Smart money:</strong> '+(cl?('insider cluster '+cl.t+' ('+cl.buyers+' buyers)'):'—')+(pol?(' · '+pol.who+' bought '+pol.t):'')+'</div>'; }
      html+='<div class="muted" style="font-size:11px">Auto-synthesized from the daily feeds. Not financial advice; re-check live prices.</div>';
      board.innerHTML=html;
    });
  }
  function boot(){ render(); var nv=document.querySelector('.nav-item[data-section="brief"]'); if(nv) nv.addEventListener('click', function(){ setTimeout(render, 120); }); }
  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', function(){ setTimeout(boot, 700); }); } else { setTimeout(boot, 700); }
})();
