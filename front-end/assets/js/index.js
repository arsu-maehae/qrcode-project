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
      renderQRCode(preview, content);
      info.innerHTML = `UUID: <code>${uuid}</code> — <a href="${content}" target="_blank" rel="noopener">เปิดลิงก์</a><br>issued_at: ${new Date(issued_at).toLocaleString()}`;
      try { localStorage.setItem('lastUser', JSON.stringify({ uuid, issued_at, sig })); } catch {}
      return;
    } catch (err) {
      info.innerHTML = `<span class="danger">ออก QR ผ่าน API ไม่สำเร็จ (${String(err)})</span>`;
    }
  }
  // Fallback (no API): generate local uuid only
  const uuid = crypto.randomUUID();
  const qrData = `${location.origin}/p?id=${uuid}`;
  renderQRCode(preview, qrData);
  info.innerHTML = `UUID: <code>${uuid}</code> — <a href="${qrData}" target="_blank" rel="noopener">เปิดลิงก์</a>`;
  try { localStorage.setItem('lastUser', JSON.stringify({ uuid, createdAt: Date.now() })); } catch {}
});
