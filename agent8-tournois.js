// METAPOKE · Agent 8 — Tournois auto (scan Drive -> tournaments_index.json, sans IA)
const ROOT='1xczNCDCtJKs1zJOKdUchXCv-SVGh80Cp';
const FOLDER='application/vnd.google-apps.folder';
const isImg=m=>/^image\//.test(m);
const thumb=id=>'https://drive.google.com/thumbnail?id='+id+'&sz=w600';
const HARD=/(pbl|pocket battle|imp[eé]rium|^imp\b|bbt)/i; // gérés en dur sur le site
function slug(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');}
async function ls(parent){
  const r=await this.helpers.httpRequestWithAuthentication.call(this,'googleApi',{
    method:'GET', url:'https://www.googleapis.com/drive/v3/files',
    qs:{q:"'"+parent+"' in parents and trashed=false", fields:'files(id,name,mimeType)', pageSize:1000, supportsAllDrives:true, includeItemsFromAllDrives:true},
    json:true
  });
  return (r&&r.files)||[];
}
const auto=[];
const tournois=await ls.call(this,ROOT);
for(const t of tournois){
  if(t.mimeType!==FOLDER) continue;
  if(HARD.test(t.name)) continue;
  for(const s of await ls.call(this,t.id)){
    if(s.mimeType!==FOLDER) continue;
    const journees=[];
    for(const day of await ls.call(this,s.id)){
      if(day.mimeType!==FOLDER) continue;
      const decks={};
      for(const team of await ls.call(this,day.id)){
        if(team.mimeType!==FOLDER) continue;
        const imgs=(await ls.call(this,team.id)).filter(f=>isImg(f.mimeType)).map(f=>({n:f.name.replace(/\.[a-z0-9]+$/i,''),img:thumb(f.id)}));
        if(imgs.length) decks[team.name.trim()]=imgs;
      }
      journees.push({id:slug(day.name),name:day.name.trim(),decks});
    }
    auto.push({id:slug(t.name)+'-'+slug(s.name),name:t.name.trim()+' — '+s.name.trim(),game:'pocket',type:'equipe',status:'en_cours',auto:true,icon:'🔥',subtitle:'TCG Pocket · Équipes',driveFolderId:s.id,journees});
  }
}
let prev={tournaments:[]};
try{ prev=await this.helpers.httpRequest({url:'https://raw.githubusercontent.com/florian974fd974-arch/Meta-Pok-/main/data/tournaments_index.json?t='+Date.now(),json:true}); }catch(e){}
const manual=((prev&&prev.tournaments)||[]).filter(x=>!x.auto);
const out={updatedAt:new Date().toISOString(),tournamentsRootFolderId:ROOT,tournaments:manual.concat(auto)};
return [{json:{content:JSON.stringify(out,null,2),msg:'bot(tournois) '+new Date().toLocaleDateString('fr-FR')+' : '+auto.length+' auto / '+manual.length+' manuel'}}];
