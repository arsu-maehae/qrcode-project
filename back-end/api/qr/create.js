import { withCORS } from '../_utils/cors.js';
import { createQr } from '../_lib/supa.js';

export default withCORS(async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const code = String(body.code||'').trim();
    if (!/^[A-Za-z0-9]{8}$/.test(code)) return res.status(400).json({ error: 'code must be 8 alnum' });
    const meta = { ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null, ua: req.headers['user-agent'] || null };
    const out = await createQr(code, meta);
    return res.status(200).json({ ok: true, data: out?.[0] || null });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'create failed' });
  }
});

