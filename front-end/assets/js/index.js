/*
เงื่อนไขการทดสอบ (Phase 1)
- เปิด index.html แล้วคลิก “สร้าง QR Code ของคุณ” → QR ปรากฏและคงอยู่ (ไม่หายเอง)
- เปิด checkin.html → กรอก uuid ที่ได้ → เช็คอินสำเร็จ → บันทึก localStorage
- เปิด dashboard.html → เห็นรายการ, ค้นหาได้, Export CSV ได้
*/

const btnGenerate = qs('#btn-generate');
const preview = qs('#qr-preview');
const info = qs('#qr-info');
const nameInput = qs('#name-input');
const emailInput = qs('#email-input');

// Ensure QRCode library is available (lazy-load from CDN if missing)
let _qrLoadPromise = null;
function loadQRCodeLib() {
  try {
    if (typeof window.QRCode === 'function') return Promise.resolve(true);
    if (_qrLoadPromise) return _qrLoadPromise;
    _qrLoadPromise = new Promise((resolve) => {
      try {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
        script.async = true;
        script.onload = () => resolve(typeof window.QRCode === 'function');
        script.onerror = () => resolve(false);
        document.head.appendChild(script);
      } catch {
        resolve(false);
      }
    });
    return _qrLoadPromise;
  } catch { return Promise.resolve(false); }
}

function safeRandomUUID() {
  try { if (crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID(); } catch {}
  try {
    // RFC4122 v4 via crypto.getRandomValues, fallback to Math.random if unavailable
    const rnds = (crypto && crypto.getRandomValues) ? crypto.getRandomValues(new Uint8Array(16)) : Array.from({length:16},()=>Math.floor(Math.random()*256));
    rnds[6] = (rnds[6] & 0x0f) | 0x40; // version 4
    rnds[8] = (rnds[8] & 0x3f) | 0x80; // variant
    const hex = [...rnds].map(b => b.toString(16).padStart(2, '0'));
    return `${hex[0]}${hex[1]}${hex[2]}${hex[3]}-${hex[4]}${hex[5]}-${hex[6]}${hex[7]}-${hex[8]}${hex[9]}-${hex[10]}${hex[11]}${hex[12]}${hex[13]}${hex[14]}${hex[15]}`;
  } catch {
    return String(Math.random()).slice(2, 10) + '-' + String(Math.random()).slice(2, 10);
  }
}

function renderQRCode(container, text) {
  if (!container) return;
  container.innerHTML = '';
  if (typeof window.QRCode !== 'function') {
    const p = document.createElement('p');
    p.textContent = text;
    container.appendChild(p);
    return;
  }
  new window.QRCode(container, { text, width: 256, height: 256, correctLevel: window.QRCode.CorrectLevel.M });
}

btnGenerate?.addEventListener('click', async () => {
  const display_name = (nameInput?.value||'').toString().trim();
  const email = (emailInput?.value||'').toString().trim();
  if (window.API_BASE) {
    try {
      const r = await fetch(apiUrl('/issue'),{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ display_name, email })
      });
      const data = await r.json();
      if (!r.ok || !data?.ok) throw new Error(data?.error||'issue failed');
      const { uuid, sig, qrUrl, issued_at } = data;
      const content = qrUrl || `${location.origin}/p?id=${uuid}&sig=${sig}`;
      await loadQRCodeLib();
      renderQRCode(preview, content);
      info.innerHTML = `UUID: <code>${uuid}</code> — <a href="${content}" target="_blank" rel="noopener">เปิดลิงก์</a><br>issued_at: ${new Date(issued_at).toLocaleString()}`;
      try { localStorage.setItem('lastUser', JSON.stringify({ uuid, issued_at, sig })); } catch {}
      return;
    } catch (err) {
      info.innerHTML = `<span class="danger">ออก QR ผ่าน API ไม่สำเร็จ (${String(err)})</span>`;
    }
  }
  // Fallback (no API): generate local uuid only
  const uuid = safeRandomUUID();
  const origin = (location && location.origin) ? location.origin : '';
  const qrData = `${origin}/p?id=${uuid}`;
  await loadQRCodeLib();
  renderQRCode(preview, qrData);
  info.innerHTML = `UUID: <code>${uuid}</code> — <a href="${qrData}" target="_blank" rel="noopener">เปิดลิงก์</a>`;
  try { localStorage.setItem('lastUser', JSON.stringify({ uuid, createdAt: Date.now() })); } catch {}
});
