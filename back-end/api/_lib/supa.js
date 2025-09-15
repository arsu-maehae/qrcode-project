// Minimal Supabase PostgREST client using fetch, no dependencies
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

function baseHeaders() {
  return {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
}

function rest(path) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase env not configured');
  return `${SUPABASE_URL.replace(/\/$/,'')}/rest/v1${path}`;
}

export async function createQr(code, meta = null) {
  const body = [{ code, meta }];
  const r = await fetch(rest('/qr_codes'), { method: 'POST', headers: baseHeaders(), body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`createQr failed: ${r.status}`);
  return r.json();
}

export async function addScan(code, action, atISO = null, meta = null) {
  const body = [{ code, action, scanned_at: atISO || new Date().toISOString(), meta }];
  const r = await fetch(rest('/scans'), { method: 'POST', headers: baseHeaders(), body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`addScan failed: ${r.status}`);
  return r.json();
}

export async function listStats(limit = 500) {
  const h = baseHeaders();
  const qrRes = await fetch(rest(`/qr_codes?select=code,created_at&order=created_at.desc&limit=${limit}`), { headers: h });
  if (!qrRes.ok) throw new Error(`qr list failed: ${qrRes.status}`);
  const qr = await qrRes.json();
  const scansRes = await fetch(rest(`/scans?select=code,action,scanned_at&order=scanned_at.desc&limit=${limit * 5}`), { headers: h });
  if (!scansRes.ok) throw new Error(`scans list failed: ${scansRes.status}`);
  const scans = await scansRes.json();
  const map = new Map(qr.map(r => [r.code, { uuid: r.code, createdAt: r.created_at, checkinAt: null, checkoutAt: null }]));
  for (const s of scans) {
    const curr = map.get(s.code) || { uuid: s.code, createdAt: null, checkinAt: null, checkoutAt: null };
    if (s.action === 'in') curr.checkinAt = curr.checkinAt && curr.checkinAt > s.scanned_at ? curr.checkinAt : s.scanned_at;
    if (s.action === 'out') curr.checkoutAt = curr.checkoutAt && curr.checkoutAt > s.scanned_at ? curr.checkoutAt : s.scanned_at;
    map.set(s.code, curr);
  }
  return Array.from(map.values()).sort((a,b)=> new Date(b.createdAt||b.checkinAt||b.checkoutAt||0) - new Date(a.createdAt||a.checkinAt||a.checkoutAt||0));
}

