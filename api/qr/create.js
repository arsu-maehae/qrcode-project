// api/qr/create.js
import { randomUUID } from 'node:crypto';
import allowCors from '../_utils/cors.js';
import { supabaseAdmin } from '../_lib/supa.js';

export const config = { runtime: 'nodejs' };

async function handler(req, res) {
  // CORS headers (สำรอง ถ้าใน allowCors ครอบไว้อยู่แล้ว ไม่เป็นไร)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    let body = {};
    try { body = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}'); } catch {}

    const incoming = body.uuid && String(body.uuid).trim();
    const uuid = incoming || randomUUID();

    const { error } = await supabaseAdmin
      .from('qr_generations')
      .upsert({ uuid }, { onConflict: 'uuid' });

    if (error) {
      console.error('[qr/create] insert error:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(201).json({ ok: true, uuid });
  } catch (e) {
    console.error('[qr/create] exception:', e);
    return res.status(500).json({ ok: false, error: 'Internal error' });
  }
}

export default allowCors(handler);
