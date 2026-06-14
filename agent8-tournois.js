// METAPOKE · Agent 8 — Tournois auto : detecte les dossiers de tournois et met a jour l'index.
// Entree : items du noeud Drive (enfants de Tournois/) avec {id, name}. Sans IA.
const ROOT='1xczNCDCtJKs1zJOKdUchXCv-SVGh80Cp';
const HARD=/(pbl|pocket battle|imp[eé]rium|^imp\b|bbt)/i; // tournois deja geres en dur sur le site
function slug(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');}

const found=$input.all().map(i=>i.json).filter(t=>t&&t.id&&t.name);
const auto=found.filter(t=>!HARD.test(t.name)).map(t=>({
  id:slug(t.name), name:t.name.trim(), game:'pocket', type:'equipe', status:'en_cours',
  auto:true, icon:'🔥', subtitle:'TCG Pocket · Équipes', driveFolderId:t.id, journees:[]
}));

// recuperer l'index actuel pour preserver les entrees manuelles + les decklists deja saisies
let prev={tournaments:[]};
try{ prev=await this.helpers.httpRequest({url:'https://raw.githubusercontent.com/florian974fd974-arch/Meta-Pok-/main/data/tournaments_index.json?t='+Date.now(), json:true}); }catch(e){}
const manual=((prev&&prev.tournaments)||[]).filter(x=>!x.auto);
const prevAuto={}; ((prev&&prev.tournaments)||[]).filter(x=>x.auto).forEach(x=>{prevAuto[x.id]=x;});
auto.forEach(a=>{ var p=prevAuto[a.id]; if(p){ if(p.journees&&p.journees.length) a.journees=p.journees; if(p.status) a.status=p.status; } });

const out={updatedAt:new Date().toISOString(), tournamentsRootFolderId:ROOT, tournaments:manual.concat(auto)};
return [{json:{content:JSON.stringify(out,null,2), msg:'bot(tournois) '+new Date().toLocaleDateString('fr-FR')+' : '+auto.length+' auto / '+manual.length+' manuel'}}];
