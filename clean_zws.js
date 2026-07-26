const S_URL = 'https://lkqvaovxiohkzgjsuwcd.supabase.co';
const KEY = 'sb_publishable_ePWcQ0S9-DDaNRUdsyTG-g__3Jz6ziX';

async function cleanDB() {
  // 1. Clean Timetables
  const ttRes = await fetch(S_URL + '/rest/v1/timetables?select=id,date', { headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY } });
  const ttData = await ttRes.json();
  for(let r of ttData) {
    if(r.date && r.date.includes('\u200B')) {
      const cleanDate = r.date.replace(/\u200B/g, '');
      await fetch(S_URL + '/rest/v1/timetables?id=eq.' + r.id, {
        method: 'PATCH',
        headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify({ date: cleanDate })
      });
      console.log('Cleaned TT:', r.id, '=>', cleanDate);
    }
  }

  // 2. Clean ui_settings keys
  const uiRes = await fetch(S_URL + '/rest/v1/ui_settings?limit=1000', { headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY } });
  const uiData = await uiRes.json();
  for(let u of uiData) {
    if(u.key.includes('\u200B')) {
      const cleanKey = u.key.replace(/\u200B/g, '');
      // Delete old key
      await fetch(S_URL + '/rest/v1/ui_settings?key=eq.' + encodeURIComponent(u.key), {
        method: 'DELETE',
        headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY }
      });
      // Insert ne| key
      await fetch(S_URL + '/rest/v1/ui_settings', {
        method: 'POST',
        headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: cleanKey, value: u.value })
      });
      console.log('Cleaned UI Key:', u.key);
    }
  }
}
cleanDB();
