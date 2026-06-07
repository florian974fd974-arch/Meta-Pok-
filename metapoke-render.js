/* ============================================================
   METAPOKE — Couche de rendu dynamique (additive)
   Lit ./data/*.json et injecte des panneaux à jour dans chaque
   onglet, sans toucher au contenu statique existant.
   ============================================================ */
(function () {
  'use strict';
  var DATA = (window.DATA_PATH || './data');
  function J(f){ return fetch(DATA + '/' + f + '?t=' + Date.now()).then(function(r){return r.ok?r.json():null;}).catch(function(){return null;}); }
  function el(tag, cls, html){ var e=document.createElement(tag); if(cls)e.className=cls; if(html!=null)e.innerHTML=html; return e; }
  function esc(s){ return String(s==null?'':s).replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c];}); }

  // styles
  var css = document.createElement('style');
  css.textContent = [
    '.mp-dyn{padding:32px 0;border-top:1px solid var(--border)}',
    '.mp-dyn .wrap{max-width:1280px;margin:0 auto;padding:0 32px}',
    '.mp-h{font-family:Syne,sans-serif;font-weight:800;font-size:clamp(20px,2.4vw,28px);letter-spacing:-.02em;margin:0 0 6px}',
    '.mp-sub{color:var(--muted);margin:0 0 20px;max-width:80ch}',
    '.mp-grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px}',
    '@media(max-width:820px){.mp-grid2{grid-template-columns:1fr}}',
    '.mp-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:18px;overflow:hidden}',
    '.mp-card h3{font-family:Syne,sans-serif;font-size:14px;letter-spacing:.04em;text-transform:uppercase;color:var(--accent);margin:0 0 12px}',
    '.mp-row{display:grid;grid-template-columns:28px 1fr auto auto;gap:10px;align-items:center;padding:7px 0;border-bottom:1px solid var(--border);font-size:14px}',
    '.mp-row:last-child{border-bottom:0}',
    '.mp-rk{color:var(--dim);font-variant-numeric:tabular-nums;font-weight:700}',
    '.mp-nm{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.mp-pct{font-variant-numeric:tabular-nums;font-weight:700}',
    '.mp-pct.win{color:var(--success)}.mp-pct.use{color:var(--accent)}',
    '.mp-sec{color:var(--muted);font-variant-numeric:tabular-nums;font-size:13px}',
    '.mp-chips{display:flex;flex-wrap:wrap;gap:6px}',
    '.mp-chip{background:var(--surface-2);border:1px solid var(--border);border-radius:8px;padding:4px 9px;font-size:12px;font-weight:600}',
    '.mp-chip.in{border-color:var(--success);color:var(--success)}.mp-chip.out{border-color:var(--danger);color:var(--danger)}',
    '.mp-tier{display:grid;grid-template-columns:54px 1fr;gap:10px;align-items:start;padding:8px 0;border-bottom:1px solid var(--border)}',
    '.mp-tier:last-child{border-bottom:0}',
    '.mp-tierlbl{font-family:Syne,sans-serif;font-weight:800;font-size:18px;text-align:center;border-radius:8px;padding:4px 0;background:var(--surface-2)}',
    '.mp-evt{display:flex;gap:12px;padding:8px 0;border-bottom:1px solid var(--border)}',
    '.mp-evt:last-child{border-bottom:0}',
    '.mp-evt .d{color:var(--accent);font-variant-numeric:tabular-nums;font-weight:700;white-space:nowrap}',
    '.mp-pk{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:14px}',
    '.mp-pk .t{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px}',
    '.mp-pk .t b{font-family:Syne,sans-serif;font-size:16px}',
    '.mp-pk .meta{font-size:12px;color:var(--muted);line-height:1.7}',
    '.mp-pk .meta b{color:var(--text);font-weight:600}',
    '.mp-pkgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}',
    '.mp-up{color:var(--success)}.mp-down{color:var(--danger)}.mp-stable{color:var(--dim)}'
  ].join('');
  document.head.appendChild(css);

  function panel(pageId, id){
    var page=document.getElementById(pageId); if(!page) return null;
    var old=document.getElementById(id); if(old) old.remove();
    var sec=el('section','mp-dyn'); sec.id=id;
    var wrap=el('div','wrap'); sec.appendChild(wrap);
    var hero=page.querySelector('.hero');
    if(hero&&hero.nextSibling) page.insertBefore(sec, hero.nextSibling);
    else page.insertBefore(sec, page.firstChild);
    return wrap;
  }
  function deckTable(title, rows, primary){
    var c=el('div','mp-card'); c.appendChild(el('h3',null,esc(title)));
    rows.forEach(function(d){
      var r=el('div','mp-row');
      r.appendChild(el('div','mp-rk','#'+d.rank));
      r.appendChild(el('div','mp-nm',esc(d.name)));
      var a=(primary==='win'?d.winRate||d.winrate:d.usage), b=(primary==='win'?d.usage:d.winRate||d.winrate);
      r.appendChild(el('div','mp-pct '+(primary==='win'?'win':'use'), (a!=null?a+'%':'—')));
      r.appendChild(el('div','mp-sec', (b!=null?b+'%':'')));
      c.appendChild(r);
    });
    return c;
  }
  function chips(names, cls){ var w=el('div','mp-chips'); (names||[]).forEach(function(n){ w.appendChild(el('span','mp-chip'+(cls?' '+cls:''),esc(n))); }); return w; }
  function eventsCard(list){
    if(!list||!list.length) return null;
    var c=el('div','mp-card'); c.appendChild(el('h3',null,'Sorties &amp; événements à venir'));
    list.forEach(function(e){ var r=el('div','mp-evt'); r.appendChild(el('div','d',esc(e.date||''))); r.appendChild(el('div',null,'<b>'+esc(e.title||'')+'</b><br><span class="mp-sec">'+esc(e.desc||'')+'</span>')); c.appendChild(r); });
    return c;
  }

  function renderDecks(d, pageId, id, label){
    if(!d) return; var w=panel(pageId,id); if(!w) return;
    w.appendChild(el('h2','mp-h', (label||'Méta')+' · '+esc((d.set&&d.set.name)||'')));
    if(d.metaSummary) w.appendChild(el('p','mp-sub',esc(d.metaSummary)));
    var g=el('div','mp-grid2');
    if(d.topUsage&&d.topUsage.length) g.appendChild(deckTable('Top 10 — Utilisation', d.topUsage, 'use'));
    if(d.topWinrate&&d.topWinrate.length) g.appendChild(deckTable('Top 10 — Taux de victoire (usage ≥ 2%)', d.topWinrate, 'win'));
    w.appendChild(g);
    // entrées / sorties
    if((d.enteringMeta&&d.enteringMeta.length)||(d.leavingMeta&&d.leavingMeta.length)){
      var c=el('div','mp-card'); c.style.marginTop='20px'; c.appendChild(el('h3',null,'Qui entre / qui sort'));
      if(d.enteringMeta&&d.enteringMeta.length){ c.appendChild(el('div','mp-sec','↗ Entrent dans le top')); c.appendChild(chips(d.enteringMeta,'in')); }
      if(d.leavingMeta&&d.leavingMeta.length){ var s=el('div','mp-sec','↘ Sortent du top'); s.style.marginTop='10px'; c.appendChild(s); c.appendChild(chips(d.leavingMeta,'out')); }
      w.appendChild(c);
    }
    var ev=eventsCard(d.upcomingEvents); if(ev){ ev.style.marginTop='20px'; w.appendChild(ev); }
  }

  function renderVGC(d){
    if(!d) return; var w=panel('page-vgc','mp-dyn-vgc'); if(!w) return;
    w.appendChild(el('h2','mp-h','VGC · '+esc(d.format||'')));
    if(d.metaSummary) w.appendChild(el('p','mp-sub',esc(d.metaSummary)));
    if(d.topPokemon&&d.topPokemon.length){
      var g=el('div','mp-pkgrid');
      d.topPokemon.forEach(function(p){
        var c=el('div','mp-pk');
        c.appendChild(el('div','t','<b>'+esc(p.name)+'</b><span class="mp-pct use">'+(p.usageRate||p.usage||'—')+'%</span>'));
        function fmtEntry(x){ if(x==null) return ''; if(typeof x!=='object') return String(x); var n=x.name||x.label||''; var pc=(x.pct!=null?x.pct:(x.usage!=null?x.usage:(x.percent!=null?x.percent:(x.rate!=null?x.rate:null)))); return pc!=null?(n+' '+pc+'%'):String(n); }
        function line(lbl,arr,n){ if(!arr||!arr.length) return ''; var s=arr.slice(0,n||3).map(fmtEntry).filter(Boolean).join(' · '); return s?('<div><b>'+lbl+' :</b> '+esc(s)+'</div>'):''; }
        c.appendChild(el('div','meta',
          line('Talent', p.abilities, 2)+line('Objet', p.items, 3)+line('Attaques', p.moves, 4)+line('Coéquipiers', p.partners, 3)));
        g.appendChild(c);
      });
      w.appendChild(g);
    }
    if(d.recentResults&&d.recentResults.length){
      var rc=el('div','mp-card'); rc.style.marginTop='20px'; rc.appendChild(el('h3',null,'Résultats récents'));
      d.recentResults.forEach(function(r){ rc.appendChild(el('div','mp-evt','<div><b>'+esc(r.player||'')+'</b> — '+esc(r.title||'')+'<br><span class="mp-sec">'+esc(r.team||'')+'</span></div>')); });
      w.appendChild(rc);
    }
    var ev=eventsCard(d.upcomingEvents); if(ev){ ev.style.marginTop='20px'; w.appendChild(ev); }
  }

  function renderUnite(d){
    if(!d) return; var w=panel('page-unite','mp-dyn-unite'); if(!w) return;
    w.appendChild(el('h2','mp-h','Unite · '+esc(d.patch||'')));
    if(d.metaSummary) w.appendChild(el('p','mp-sub',esc(d.metaSummary)));
    if(d.tierList){
      var c=el('div','mp-card'); c.appendChild(el('h3',null,'Tier list compétitive'));
      var order=['S','A+','A','B+','B','C','D','F','TBD'];
      order.forEach(function(t){ var arr=d.tierList[t]; if(!arr||!arr.length) return;
        var row=el('div','mp-tier');
        var lbl=el('div','mp-tierlbl',esc(t)); lbl.style.color='var(--accent)';
        row.appendChild(lbl); row.appendChild(chips(arr));
        c.appendChild(row);
      });
      w.appendChild(c);
    }
    if(d.topPokemon&&d.topPokemon.length){
      var g=el('div','mp-pkgrid'); g.style.marginTop='20px';
      d.topPokemon.forEach(function(p){ var c=el('div','mp-pk');
        c.appendChild(el('div','t','<b>'+esc(p.name)+'</b><span class="mp-chip">'+esc(p.tier||'')+'</span>'));
        c.appendChild(el('div','meta','<div><b>Rôle :</b> '+esc(p.role||'')+'</div>'+(p.heldItems&&p.heldItems.length?'<div><b>Objets :</b> '+esc(p.heldItems.join(' · '))+'</div>':'')+(p.battleItem?'<div><b>Combat :</b> '+esc(p.battleItem)+'</div>':'')));
        g.appendChild(c);
      });
      w.appendChild(g);
    }
  }

  function run(){
    Promise.all([J('tcgp_data.json'),J('classic_data.json'),J('vgc_data.json'),J('unite_data.json')])
    .then(function(r){
      renderDecks(r[0],'page-tcgp','mp-dyn-tcgp','Méta Pocket');
      renderDecks(r[1],'page-classic','mp-dyn-classic','Méta Standard');
      renderVGC(r[2]);
      renderUnite(r[3]);
      if(window.MetaPoke&&window.MetaPoke.bus) window.MetaPoke.bus.emit('mp:rendered');
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(run, 200); });
  else setTimeout(run, 200);
})();
