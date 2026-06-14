// runOnceForAllItems : regroupe les images par semaine et construit la requête Claude vision
var items = $input.all().map(function(i){return i.json;});
var byWeek = {};
items.forEach(function(it){ (byWeek[it.week] = byWeek[it.week] || []).push(it); });
var content = [{ type:'text', text:
  "Tu reçois des affiches de matchs du tournoi BBT (Pokémon TCG Pocket), groupées par semaine. "+
  "Sur chaque image, le grand titre (ex: CLOSE COMBAT, SHADOW BALL) est le nom du 'cast'. "+
  "Chaque ligne est un match: équipe A vs équipe B, un horaire (TIME ... GMT), et parfois un score/résultat. "+
  "Extrais TOUT fidèlement. Réponds UNIQUEMENT en JSON valide (aucun texte autour), au format exact: "+
  '{"weeks":[{"name":"Weekly 1","subtitle":"Saison régulière · Round Robin","casts":[{"name":"Close Combat","icon":"🔥","matches":[{"a":"Squad Zero","b":"Magma","when":"14 juin · 13:00 GMT","score":"3-1"}]}]}]} . '+
  "Convertis les dates en français court (ex: 'JUNE 14TH 2PM GMT' -> '14 juin · 14:00 GMT'). "+
  "Mets 'score' UNIQUEMENT si un résultat chiffré est visible sur l'affiche, sinon omets ce champ. "+
  "icon: 🔥 pour Close Combat, 🌑 pour Shadow Ball, 🏆 pour tout autre cast."
}];
Object.keys(byWeek).forEach(function(w){
  content.push({ type:'text', text:'=== Semaine: '+w+' ===' });
  byWeek[w].forEach(function(im){ content.push({ type:'image', source:{ type:'url', url:im.imgUrl } }); });
});
var body = { model:'claude-3-5-sonnet-20241022', max_tokens:2500, messages:[{ role:'user', content:content }] };
return [{ json:{ body:body, weeksFound:Object.keys(byWeek).length } }];
