import { withCORS } from './_utils/cors.js';
import { listStats } from './_lib/supa.js';

export default withCORS(async function handler(req, res) {
  if (!['GET','POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  try {
    const limit = Number(req.query.limit || 500);
    const rows = await listStats(Math.min(Math.max(limit, 1), 2000));
    return res.status(200).json({ ok: true, data: rows });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'stats failed' });
  }
});

