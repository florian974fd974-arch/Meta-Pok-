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
  // Bilingue : renvoie le champ <field>_en si la langue active est EN et qu'il existe, sinon le champ FR.
  function tr(obj, field){ try{ if(obj&&currentLang()==='en'){ var v=obj[field+'_en']; if(v!=null&&v!=='') return v; } }catch(e){} return obj?obj[field]:''; }
  function esc(s){ return String(s==null?'':s).replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c];}); }

  // ---- Sprites (même CDN que le site) ----
  var SPRITE_BASE='https://r2.limitlesstcg.net/pokemon/gen9/';
  function pkSlug(name){ if(!name) return ''; var n=String(name).toLowerCase().trim();
    n=n.replace(/^(mega|primal|alolan|galarian|hisuian|paldean)\s+/,'').replace(/^eternal flower\s+/,'');
    n=n.replace(/\s+(x|y)$/,''); n=n.replace(/['’]/g,'');
    n=n.replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); return n; }
  function spriteTag(name, px){ var s=pkSlug(name); if(!s) return ''; px=px||28;
    return '<img class="mp-sprite" src="'+SPRITE_BASE+s+'.png" alt="'+esc(name)+'" loading="lazy" style="width:'+px+'px;height:'+px+'px" onerror="this.style.display=\'none\'">'; }
  function deckSlugs(deckName){ var stop={mega:1,ex:1,vmax:1,vstar:1,v:1,gx:1,prime:1,de:1,et:1,'&':1};
    var words=String(deckName||'').split(/\s+/).map(function(w){return w.toLowerCase().replace(/['’.]/g,'');}).filter(function(w){return w&&!stop[w];});
    var uniq=[]; words.forEach(function(w){ if(uniq.indexOf(w)<0) uniq.push(w); });
    var picks=[]; if(uniq.length){ picks.push(uniq[0]); if(uniq.length>1) picks.push(uniq[uniq.length-1]); } return picks; }
  function deckSpritesTag(deckName, px){ return deckSlugs(deckName).map(function(s){ return spriteTag(s,px||24); }).join(''); }
  function limitlessUrl(deckName, game, slugOverride){
    if(slugOverride) return 'https://play.limitlesstcg.com/decks/'+slugOverride+'?game=POCKET';
    if(game==='classic') return 'https://limitlesstcg.com/decks';
    return 'https://play.limitlesstcg.com/decks?game=pocket'; }
  function decklistHtml(cards){
    function sect(title, items, withSprite){ if(!items||!items.length) return '';
      var tot=items.reduce(function(s,x){return s+(+x.q||0);},0);
      return '<div class="decklist-section"><div class="decklist-head"><span class="title">'+esc(title)+'</span><span class="count">'+tot+' cartes</span></div><div class="decklist-items">'
        +items.map(function(x){ return '<div class="decklist-item"><span class="qty">'+(x.q||1)+'×</span>'+(withSprite&&x.s?'<img src="'+SPRITE_BASE+pkSlug(x.s)+'.png" onerror="this.style.opacity=0.3">':'')+'<span class="name">'+esc(x.n||x.name||'')+'</span>'+(x.set?'<span class="set-code">'+esc(x.set)+'</span>':'')+'</div>'; }).join('')
        +'</div></div>'; }
    return sect('Pokémon', cards.pokemon, true)+sect('Dresseurs & Objets', cards.trainers, false)+sect('Énergies', cards.energy, false); }
  function pkLine(lbl, arr, n){ if(!arr||!arr.length) return '';
    function f(x){ if(x==null)return''; if(typeof x!=='object')return String(x); var nm=x.name||x.label||''; var pc=(x.pct!=null?x.pct:(x.usage!=null?x.usage:x.percent)); return pc!=null?(nm+' '+pc+'%'):String(nm); }
    var s=arr.slice(0,n||6).map(f).filter(Boolean).join(' · '); if(!s) return '';
    return '<div class="decklist-section"><div class="decklist-head"><span class="title">'+esc(lbl)+'</span></div><div style="padding:8px 0;color:var(--muted);font-size:14px;line-height:1.9">'+esc(s)+'</div></div>'; }
  function openPokemonModal(p, ctx){
    var modal=document.getElementById('deckModal'), mc=document.getElementById('modalContent'); if(!modal||!mc) return;
    var us=(p.usageRate!=null?p.usageRate:p.usage), stats='';
    if(us!=null) stats+='<div class="qstat"><div class="v">'+us+'%</div><div class="l">Usage</div></div>';
    if(p.tier) stats+='<div class="qstat"><div class="v">'+esc(p.tier)+'</div><div class="l">Tier</div></div>';
    if(p.role) stats+='<div class="qstat"><div class="v">'+esc(chipText(p.role)||p.role)+'</div><div class="l">Rôle</div></div>';
    var body=pkLine('Talents',p.abilities,3)+pkLine('Objets',p.items,4)+pkLine('Attaques',p.moves,6)+pkLine('Coéquipiers',p.partners,6);
    if(p.heldItems&&p.heldItems.length) body+=pkLine('Objets tenus',p.heldItems,3);
    if(p.battleItem) body+=pkLine('Objet de combat',[p.battleItem],1);
    if(!body) body='<div class="info-box" style="margin-top:0"><div class="icon">ℹ️</div><div><div class="title">Détails à venir</div><p>Les détails complets de ce Pokémon seront enrichis prochainement.</p></div></div>';
    mc.innerHTML='<div class="modal-head"><div class="modal-tag">'+esc(ctx.label||'')+'</div><h3>'+esc(p.name)+'</h3><div class="modal-sprites">'+spriteTag(p.name,72)+'</div></div>'+(stats?'<div class="modal-quickstats">'+stats+'</div>':'')+body+'<div class="modal-cta"><button class="modal-btn secondary" id="mpModalClose">Fermer</button></div>';
    modal.classList.add('open'); document.body.style.overflow='hidden';
    var cb=document.getElementById('mpModalClose'); if(cb) cb.addEventListener('click', function(){ modal.classList.remove('open'); document.body.style.overflow=''; });
  }
  function openLiveDeckModal(d, ctx){
    var modal=document.getElementById('deckModal'), mc=document.getElementById('modalContent'); if(!modal||!mc) return;
    var wr=(d.winRate!=null?d.winRate:d.winrate);
    var qs='<div class="qstat"><div class="v">'+(wr!=null?wr+'%':'—')+'</div><div class="l">Win rate</div></div>'
         +'<div class="qstat"><div class="v">'+(d.usage!=null?d.usage+'%':'—')+'</div><div class="l">Méta share</div></div>'
         +(d.record?'<div class="qstat"><div class="v">'+esc(d.record)+'</div><div class="l">Bilan V-D-N</div></div>':'');
    var body;
    if(d.cards&&(d.cards.pokemon||d.cards.trainers||d.cards.energy)){
      body=decklistHtml(d.cards)
        +(d.listBy?'<p style="font-family:\'JetBrains Mono\',monospace;font-size:11px;color:var(--muted);margin:12px 0 0">⚡ Decklist authentique : '+esc(d.listBy)+' · Source Limitless TCG</p>':'')
        +'<div class="modal-cta"><a class="modal-btn primary" target="_blank" href="'+limitlessUrl(d.name,ctx.game,d.limitless)+'">Ouvrir sur Limitless →</a><button class="modal-btn secondary" id="mpModalClose">Fermer</button></div>';
    } else {
      body='<div class="info-box" style="margin-top:0;margin-bottom:24px"><div class="icon">📋</div><div><div class="title">Decklist détaillée</div><p>La liste de cartes complète de cet archétype est en cours d\'intégration. En attendant, retrouve les decklists des tops joueurs directement sur Limitless TCG.</p></div></div>'
         +'<div class="modal-cta"><a class="modal-btn primary" target="_blank" href="'+limitlessUrl(d.name,ctx.game,d.limitless)+'">Voir les decklists sur Limitless →</a><button class="modal-btn secondary" id="mpModalClose">Fermer</button></div>';
    }
    mc.innerHTML='<div class="modal-head"><div class="modal-tag">'+esc(ctx.label||'')+(ctx.setName?' · '+esc(ctx.setName):'')+'</div><h3>'+esc(d.name)+'</h3><div class="modal-sprites">'+(deckSpritesTag(d.name,64)||'')+'</div></div><div class="modal-quickstats">'+qs+'</div>'+body;
    modal.classList.add('open'); document.body.style.overflow='hidden';
    var cb=document.getElementById('mpModalClose'); if(cb) cb.addEventListener('click', function(){ modal.classList.remove('open'); document.body.style.overflow=''; });
  }

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
    '.mp-up{color:var(--success)}.mp-down{color:var(--danger)}.mp-stable{color:var(--dim)}',
    '.mp-sprite{object-fit:contain;vertical-align:middle;flex:0 0 auto}',
    '.mp-nm{display:flex;align-items:center;gap:8px}.mp-nm span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.mp-clk{cursor:pointer;transition:background .15s,transform .15s,border-color .15s}.mp-row.mp-clk:hover{background:var(--surface-2);transform:translateX(2px)}',
    '.mp-pk.mp-clk:hover{transform:translateY(-3px);border-color:var(--accent)}',
    '.mp-pkname{display:flex;align-items:center;gap:8px}',
    '.mp-chip{display:inline-flex;align-items:center}'
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
  function deckTable(title, rows, primary, ctx){
    var c=el('div','mp-card'); c.appendChild(el('h3',null,esc(title)));
    rows.forEach(function(d){
      var r=el('div','mp-row mp-clk');
      r.appendChild(el('div','mp-rk','#'+d.rank));
      var nm=el('div','mp-nm'); nm.innerHTML=deckSpritesTag(d.name,22)+'<span>'+esc(d.name)+'</span>'; r.appendChild(nm);
      var a=(primary==='win'?d.winRate||d.winrate:d.usage), b=(primary==='win'?d.usage:d.winRate||d.winrate);
      r.appendChild(el('div','mp-pct '+(primary==='win'?'win':'use'), (a!=null?a+'%':'—')));
      r.appendChild(el('div','mp-sec', (b!=null?b+'%':'')));
      r.addEventListener('click', function(){ openLiveDeckModal(d, ctx||{}); });
      c.appendChild(r);
    });
    return c;
  }
  function chipText(n){ if(n==null) return ''; if(typeof n!=='object') return String(n); return n.name||n.label||n.title||n.deck||''; }
  function chips(names, cls){ var w=el('div','mp-chips'); (names||[]).forEach(function(n){ var t=chipText(n); if(!t) return; var isPk=(n&&typeof n==='object'&&(n.role||n.range||n.tier)); var sp=isPk?spriteTag(t,18):''; var ch=el('span','mp-chip'+(cls?' '+cls:'')); ch.innerHTML=sp+(sp?' ':'')+esc(t); w.appendChild(ch); }); return w; }
  function eventsCard(list){
    if(!list||!list.length) return null;
    var c=el('div','mp-card'); c.appendChild(el('h3',null,'Sorties &amp; événements à venir'));
    list.forEach(function(e){ var r=el('div','mp-evt'); r.appendChild(el('div','d',esc(e.date||''))); r.appendChild(el('div',null,'<b>'+esc(tr(e,'title')||'')+'</b><br><span class="mp-sec">'+esc(tr(e,'desc')||'')+'</span>')); c.appendChild(r); });
    return c;
  }

  var MP_DATA=null;
  // Re-rend les sections dynamiques depuis les données en cache (utilise tr() => respecte la langue active).
  function reRenderDynamic(){
    if(!MP_DATA) return;
    try{
      renderDecks(MP_DATA.tcgp,'page-tcgp','mp-dyn-tcgp','Méta Pocket');
      renderDecks(MP_DATA.classic,'page-classic','mp-dyn-classic','Méta Standard');
      renderVGC(MP_DATA.vgc);
      renderUnite(MP_DATA.unite);
    }catch(e){}
  }
  function renderDecks(d, pageId, id, label){
    if(!d) return; var w=panel(pageId,id); if(!w) return;
    w.appendChild(el('h2','mp-h', (label||'Méta')+' · '+esc((d.set&&d.set.name)||'')));
    if(d.metaSummary) w.appendChild(el('p','mp-sub',esc(tr(d,'metaSummary'))));
    var ctx={label:label||'Méta', setName:(d.set&&d.set.name)||'', game:(pageId==='page-tcgp'?'pocket':'classic')};
    var g=el('div','mp-grid2');
    if(d.topUsage&&d.topUsage.length) g.appendChild(deckTable('Top 10 — Utilisation', d.topUsage, 'use', ctx));
    if(d.topWinrate&&d.topWinrate.length) g.appendChild(deckTable('Top 10 — Taux de victoire (usage ≥ 2%)', d.topWinrate, 'win', ctx));
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
    if(d.metaSummary) w.appendChild(el('p','mp-sub',esc(tr(d,'metaSummary'))));
    if(d.topPokemon&&d.topPokemon.length){
      var g=el('div','mp-pkgrid');
      var vctx={label:'VGC · '+esc(d.format||'')};
      d.topPokemon.forEach(function(p){
        var c=el('div','mp-pk mp-clk');
        c.addEventListener('click', function(){ openPokemonModal(p, vctx); });
        c.appendChild(el('div','t','<span class="mp-pkname">'+spriteTag(p.name,36)+'<b>'+esc(p.name)+'</b></span><span class="mp-pct use">'+(p.usageRate||p.usage||'—')+'%</span>'));
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
      d.recentResults.forEach(function(r){ rc.appendChild(el('div','mp-evt','<div><b>'+esc(r.player||'')+'</b> — '+esc(tr(r,'title')||'')+'<br><span class="mp-sec">'+esc(r.team||'')+'</span></div>')); });
      w.appendChild(rc);
    }
    var ev=eventsCard(d.upcomingEvents); if(ev){ ev.style.marginTop='20px'; w.appendChild(ev); }
  }

  function renderUnite(d){
    if(!d) return; var w=panel('page-unite','mp-dyn-unite'); if(!w) return;
    w.appendChild(el('h2','mp-h','Unite · '+esc(d.patch||'')));
    if(d.metaSummary) w.appendChild(el('p','mp-sub',esc(tr(d,'metaSummary'))));
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
      var uctx={label:'Unite · '+esc(d.patch||'')};
      d.topPokemon.forEach(function(p){ var c=el('div','mp-pk mp-clk');
        c.addEventListener('click', function(){ openPokemonModal(p, uctx); });
        c.appendChild(el('div','t','<span class="mp-pkname">'+spriteTag(p.name,36)+'<b>'+esc(p.name)+'</b></span><span class="mp-chip">'+esc(p.tier||'')+'</span>'));
        var hi=(p.heldItems||[]).map(chipText).filter(Boolean);
        c.appendChild(el('div','meta','<div><b>Rôle :</b> '+esc(chipText(p.role)||p.role||'')+'</div>'+(hi.length?'<div><b>Objets :</b> '+esc(hi.join(' · '))+'</div>':'')+(p.battleItem?'<div><b>Combat :</b> '+esc(chipText(p.battleItem)||p.battleItem)+'</div>':'')));
        g.appendChild(c);
      });
      w.appendChild(g);
    }
  }

  function mergePbl(){
    J('pbl_decks.json').then(function(p){
      if(!p) return;
      try{
        if(typeof pblTeamDecks==='undefined') return;
        if(!pblTeamDecks['victory-in-progress']) pblTeamDecks['victory-in-progress']={name:'Victory In Progress',badge:'VIP',badgeClass:'t-imperium',record:'0 pt · remplaçant (vise les playoffs)',serverDays:{}};
        Object.keys(p).forEach(function(teamId){
          if(!pblTeamDecks[teamId]) return;
          if(!pblTeamDecks[teamId].serverDays) pblTeamDecks[teamId].serverDays={};
          Object.keys(p[teamId]).forEach(function(day){
            var v=p[teamId][day], arr=null;
            if(Array.isArray(v)){ arr=v; }
            else if(v&&(v.s19||v.s21)){ arr=[];
              (v.s19||[]).forEach(function(d){ arr.push({n:d.n+' · 19h', img:d.img}); });
              (v.s21||[]).forEach(function(d){ arr.push({n:d.n+' · 21h', img:d.img}); });
            }
            if(arr&&arr.length) pblTeamDecks[teamId].serverDays[day]=arr;
          });
        });
      }catch(e){}
    });
  }

  function injectReglement(){
    try{
      if(typeof rulesData==='undefined'||!rulesData.pbl) return;
      if(rulesData.pbl.indexOf('reglement-officiel-pdf')>=0) return;
      var pdf='https://drive.google.com/file/d/1vO1rh-8CQp0tbIJv9X-a9PngxQyvcSYc/view';
      var banner='<div class="reglement-officiel-pdf info-box" style="margin:0 0 20px"><div class="icon">📄</div><div><div class="title">Règlement officiel à jour</div><p style="margin:4px 0 10px">Version complète mise à jour : saison régulière, calendrier des playoffs (barrages dès le lundi 8 juin), format Grande Finale (BO7, ban de 2 decks) et restrictions Pokémon EX/Méga.</p><a class="modal-btn primary" target="_blank" href="'+pdf+'">Ouvrir le règlement complet (PDF) →</a></div></div>';
      rulesData.pbl = banner + rulesData.pbl;
    }catch(e){}
  }

  function injectPblTeams(){
    try{
      var grid=document.querySelector('.pbl-teams-grid'); if(!grid) return;
      // Marquer Ragnarok éliminé
      var rag=grid.querySelector('[data-pbl-team="ragnarok"]');
      if(rag){ var rec=rag.querySelector('.ptc-record'); if(rec) rec.textContent='Éliminé · fautes répétées';
        var st=rag.querySelector('.ptc-status'); if(st){ st.textContent='⛔ Disqualifié (remplacé par Victory In Progress)'; st.className='ptc-status diff'; } }
      // Ajouter Victory In Progress
      if(!grid.querySelector('[data-pbl-team="victory-in-progress"]')){
        var c=document.createElement('div'); c.className='pbl-team-card'; c.setAttribute('data-pbl-team','victory-in-progress');
        c.innerHTML='<div class="ptc-badge t-imperium">VIP</div><div class="ptc-content"><div class="ptc-name">Victory In Progress</div><div class="ptc-record">Remplaçant de Ragnarok · vainqueur du barrage 1</div><div class="ptc-status diff">⛔ Éliminé en barrage 2 (2-3 vs AKS)</div></div><div class="ptc-arrow">→</div>';
        grid.appendChild(c);
      }
    }catch(e){}
  }

  // ---- PBL : matchs J6/J7 (même rendu que J1-J5, deck gagnant barré via .round-winner) ----
  var PBL_TEAMS={
    TSM:{badge:'SM',cls:'t-speed',name:'TSM'},
    EX:{badge:'FE',cls:'t-frogex',name:'FrogEX'},
    IMP:{badge:'IA',cls:'t-imperium',name:'IMP'},
    XTRP:{badge:'XP',cls:'t-xtrem',name:'XTRP'},
    VIP:{badge:'VIP',cls:'t-vip',name:'VIP'},
    US:{badge:'AR',cls:'t-arci',name:'US'},
    AKS:{badge:'AK',cls:'t-artiknights',name:'AKS'},
    TB:{badge:'TB',cls:'t-tier',name:'TB'}
  };
  function pblTeam(code){ return PBL_TEAMS[code]||{badge:esc(String(code).slice(0,3)),cls:'t-imperium',name:esc(code)}; }
  function pblTeamHtml(code, isWinner){
    var t=pblTeam(code);
    return '<div class="match-team'+(isWinner?' winner':'')+'"><span class="team-badge '+t.cls+'">'+t.badge+'</span><span class="team-short">'+t.name+(isWinner?' ✓':'')+'</span></div>';
  }
  function pblMatchCard(m){
    var rounds=m.rounds||[], last=rounds[rounds.length-1]||{};
    var sc=String(last.sc||'0-0').split('-'), a=+sc[0]||0, b=+sc[1]||0;
    var draw=(a===b), winCode=draw?null:(a>b?m.a:m.b);
    var label=draw?'Égalité':('Victoire '+pblTeam(winCode).name);
    var html='<div class="match-card '+(draw?'draw':'win-b')+'">'
      +'<div class="match-head"><div class="match-teams">'
      +pblTeamHtml(m.a, winCode===m.a)
      +'<div class="match-vs">vs</div>'
      +pblTeamHtml(m.b, winCode===m.b)
      +'</div><div class="match-score-block"><div class="match-score">'+a+' — '+b+'</div><div class="match-result-label">'+esc(label)+'</div></div></div>'
      +'<div class="match-rounds">';
    rounds.forEach(function(r){
      var aWon=(r.wt===m.a), cls=aWon?'win':'loss';
      var winSpan='<span class="round-winner">'+esc(r.wd)+' <em>'+esc(r.wt)+'</em></span>';
      var loseSpan='<span class="round-loser">'+esc(r.ld)+' <em>'+esc(r.lt)+'</em></span>';
      html+='<div class="round-row"><span class="round-num">'+esc(r.m)+'</span>'
        +(aWon? winSpan+loseSpan : loseSpan+winSpan)
        +'<span class="round-score '+cls+'">'+esc(r.sc)+'</span></div>';
    });
    return html+'</div></div>';
  }
  function renderPblMatches(){
    J('pbl_matches.json').then(function(data){
      if(!data) return;
      Object.keys(data).forEach(function(dayKey){
        var box=document.getElementById('day-'+dayKey); if(!box) return;
        var d=data[dayKey];
        var html='<div class="day-block"><div class="day-header"><h3 class="day-title">'+esc(d.title||'')+'</h3><span class="day-date">'+esc(d.date||'')+'</span></div>';
        (d.sessions||[]).forEach(function(s,i){
          html+='<div class="session-block"><div class="session-label"><span class="session-time">'+esc(s.label||'')+'</span><span class="session-meta">Session '+(i+1)+'</span></div><div class="matches-grid">';
          (s.matches||[]).forEach(function(m){ html+=pblMatchCard(m); });
          html+='</div></div>';
        });
        box.innerHTML=html+'</div>';
      });
    });
  }

  function startCountdown(){
    var target=new Date(2026,5,17,0,0,0).getTime(); // 17 juin 2026 — sortie mobile Pokémon Champions
    // Corrige la date affichée dans l'accroche
    document.querySelectorAll('.big-news .meta').forEach(function(m){ if(/6 juin/.test(m.textContent)) m.textContent=m.textContent.replace('6 juin 2026','17 juin 2026'); });
    document.querySelectorAll('.big-news .countdown').forEach(function(cd){
      if(cd.querySelectorAll('.count-box').length<4){
        var b=document.createElement('div'); b.className='count-box'; b.innerHTML='<div class="n mp-sec-box">--</div><div class="l">Sec</div>'; cd.appendChild(b);
      }
    });
    function tick(){
      var diff=Math.max(0,target-Date.now());
      var d=Math.floor(diff/86400000), h=Math.floor(diff%86400000/3600000), m=Math.floor(diff%3600000/60000), s=Math.floor(diff%60000/1000);
      document.querySelectorAll('.big-news .countdown').forEach(function(cd){
        var b=cd.querySelectorAll('.count-box .n');
        if(b.length>=4){ b[0].textContent=d; b[1].textContent=String(h).padStart(2,'0'); b[2].textContent=String(m).padStart(2,'0'); b[3].textContent=String(s).padStart(2,'0'); }
      });
    }
    tick(); setInterval(tick,1000);
  }

  // ---- i18n FR/EN (v1 : interface). D'autres langues pourront être ajoutées ici. ----
  var I18N_EN={
    // Navigation
    'Accueil':'Home','Tournois':'Tournaments',
    // Hero / stats accueil
    'L’actu compétitive':'Competitive news',"L'actu compétitive":'Competitive news','en un seul endroit.':'all in one place.',
    'Jeux trackés':'Tracked games','Événements actifs':'Active events','Tournois suivis':'Tracked tournaments','Équipes PBL':'PBL teams',
    'Joueurs trackés':'Tracked players','Matchs':'Matches','Set actif':'Active set','Joueurs total':'Total players','Cartes total':'Total cards',
    'Jours':'Days','Heures':'Hours','Disponible':'Available','Nouvelles cartes':'New cards','Révélées':'Revealed','Heure CEST':'CEST time',
    // Sections
    '— Choisir un tournoi':'— Pick a tournament','— Historique des matchs · Saison régulière':'— Match history · Regular season',
    '— Decks soumis par les équipes':'— Decks submitted by teams','— L’annonce du moment':'— Breaking news',"— L'annonce du moment":'— Breaking news',
    '— Calendrier':'— Schedule','— Timeline':'— Timeline','— Explorer':'— Explore','— Choisir la source':'— Pick a source',
    '— Tendances · Évolution post-tournois':'— Trends · Post-tournament shifts','— Top 15 archétypes':'— Top 15 archetypes',
    '— Les decks à connaître':'— Decks to know','— Tournois récents':'— Recent tournaments','— 15 équipes inscrites':'— 15 registered teams',
    '— Counter picks méta':'— Meta counter picks','— Nouvelles mécaniques':'— New mechanics','— Événements liés au set':'— Set-related events',
    'Les compétitions':'The competitions','du moment.':'happening now.','Ce qui sort':"What's coming",'tout de suite.':'right away.',
    'Tous les matchs détaillés':'All matches in detail','Quels decks ont-ils choisi ?':'Which decks did they pick?',
    'Équipes & rosters':'Teams & rosters','Tournois à venir':'Upcoming tournaments','Derniers résultats majeurs':'Latest major results',
    'Decks qui performent':'Top performing decks','Qui monte, qui descend ?':"Who's rising, who's falling?",
    'Le méta post-rotation':'The post-rotation meta','Calendrier':'Schedule',
    // Tournois / cartes stats
    'Équipes':'Teams','Matchs/équipe':'Matches/team','Saison':'Season','Joueurs poule':'Pool players','Format match':'Match format',
    'Matchs/joueur':'Matches/player','Entrée/équipe':'Entry/team','Cagnotte 1er/2e':'Prize pool 1st/2nd','Joueurs':'Players',
    'Format saison':'Season format','Système de points':'Points system','Récompenses':'Rewards','Forfaits':'Forfeits',
    'Construction des decks':'Deck building','Condition de victoire':'Win condition','Ban list évolutive':'Evolving ban list',
    'Promotion / Relégation':'Promotion / Relegation',
    '📄 Lire le règlement complet':'📄 Read the full rulebook','📄 Lire le règlement complet (traduit en français)':'📄 Read the full rulebook (French translation)',
    'Suivre les matchs en direct':'Watch the matches live',
    // Méta / decks
    'Méta share':'Meta share','Win rate':'Win rate','Top usage':'Top usage','Usage':'Usage','Bilan V-D-N':'W-L-D record',
    'Top 10 — Utilisation':'Top 10 — Usage','Top 10 — Taux de victoire (usage ≥ 2%)':'Top 10 — Win rate (usage ≥ 2%)',
    'Qui entre / qui sort':"Who's in / who's out",'↗ Entrent dans le top':'↗ Entering the top','↘ Sortent du top':'↘ Leaving the top',
    'Sorties & événements à venir':'Upcoming releases & events','Tier list compétitive':'Competitive tier list','Résultats récents':'Recent results',
    // PBL divers
    'Égalité':'Draw','Demi-finales':'Semifinals','Finale':'Final','Playoffs':'Playoffs','Fermer':'Close',
    // Sous-titres de sections live
    'Méta Pocket du jour':'Pocket meta of the day','VGC — état du format Champions':'VGC — Champions format status','Unite — tier list du jour':'Unite — tier list of the day',
    'Le prochain catalyseur de la méta Pocket':'The next Pocket meta catalyst','Prochain event':'Next event','Prochain set':'Next set',
    // Timeline accueil (générée)
    'Maintenance mensuelle':'Monthly maintenance',
    "Maintenance technique — possibles ajustements d'équilibrage ou correctifs.":'Technical maintenance — possible balance tweaks or fixes.',
    'Pokémon Champions — sortie mobile':'Pokémon Champions — mobile release',
    'Sortie mondiale iOS/Android. Cross-platform Switch et compatible Pokémon HOME.':'Worldwide iOS/Android release. Cross-platform with Switch, Pokémon HOME compatible.',
    'Événement de collection estival (estimé)':'Summer collection event (estimated)',
    "Boosters spéciaux ou défis saisonniers attendus pour le début de l'été.":'Special boosters or seasonal challenges expected for early summer.',
    'Mini-set B3b (estimé)':'Mini-set B3b (estimated)',
    'Prochain set attendu ~5 semaines après Paradox Drive — le catalyseur que la méta attend.':'Next set expected ~5 weeks after Paradox Drive — the catalyst the meta awaits.',
    'BO7 avec ban de 2 decks. Le champion de la Saison 1 sera couronné.':'BO7 with 2 deck bans. The Season 1 champion will be crowned.',
    'PBL — Demi-finales playoffs':'PBL — Playoff semifinals','PBL — Grande Finale & 3e place':'PBL — Grand Final & 3rd place',
    'Set B4 — Annonce attendue':'Set B4 — Announcement expected',
    // Phrases PBL calendrier / dates
    'Saison régulière':'Regular season','Dernière journée saison régulière':'Last day of regular season','Dernière place du Top 4':'Last Top 4 spot'
  };
  // Règles de motifs pour le texte dynamique récurrent (nombres, mois, etc.) — appliquées si aucune correspondance exacte.
  var MOIS_EN={'janvier':'January','février':'February','mars':'March','avril':'April','mai':'May','juin':'June','juillet':'July','août':'August','septembre':'September','octobre':'October','novembre':'November','décembre':'December'};
  var DYN_RULES=[
    [/(\d)\s*joueurs\b/g,'$1 players'],
    [/(\d)\s*manches?\s*max\b/gi,'$1 games max'],
    [/·\s*Contrôle\b/g,'· Control'],[/·\s*Le plus joué\b/g,'· Most played'],[/·\s*Aggro\b/g,'· Aggro'],
    [/Dernière journée saison régulière/gi,'Last day of regular season'],
    [/Dernière place du Top\s*4/gi,'Last Top 4 spot'],
    [/Saison régulière/g,'Regular season'],
    [/saison régulière/g,'regular season'],
    [/\b(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})\b/g,function(m,d,mo,y){return MOIS_EN[mo]+' '+d+', '+y;}]
  ];
  function applyDynRules(s){ var out=s; DYN_RULES.forEach(function(r){ out=out.replace(r[0],r[1]); }); return out; }
  var I18N_EN_PREFIX=[
    ['Victoire ','Victory '],
    ['Égalité · ','Draw · '],
    ['Journée ','Day '],
    ['⛔ Éliminé en barrage','⛔ Eliminated in qualifier'],
    ['⛔ Éliminé en playoffs','⛔ Eliminated in playoffs'],
    ['⛔ Disqualifié','⛔ Disqualified'],
    ['✓ Mêmes decks','✓ Same decks'],
    ['🔄 Selections différentes','🔄 Different picks'],
    ['🔄 2 decks changés','🔄 2 decks changed']
  ];
  function translateNode(n){
    var t=n.nodeValue, key=t.trim(); if(!key) return;
    var tr=I18N_EN[key];
    if(tr==null){ for(var i=0;i<I18N_EN_PREFIX.length;i++){ var p=I18N_EN_PREFIX[i]; if(key.indexOf(p[0])===0){ tr=p[1]+key.slice(p[0].length); break; } } }
    if(tr==null){ var dr=applyDynRules(key); if(dr!==key) tr=dr; }
    if(tr!=null){ if(n.__fr==null) n.__fr=t; n.nodeValue=t.replace(key,tr); }
  }
  var MP_I18N_MAP=null;
  function i18nMap(){
    if(MP_I18N_MAP) return MP_I18N_MAP;
    MP_I18N_MAP=new Map();
    (window.MP_I18N_HTML||[]).forEach(function(p){ MP_I18N_MAP.set(p[0], p[1]); });
    return MP_I18N_MAP;
  }
  var I18N_SELECTORS='p, li, h1, h2, h3, h4, .desc, .section-info, .lead, .when, .timeline-title, .timeline-desc, .timeline-date, .label, .title, .subtitle, .meta, .hero-tag, .day-tab-date, .t-stat .l, .stat-mini .l, .qstat .l, .badge, .cta, .op-name, .modal-tag, .ptc-record, .session-meta, .match-result-label, .legend-item, .day-date, .day-title, .pmd-desc, .mp-sec';
  function applyLangElements(lang, root){
    var map=i18nMap(); if(!map.size) return;
    var els=(root||document).querySelectorAll(I18N_SELECTORS);
    for(var i=0;i<els.length;i++){
      var el=els[i];
      if(lang==='en'){
        if(el.__frH!=null) continue;
        var key=el.innerHTML.trim();
        var tr=map.get(key);
        if(tr!=null){ el.__frH=el.innerHTML; el.innerHTML=tr; }
      } else if(el.__frH!=null){ el.innerHTML=el.__frH; el.__frH=null; }
    }
  }
  var MP_OBS=null;
  function watchDynamic(lang){
    if(MP_OBS){ MP_OBS.disconnect(); MP_OBS=null; }
    if(lang!=='en') return;
    var t=null;
    MP_OBS=new MutationObserver(function(){
      if(t) clearTimeout(t);
      t=setTimeout(function(){
        if(currentLang()!=='en') return;
        applyLangElements('en');
        var w=document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false), n;
        while(n=w.nextNode()) translateNode(n);
      },250);
    });
    MP_OBS.observe(document.body,{childList:true,subtree:true});
  }
  function applyLang(lang){
    try{ localStorage.setItem('mp-lang',lang); }catch(e){}  // avant reRenderDynamic : tr() lit currentLang()
    reRenderDynamic();  // re-rend les sections dynamiques avec les champs _en (fallback FR)
    applyLangElements(lang);
    var w=document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false), n;
    while(n=w.nextNode()){
      if(lang==='en') translateNode(n);
      else if(n.__fr!=null){ n.nodeValue=n.__fr; n.__fr=null; }
    }
    document.documentElement.lang=lang;
    var b=document.getElementById('mpLangToggle'); if(b) b.textContent=(lang==='en'?'FR 🇫🇷':'EN 🇬🇧');
    watchDynamic(lang);
  }
  function currentLang(){ try{ return localStorage.getItem('mp-lang')||'fr'; }catch(e){ return 'fr'; } }
  function initLang(){
    var tabs=document.querySelector('.nav .tabs'); if(!tabs||document.getElementById('mpLangToggle')) return;
    var btn=document.createElement('button'); btn.className='tab'; btn.id='mpLangToggle';
    btn.textContent='EN 🇬🇧'; btn.title='Switch language';
    btn.addEventListener('click', function(){ applyLang(currentLang()==='fr'?'en':'fr'); });
    tabs.appendChild(btn);
    if(currentLang()==='en'){ setTimeout(function(){ applyLang('en'); },600); setTimeout(function(){ applyLang('en'); },2200); }
  }

  // ---- Accueil : date du jour, compteur Champions, timeline enrichie ----
  function freshenHome(){
    try{
      var mois=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
      var d=new Date();
      var tag=document.querySelector('#page-home .hero-tag');
      if(tag) tag.textContent=tag.textContent.replace(/\d{1,2} [a-zûé]+ 20\d\d/i, d.getDate()+' '+mois[d.getMonth()]+' '+d.getFullYear());
      document.querySelectorAll('#page-home .hero .stat-block').forEach(function(b){
        var l=b.querySelector('.label'); if(!l||!/Champions launch/i.test(l.textContent)) return;
        var n=b.querySelector('.num'); if(!n) return;
        var days=Math.ceil((new Date(2026,5,17).getTime()-Date.now())/86400000);
        n.innerHTML = days>0 ? days+'<span class="unit">j</span>' : '✅';
        if(days<=0) l.textContent='Champions mobile dispo';
      });
    }catch(e){}
  }
  function enrichTimeline(){
    try{
      var tl=document.querySelector('#page-home .timeline'); if(!tl||tl.querySelector('.mp-tl')) return;
      var items=[
        ['13 juin · PBL ⚔️','PBL — Demi-finales playoffs','FrogEX vs Imperium Alpha (19h) · Arci/US vs Tier Baguette (21h) — BO5.','global'],
        ['14 juin · PBL 👑','PBL — Grande Finale & 3e place','BO7 avec ban de 2 decks. Le champion de la Saison 1 sera couronné.','global'],
        ['15 juin · TCG POCKET','Maintenance mensuelle','Maintenance technique — possibles ajustements d\'équilibrage ou correctifs.','tcgp'],
        ['17 juin · VGC ⚡','Pokémon Champions — sortie mobile','Sortie mondiale iOS/Android. Cross-platform Switch et compatible Pokémon HOME.','vgc'],
        ['21 juin · TCG POCKET','Événement de collection estival (estimé)','Boosters spéciaux ou défis saisonniers attendus pour le début de l\'été.','tcgp'],
        ['~10 juillet · TCG POCKET','Mini-set B3b (estimé)','Prochain set attendu ~5 semaines après Paradox Drive — le catalyseur que la méta attend.','tcgp']
      ];
      items.forEach(function(it){
        var div=document.createElement('div'); div.className='timeline-item mp-tl '+it[3];
        div.innerHTML='<div class="timeline-date">'+esc(it[0])+'</div><div class="timeline-title">'+esc(it[1])+'</div><div class="timeline-desc">'+esc(it[2])+'</div>';
        tl.appendChild(div);
      });
    }catch(e){}
  }

  function run(){
    Promise.all([J('tcgp_data.json'),J('classic_data.json'),J('vgc_data.json'),J('unite_data.json')])
    .then(function(r){
      MP_DATA={tcgp:r[0],classic:r[1],vgc:r[2],unite:r[3]};
      reRenderDynamic();
      if(window.MetaPoke&&window.MetaPoke.bus) window.MetaPoke.bus.emit('mp:rendered');
    });
    mergePbl();
    renderPblMatches();
    initLang();
    freshenHome();
    setTimeout(enrichTimeline, 1800);
    setTimeout(enrichTimeline, 4500);
    injectReglement();
    injectPblTeams();
    startCountdown();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(run, 200); });
  else setTimeout(run, 200);
})();
