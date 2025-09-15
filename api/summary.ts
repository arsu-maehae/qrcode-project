import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { applyCors, handlePreflight } from './_utils/cors.js';

function getEnv() {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE } = process.env as Record<string, string | undefined>;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE');
  }
  return { url: SUPABASE_URL.replace(/\/$/, ''), service: SUPABASE_SERVICE_ROLE };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[summary] incoming request');
  applyCors(req, res);
  if (handlePreflight(req, res)) {
    console.log('[summary] handled preflight');
    return;
  }
  if (req.method !== 'GET') {
    console.log('[summary] method not allowed', req.method);
    return res.status(405).json({ ok: false, msg: 'Method not allowed' });
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
      safeSend(504, { ok: false, msg: 'gateway timeout after 8s' });
    }
  }, 8000);

  try {
    console.log('[summary] reading env');
    const { url, service } = getEnv();
    console.log('[summary] env ok');

    console.log('[summary] creating supabase admin client');
    const supa = createClient(url, service, { auth: { persistSession: false } });

    console.log('[summary] querying counts (parallel, head-only)');
    console.time('[summary] users');
    const pUsers = supa.from('users').select('*', { count: 'exact', head: true });
    console.time('[summary] qrcodes');
    const pQrcodes = supa.from('qrcodes').select('*', { count: 'exact', head: true });
    console.time('[summary] scans');
    const pScans = supa.from('scan_events').select('*', { count: 'exact', head: true });
    console.time('[summary] sessions');
    const pSessions = supa.from('sessions').select('*', { count: 'exact', head: true });

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

    console.log('[summary] success totals', totals);
    return safeSend(200, { ok: true, totals, generatedAt: new Date().toISOString() });
  } catch (err: any) {
    console.log('[summary] error', err?.message || err);
    return safeSend(500, { ok: false, msg: err?.message || 'summary failed' });
  }
}
