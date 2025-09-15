// Storage + util helpers (global, with try/catch)
(function(){
  try{
    const LS = window.LS_KEYS || { events: 'qp_events', checkins: 'checkins' };

    function readJSON(key, fallback){
      try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
    }
    function writeJSON(key, value){ try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }

    // Public helpers per spec
    function getJSON(key, fallback){ try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } }
    function setJSON(key, value){ try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
    function appendJSON(key, item){
      try {
        const raw = localStorage.getItem(key);
        const arr = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(arr)) { localStorage.setItem(key, JSON.stringify([item])); return; }
        arr.push(item); localStorage.setItem(key, JSON.stringify(arr));
      } catch { try{ localStorage.setItem(key, JSON.stringify([item])); } catch {} }
    }
    function clearKey(key){ try { localStorage.removeItem(key); } catch {} }

    function toCSV(rows, headers){
      try{
        const esc = (v) => { const s = String(v ?? ''); return (/[",\n]/.test(s)) ? '"' + s.replace(/"/g,'""') + '"' : s; };
        const arr = headers ? [headers, ...rows] : rows;
        return arr.map(r => r.map(esc).join(',')).join('\n');
      }catch{ return ''; }
    }
    function download(filename, content){
      try{
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
      }catch{}
    }

    // Legacy helpers kept for compatibility
    function listEvents(){ return readJSON(LS.events, []); }
    function saveEvent(evt){ const list=listEvents(); const i=list.findIndex(e=>e.id===evt.id); if(i>=0) list[i]=evt; else list.push(evt); writeJSON(LS.events, list); }
    function findEventByToken(token){ return listEvents().find(e=>e.token===token); }
    function listCheckins(){ return readJSON(LS.checkins, []); }
    function addCheckin(rec){ const list=listCheckins(); list.push(rec); writeJSON(LS.checkins, list); }
    function exportAll(){ try { return { events: listEvents(), checkins: listCheckins(), exportedAt: new Date().toISOString() }; } catch { return { events: [], checkins: [], exportedAt: '' }; } }
    function importAll(data){ try { if (data && typeof data==='object'){ if (Array.isArray(data.events)) writeJSON(LS.events, data.events); if (Array.isArray(data.checkins)) writeJSON(LS.checkins, data.checkins);} } catch {}
    function clearAll(){ try { localStorage.removeItem(LS.events); localStorage.removeItem(LS.checkins); } catch {} }

    // Expose globals
    window.getJSON = getJSON; window.setJSON = setJSON; window.appendJSON = appendJSON; window.clearKey = clearKey; window.toCSV = toCSV; window.download = download;
    window.listEvents = listEvents; window.saveEvent = saveEvent; window.findEventByToken = findEventByToken; window.listCheckins = listCheckins; window.addCheckin = addCheckin; window.exportAll = exportAll; window.importAll = importAll; window.clearAll = clearAll;
  }catch{}
})();
