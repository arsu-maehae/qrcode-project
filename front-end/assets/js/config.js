// Config and tiny utilities (global)
// Phase 2 note: set window.API_BASE to your deployed Vercel URL (e.g., https://your-app.vercel.app/api)
(function(){
  try {
    window.APP_NAME = 'Open House QR Check-in';
    window.API_BASE = "https://qrcode-project-self.vercel.app";
    // Build API URL compatible with either API_BASE = 'https://host' or 'https://host/api'
    window.apiUrl = function(path){
      try{
        const base = String(window.API_BASE||'').replace(/\/$/, '');
        const seg = String(path||'');
        const p = seg.startsWith('/') ? seg : `/${seg}`;
        return base.endsWith('/api') ? `${base}${p}` : `${base}/api${p}`;
      }catch{ return String(path||''); }
    };
    window.ROUTES = { index: 'index.html', checkin: 'checkin.html', dashboard: 'dashboard.html' };
    window.LS_KEYS = { events: 'qp_events', checkins: 'checkins' };

    window.qs = function(sel, root=document){ try{ return root.querySelector(sel); }catch{ return null; } };
    window.qsa = function(sel, root=document){ try{ return Array.from(root.querySelectorAll(sel)); }catch{ return []; } };
    window.nowISO = function(){ try{ return new Date().toISOString(); }catch{ return ''; } };
    window.escapeHtml = function(s){ try{ return (s||'').toString().replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])); }catch{ return ''; } };
    window.copyText = function(text){
      try{
        if (navigator.clipboard) return navigator.clipboard.writeText(text);
        const ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
        return Promise.resolve();
      }catch{ return Promise.resolve(); }
    };
    window.uid = function(len=10){
      try{
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let s = '';
        crypto.getRandomValues(new Uint8Array(len)).forEach(n => s += chars[n % chars.length]);
        return s;
      }catch{ return String(Math.random()).slice(2, 2+len); }
    };
  } catch {}
})();
