import { withCORS } from './_utils/cors.js';
import { listStats } from './_lib/supa.js';

function toCSV(rows){
  const esc = (v) => { const s = String(v ?? ''); return (/[",\n]/.test(s)) ? '"' + s.replace(/"/g,'""') + '"' : s; };
  const header = ['#','UUID','CreatedReadable','CheckinReadable','CheckoutReadable'];
  const body = rows.map((r,i)=> [i+1, r.uuid||'', r.createdAt?new Date(r.createdAt).toLocaleString():'' , r.checkinAt?new Date(r.checkinAt).toLocaleString():'' , r.checkoutAt?new Date(r.checkoutAt).toLocaleString():'' ]);
  return [header, ...body].map(r=>r.map(esc).join(',')).join('\n');
}

export default withCORS(async function handler(req, res) {
  if (!['GET','POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  try {
    const limit = Number(req.query.limit || 2000);
    const rows = await listStats(Math.min(Math.max(limit, 1), 5000));
    const csv = '\uFEFF' + toCSV(rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=checkins.csv');
    return res.status(200).send(csv);
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'export failed' });
  }
});

