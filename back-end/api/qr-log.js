import { withCORS } from './_utils/cors.js';
import { upsertQrGeneration } from './_lib/supa.js';

export default withCORS(async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const uuid = String(body.uuid || '').trim();
    const at   = body.generated_at ? new Date(body.generated_at) : new Date();

    // Accept 8-24 upper alnum to fit current frontend (12 chars, A-Z2-9)
    if (!/^[A-Z0-9]{8,24}$/.test(uuid)) return res.status(400).json({ error: 'uuid must be 8-24 uppercase alnum' });

    const record = await upsertQrGeneration(uuid, at.toISOString());
    return res.status(200).json({ ok: true, data: record });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'qr-log failed' });
  }
});

