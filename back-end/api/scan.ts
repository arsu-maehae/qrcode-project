// POST /api/scan
// สแกนเข้า/ออก + จัดการ session
// Body: { code: string(8 alnum), action: 'in'|'out', at?: string|number, meta?: object }
// - บันทึกลงตาราง scans เสมอ
// - หาก action='in' แล้วไม่มี session เปิดของ code นี้ → สร้าง session ใหม่ (started_at)
// - หาก action='out' แล้วมี session เปิด → ปิด session (ตั้ง ended_at)

import { getAdminClient, insertScanEvent, getOpenSession, createSession, closeSession } from '../shared/db.ts';
import { preflight, json, badRequest, serverError, notFound } from '../shared/http.ts';
import { isUUID, isBaseId, cleanDeviceId, cleanNote } from '../shared/validate.ts';

export const config = { runtime: 'edge' };

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

function headersJSON(key: string){
  return { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' };
}

async function postScan(code: string, action: 'in'|'out', atISO: string, meta: any){
  // unused with new helpers
  return null as any;
}

async function getOpenSessionId(code: string){
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = envs();
  const url = `${SUPABASE_URL}/rest/v1/sessions?select=id&code=eq.${encodeURIComponent(code)}&ended_at=is.null&limit=1`;
  const r = await fetch(url, { headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } });
  if (!r.ok) throw new Error(`get session failed: ${r.status}`);
  const arr = await r.json();
  return Array.isArray(arr) && arr[0]?.id ? arr[0].id : null;
}

async function createSession(code: string, startedAtISO: string, meta: any){
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = envs();
  const url = `${SUPABASE_URL}/rest/v1/sessions`;
  const body = [{ code, started_at: startedAtISO, meta }];
  const r = await fetch(url, { method:'POST', headers: headersJSON(SUPABASE_SERVICE_ROLE_KEY), body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`create session failed: ${r.status}`);
  return r.json();
}

async function closeSession(id: number, endedISO: string){
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = envs();
  const url = `${SUPABASE_URL}/rest/v1/sessions?id=eq.${id}`;
  const r = await fetch(url, { method:'PATCH', headers: headersJSON(SUPABASE_SERVICE_ROLE_KEY), body: JSON.stringify({ ended_at: endedISO }) });
  if (!r.ok) throw new Error(`close session failed: ${r.status}`);
  return r.json();
}

export default async function handler(req: Request): Promise<Response> {
  const pf = preflight(req); if (pf) return pf;
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, req, 405);
  try {
    let body: any;
    try { body = await req.json(); } catch { return badRequest('Invalid JSON body', req); }
    // Extract and sanitize inputs
    const uuidRaw = String(body.uuid||'').trim();
    const baseIdRaw = String(body.base_id||'').trim();
    const device_id = cleanDeviceId(body.device_id);
    const note = cleanNote(body.note);
    let direction = String(body.direction||'').toUpperCase();
    const atVal = body.at ?? Date.now();
    const atISO = new Date(atVal).toISOString();
    // Validate uuid/base_id
    if (!isUUID(uuidRaw)) return badRequest('uuid must be a valid UUID', req);
    if (!baseIdRaw) return badRequest('base_id is required', req);
    if (!isBaseId(baseIdRaw)) return badRequest('base_id must match [A-Za-z0-9_-]{1,64}', req);

    // load base for cooldown
    const supa = getAdminClient();
    const { data: base, error: ebase } = await supa.from('bases').select('base_id, cooldown_ms').eq('base_id', baseIdRaw).maybeSingle();
    if (ebase && ebase.code !== 'PGRST116') throw ebase;
    if (!base) return notFound('base not found', req);

    const meta = { ip: req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || null, ua: req.headers?.['user-agent'] || null };

    // Determine direction if missing (toggle by open session)
    let open = await getOpenSession(uuidRaw, baseIdRaw);
    if (!['IN','OUT'].includes(direction)) direction = open ? 'OUT' : 'IN';

    // Insert scan event first
    const scanEvent = await insertScanEvent(uuidRaw, direction as 'IN'|'OUT', baseIdRaw, device_id, atISO, note);

    let response = { ok: true, state: direction } as any;

    if (direction === 'IN') {
      // If no open session, open one
      if (!open) {
        const sess = await createSession(uuidRaw, baseIdRaw, scanEvent.id, atISO);
        response.session_id = sess.session_id;
        response.in_at = sess.in_at;
      } else {
        // If open and within cooldown, skip reopening
        const diffMs = new Date(atISO).getTime() - new Date(open.in_at).getTime();
        if (diffMs <= (base.cooldown_ms ?? 1500)) {
          response.session_id = open.session_id;
          response.in_at = open.in_at;
        } else {
          // Still keep session open; no new session per spec
          response.session_id = open.session_id;
          response.in_at = open.in_at;
        }
      }
    } else {
      // OUT
      if (!open) {
        // optional: create zero-duration session
        const sess = await createSession(uuidRaw, baseIdRaw, scanEvent.id, atISO);
        await supa.from('sessions').update({ out_event_id: scanEvent.id, out_at: atISO, duration_seconds: 0 }).eq('session_id', sess.session_id);
        response.session_id = sess.session_id;
        response.in_at = atISO; response.out_at = atISO; response.duration_seconds = 0;
      } else {
        const closed = await closeSession(open.session_id, scanEvent.id, atISO);
        const duration = Math.max(0, Math.round((new Date(atISO).getTime() - new Date(open.in_at).getTime())/1000));
        await supa.from('sessions').update({ duration_seconds: duration }).eq('session_id', open.session_id);
        response.session_id = open.session_id;
        response.in_at = open.in_at; response.out_at = atISO; response.duration_seconds = duration;
      }
    }

    return json(response, req, 200);
  } catch (e: any) {
    return serverError(e?.message || 'scan failed', req);
  }
}
