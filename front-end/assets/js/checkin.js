/*
เช็คอินเดโม: กรอก UUID → บันทึกลง localStorage คีย์ "checkins"
*/

const input = qs('#uuid-input');
const btnCheckin = qs('#btn-checkin');
const btnCheckout = qs('#btn-checkout');
const btnToggle = qs('#btn-toggle');
const baseInput = qs('#base-input');
const deviceInput = qs('#device-input');
const btnClear = qs('#btn-clear');
const result = qs('#checkin-result');
const btnStartScan = qs('#btn-start-scan');
const btnStopScan = qs('#btn-stop-scan');
const videoEl = qs('#video');
const canvasEl = qs('#scan-canvas');
const scanStatus = qs('#scan-status');

function show(msg, type='info'){
  result.innerHTML = `<div class="${type}">${escapeHtml(msg)}</div>`;
}

btnCheckin?.addEventListener('click', async (e) => {
  e.preventDefault();
  const uuid = (input?.value||'').trim();
  const base_id = (baseInput?.value||'').trim();
  const device_id = (deviceInput?.value||'').trim();
  if (!uuid || uuid.length < 8) {
    show('กรุณาใส่ UUID ให้ถูกต้อง (อย่างน้อย 8 ตัวอักษร)', 'danger');
    return;
  }
  if (!base_id) { show('กรุณาใส่ Base ID', 'danger'); return; }
  const time = Date.now();
  if (window.API_BASE) {
    try {
      const r = await fetch(apiUrl('/scan'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid, base_id, device_id, direction: 'IN', at: time })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error||'scan failed');
      show(`IN สำเร็จ: ${uuid} — ${new Date(time).toLocaleString()}`, 'success');
      input.value=''; return;
    } catch (err) {
      show(`IN ไม่สำเร็จ: ${String(err)}`, 'danger'); return;
    }
  }
  // Fallback local
  appendJSON('checkins', { uuid, time });
  const human = new Date(time).toLocaleString();
  show(`(Local) เช็คอินสำเร็จ: ${uuid} — เวลา ${human}`, 'success');
  input.value='';
});

btnCheckout?.addEventListener('click', async (e) => {
  e.preventDefault();
  const uuid = (input?.value||'').trim();
  const base_id = (baseInput?.value||'').trim();
  const device_id = (deviceInput?.value||'').trim();
  if (!uuid || uuid.length < 8) {
    show('กรุณาใส่ UUID ให้ถูกต้อง (อย่างน้อย 8 ตัวอักษร)', 'danger');
    return;
  }
  if (!base_id) { show('กรุณาใส่ Base ID', 'danger'); return; }
  const time = Date.now();
  if (window.API_BASE) {
    try {
      const r = await fetch(apiUrl('/scan'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid, base_id, device_id, direction: 'OUT', at: time })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error||'scan failed');
      show(`OUT สำเร็จ: ${uuid} — ${new Date(time).toLocaleString()}`, 'success');
      input.value=''; return;
    } catch (err) {
      show(`OUT ไม่สำเร็จ: ${String(err)}`, 'danger'); return;
    }
  }
  appendJSON('checkouts', { uuid, time });
  const human = new Date(time).toLocaleString();
  show(`(Local) เช็คเอาท์สำเร็จ: ${uuid} — เวลา ${human}`, 'success');
  input.value='';
});

btnToggle?.addEventListener('click', async (e) => {
  e.preventDefault();
  const uuid = (input?.value||'').trim();
  const base_id = (baseInput?.value||'').trim();
  const device_id = (deviceInput?.value||'').trim();
  if (!uuid || uuid.length < 8) return show('กรุณาใส่ UUID ให้ถูกต้อง', 'danger');
  if (!base_id) return show('กรุณาใส่ Base ID', 'danger');
  const time = Date.now();
  if (window.API_BASE) {
    try {
      const r = await fetch(apiUrl('/scan'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid, base_id, device_id, at: time })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error||'scan failed');
      show(`Toggle ส่งสำเร็จ: state=${data.state || 'N/A'}`, 'success');
      return;
    } catch (err) {
      show(`Toggle ไม่สำเร็จ: ${String(err)}`, 'danger'); return;
    }
  }
  show('(Local) โหมด Toggle ยังไม่รองรับ', 'info');
});
// Camera scanning with jsQR (optional)
let stream = null; let rafId = 0; let lastScan = { text: '', at: 0 };

function parseUUIDFromText(text){
  try{
    if (/^https?:\/\//i.test(text)){
      const u = new URL(text);
      const id = u.searchParams.get('id');
      if (id && id.length >= 8) return id;
    }
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) return text;
    if (/^[A-Za-z0-9]{8}$/.test(text)) return text;
  }catch{}
  return '';
}

async function startScan(){
  try{
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('ไม่รองรับกล้อง');
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    videoEl.srcObject = stream; await videoEl.play();
    scanStatus.textContent = 'กำลังสแกน...';
    tick();
  }catch(err){
    scanStatus.textContent = 'เปิดกล้องไม่สำเร็จ';
  }
}

function stopScan(){
  try{ cancelAnimationFrame(rafId); }catch{}
  try{ videoEl.pause(); }catch{}
  if (stream){ stream.getTracks().forEach(t=>t.stop()); stream = null; }
  scanStatus.textContent = 'หยุดสแกน';
}

function tick(){
  rafId = requestAnimationFrame(tick);
  if (!videoEl.videoWidth) return;
  const w = canvasEl.width = videoEl.videoWidth;
  const h = canvasEl.height = videoEl.videoHeight;
  const ctx = canvasEl.getContext('2d');
  ctx.drawImage(videoEl, 0, 0, w, h);
  try{
    const img = ctx.getImageData(0,0,w,h);
    const code = window.jsQR ? window.jsQR(img.data, w, h) : null;
    if (code && code.data){
      const now = Date.now();
      if (code.data === lastScan.text && (now - lastScan.at) < 3000) return;
      lastScan = { text: code.data, at: now };
      scanStatus.textContent = 'พบ QR — กำลังส่ง...';
      const uuid = parseUUIDFromText(code.data);
      if (!uuid){ scanStatus.textContent = 'QR ไม่ถูกต้อง'; return; }
      input.value = uuid;
      const base_id = (baseInput?.value||'').trim();
      const device_id = (deviceInput?.value||'').trim();
      if (!base_id){ scanStatus.textContent = 'ใส่ Base ID ก่อน'; return; }
      const at = Date.now();
      if (window.API_BASE){
        try{
          const r = await fetch(apiUrl('/scan'), { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ uuid, base_id, device_id, at }) });
          const data = await r.json();
          if (!r.ok) throw new Error(data?.error||'scan failed');
          show(`สแกนสำเร็จ: state=${data.state||'N/A'} uuid=${uuid}`, 'success');
          scanStatus.textContent = 'สแกนสำเร็จ';
        }catch(err){ scanStatus.textContent = 'ส่งไม่สำเร็จ'; show(`Scan error: ${String(err)}`,'danger'); }
      }
    }
  }catch{}
}

btnStartScan?.addEventListener('click', (e)=>{ e.preventDefault(); startScan(); });
btnStopScan?.addEventListener('click', (e)=>{ e.preventDefault(); stopScan(); });
btnClear?.addEventListener('click', (e) => {
  e.preventDefault();
  if (confirm('ลบรายการเช็คอินทั้งหมดหรือไม่?')){
    try { clearKey('checkins'); } catch {}
    show('ล้างข้อมูลสำเร็จ: ลบ key "checkins" จากเบราว์เซอร์แล้ว', 'info');
  }
});
