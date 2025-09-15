// GET /api/summary
// สรุปข้อมูลสำหรับ dashboard: รวมเวลาสร้าง QR / check-in / check-out และนับ active sessions

const ALLOW_METHODS = 'GET,POST,OPTIONS';

function setCORS(req: any, res: any) {
  try {
    const origin = req.headers?.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', ALLOW_METHODS);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
  } catch {}
}

function envs(){
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env as Record<string,string|undefined>;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase env not configured');
  return { SUPABASE_URL: SUPABASE_URL.replace(/\/$/, ''), SUPABASE_SERVICE_ROLE_KEY };
}

import { getAdminClient } from '../shared/db.js';
import { preflight, json, serverError } from '../shared/http.js';

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  const pf = preflight(req); if (pf) return pf;
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, req, 405);
  try {
    const supa = getAdminClient();
    const url = new URL(req.url);
    const limitParam = url.searchParams.get('limit');
    const limitNum = limitParam ? Number(limitParam) : 50;
    const limit = Math.min(Math.max(Number.isFinite(limitNum) ? limitNum : 50, 1), 200);

    // totals.users
    const { count: totalUsers, error: eUsers } = await supa.from('users').select('uuid', { count: 'exact', head: true });
    if (eUsers) throw eUsers;

    // live: sessions with out_at IS NULL -> count per base_id
    const { data: liveRows, error: eLive } = await supa.from('sessions').select('base_id, in_at, out_at').is('out_at', null);
    if (eLive) throw eLive;
    const liveMap = new Map<string, number>();
    (liveRows || []).forEach((r: any) => {
      const key = r.base_id || '(unknown)';
      liveMap.set(key, (liveMap.get(key) || 0) + 1);
    });
    const live = Array.from(liveMap.entries()).map(([base_id, count]) => ({ base_id, count })).sort((a,b)=> (b.count - a.count) || a.base_id.localeCompare(b.base_id));

    // latest: last N sessions joined with users
    const { data: latestRows, error: eLatest } = await supa
      .from('sessions')
      .select('session_id, uuid, base_id, in_at, out_at, users:users(display_name)')
      .order('in_at', { ascending: false })
      .limit(limit);
    if (eLatest) throw eLatest;
    const latest = (latestRows||[]).map((r: any) => ({
      session_id: r.session_id,
      uuid: r.uuid,
      base_id: r.base_id,
      in_at: r.in_at,
      out_at: r.out_at,
      display_name: r.users?.display_name || null
    }));

    return json({ ok: true, totals: { users: totalUsers ?? 0 }, live, latest }, req, 200);
  } catch (e: any) {
    return serverError(e?.message || 'summary failed', req);
  }
}
