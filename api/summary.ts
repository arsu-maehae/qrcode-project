import type { VercelRequest, VercelResponse } from 'vercel';
import { createClient } from '@supabase/supabase-js';

// CORS: allow GET only (+ preflight)
function setCORS(req: VercelRequest, res: VercelResponse) {
  try {
    const origin = (req.headers?.origin as string) || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
  } catch {}
}

function getEnv() {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE } = process.env as Record<string, string | undefined>;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE');
  }
  return { url: SUPABASE_URL.replace(/\/$/, ''), service: SUPABASE_SERVICE_ROLE };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCORS(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  console.log('[summary] start');
  let finished = false;
  const safeSend = (code: number, body: any) => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    try { res.status(code).json(body); } catch {}
  };
  const timer = setTimeout(() => {
    if (!finished) {
      console.log('[summary] timeout safeguard fired (8s)');
      safeSend(500, { ok: false, error: 'timeout after 8s' });
    }
  }, 8000);

  try {
    const { url, service } = getEnv();
    console.log('[summary] env ok');

    console.log('[summary] creating supabase client');
    const supa = createClient(url, service, { auth: { persistSession: false } });

    console.log('[summary] querying counts');
    console.time('[summary] users');
    const pUsers = supa.from('users').select('uuid', { count: 'estimated', head: true });
    console.time('[summary] qrcodes');
    const pQrcodes = supa.from('qrcodes').select('uuid', { count: 'estimated', head: true });
    console.time('[summary] scans');
    const pScans = supa.from('scan_events').select('uuid', { count: 'estimated', head: true });
    console.time('[summary] sessions');
    const pSessions = supa.from('sessions').select('session_id', { count: 'estimated', head: true });

    const [u, q, s, se] = await Promise.all([pUsers, pQrcodes, pScans, pSessions]);
    console.timeEnd('[summary] users');
    console.timeEnd('[summary] qrcodes');
    console.timeEnd('[summary] scans');
    console.timeEnd('[summary] sessions');

    if (u.error) throw u.error;
    if (q.error) throw q.error;
    if (s.error) throw s.error;
    if (se.error) throw se.error;

    const totals = {
      users: u.count ?? 0,
      qrcodes: q.count ?? 0,
      scans: s.count ?? 0,
      sessions: se.count ?? 0,
    };

    console.log('[summary] success', totals);
    return safeSend(200, { ok: true, totals });
  } catch (err: any) {
    console.log('[summary] error', err?.message || err);
    return safeSend(500, { ok: false, error: err?.message || 'summary failed' });
  }
}

