import { withCORS } from './_utils/cors.js';
import { addScan } from './_lib/supa.js';

export default withCORS(async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const code = String(body.code||'').trim();
    const action = String(body.action||'').trim();
    const at = body.at ? new Date(body.at) : new Date();
    if (!/^[A-Za-z0-9]{8}$/.test(code)) return res.status(400).json({ error: 'code must be 8 alnum' });
    if (!['in','out'].includes(action)) return res.status(400).json({ error: 'action must be in|out' });
    const out = await addScan(code, action, at.toISOString());
    return res.status(200).json({ ok: true, data: out?.[0] || null });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'scan failed' });
  }
});

