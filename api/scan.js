import allowCors from './_utils/cors.js';

// Minimal placeholder to avoid broken imports during refactor.
// Adjust to actual DB schema if/when scan handling is implemented.
export default allowCors(async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { uuid = '', base_id = '', device_id = '', direction = '' } = body || {};
    // Echo back for now so front-end can proceed during dev
    return res.status(200).json({ ok: true, uuid, base_id, device_id, direction });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'scan failed' });
  }
});
