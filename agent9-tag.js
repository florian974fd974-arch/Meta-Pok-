// runOnceForEachItem : associe chaque image à sa semaine (via pairedItem) + URL publique
var wk = $('Weeklies').item.json;
return { json: {
  week: (wk && wk.name) ? String(wk.name).trim() : 'Weekly',
  imgUrl: 'https://lh3.googleusercontent.com/d/' + $json.id + '=w1400',
  imgName: $json.name
}};
