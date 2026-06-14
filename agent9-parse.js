// runOnceForAllItems : parse la réponse Claude -> bbt_weekly.json
var resp = $input.first().json;
var text = '';
try { text = (resp.content||[]).map(function(c){return c.text||'';}).join(''); } catch(e) { text = ''; }
if(!text) text = typeof resp === 'string' ? resp : JSON.stringify(resp);
var data;
try { data = JSON.parse(text); }
catch(e){ var m = text.match(/\{[\s\S]*\}/); data = m ? JSON.parse(m[0]) : { weeks:[] }; }
if(!data || !data.weeks) data = { weeks: [] };
data.updatedAt = new Date().toISOString().slice(0,10);
return [{ json:{
  content: JSON.stringify(data, null, 2),
  msg: 'bot(bbt-vision) ' + new Date().toLocaleDateString('fr-FR') + ' : ' + (data.weeks.length) + ' semaine(s)'
}}];
