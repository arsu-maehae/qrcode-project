/*
Dashboard (Phase 2): ดึงข้อมูลจาก /api/summary ถ้ามี API_BASE
- totals.users
- live per base
- latest sessions (limit 50)
*/

const btnRefresh = qs('#btn-refresh');
const totalUsersEl = qs('#total-users');
const liveBody = qs('#table-live')?.querySelector('tbody');
const latestBody = qs('#table-latest')?.querySelector('tbody');

function td(s){ return `<td>${escapeHtml(String(s ?? ''))}</td>`; }
function fmt(t){ return t? new Date(t).toLocaleString() : '-'; }

async function render(){
  totalUsersEl.textContent = '-';
  liveBody.innerHTML = `<tr><td colspan="3" class="muted">Loading...</td></tr>`;
  latestBody.innerHTML = `<tr><td colspan="6" class="muted">Loading...</td></tr>`;

  if (window.API_BASE) {
    try {
      const r = await fetch(apiUrl('/summary'));
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error||'summary failed');
      const { totals, live, latest } = data;
      totalUsersEl.textContent = String(totals?.users ?? 0);
      liveBody.innerHTML = (live||[]).map((row,i)=> `<tr>${td(i+1)}${td(row.base_id)}${td(row.count)}</tr>`).join('') || `<tr><td colspan="3" class="muted">ไม่มีข้อมูล</td></tr>`;
      latestBody.innerHTML = (latest||[]).map((row,i)=> `<tr>${td(i+1)}${td(row.uuid)}${td(row.display_name||'')}${td(row.base_id||'')}${td(fmt(row.in_at))}${td(fmt(row.out_at))}</tr>`).join('') || `<tr><td colspan="6" class="muted">ไม่มีข้อมูล</td></tr>`;
      return;
    } catch (err) {
      totalUsersEl.textContent = 'ERR';
      liveBody.innerHTML = `<tr><td colspan="3" class="danger">โหลดสรุปไม่สำเร็จ</td></tr>`;
      latestBody.innerHTML = '';
      return;
    }
  }
  // Fallback: โหมดออฟไลน์ (localStorage)
  const qrs = getJSON('qrCreated', []);
  const checkins = getJSON('checkins', []);
  const checkouts = getJSON('checkouts', []);
  totalUsersEl.textContent = String(qrs.length);
  liveBody.innerHTML = `<tr><td colspan="3" class="muted">โหมดออฟไลน์</td></tr>`;
  const map = new Map();
  qrs.forEach(r=> map.set(r.uuid, { uuid:r.uuid, in_at:null, out_at:null }));
  checkins.forEach(r=> { const m=map.get(r.uuid)||{uuid:r.uuid}; m.in_at=r.time; map.set(r.uuid,m); });
  checkouts.forEach(r=> { const m=map.get(r.uuid)||{uuid:r.uuid}; m.out_at=r.time; map.set(r.uuid,m); });
  const rows = Array.from(map.values()).slice(0,50);
  latestBody.innerHTML = rows.map((row,i)=> `<tr>${td(i+1)}${td(row.uuid)}${td('')}${td('')}${td(fmt(row.in_at))}${td(fmt(row.out_at))}</tr>`).join('') || `<tr><td colspan="6" class="muted">ไม่มีข้อมูล</td></tr>`;
}

btnRefresh?.addEventListener('click', (e)=>{ e.preventDefault(); render(); });
render();

// Poll every 5 seconds if API is configured
if (window.API_BASE) {
  setInterval(() => { render(); }, 5000);
}
