// POST /api/issue
// สร้างคิวอาร์โค้ด (UUID8) ส่วนบุคคล และบันทึกลง Supabase (ตาราง qr_codes)
// Body: { code?: string, owner?: string, note?: string, meta?: object }
// - ถ้าไม่ส่ง code มา จะสุ่ม 8 ตัวอักษร [A-Z0-9]
// Response: { ok: true, code, data }

import { sign as hmacSign } from '../shared/hmac.js';
import { getAdminClient } from '../shared/db.js';
import { cleanNote } from '../shared/validate.js';
import { preflight, json, badRequest, serverError } from '../shared/http.js';

export const config = { runtime: 'edge' };

const ALLOW_METHODS = 'GET,POST,OPTIONS';

// fetch-style handler uses shared/http.ts helpers for CORS

async function upsertUserAndQr(uuid: string, sig: string, owner?: string|null, note?: string|null) {
  const supa = getAdminClient();
  // upsert user
  const { error: e1 } = await supa.from('users').upsert([{ uuid, display_name: owner ?? null }]);
  if (e1) throw e1;
  // upsert qrcode (one per user)
  const { data, error: e2 } = await supa.from('qrcodes').upsert([{ uuid, sig, status: 'active' }]).select().single();
  if (e2) throw e2;
  return data;
}

export default async function handler(req: Request): Promise<Response> {
  const pf = preflight(req); if (pf) return pf;
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, req, 405);
  try {
    let body: any;
    try { body = await req.json(); } catch { return badRequest('Invalid JSON body', req); }
    // Sanitize input: trim and cap lengths; basic email format
    const display_name: string | undefined = body.display_name ? String(body.display_name).replace(/[\x00-\x1F\x7F]/g,'').trim().slice(0, 120) : undefined;
    const emailRaw: string | undefined = body.email ? String(body.email).trim().slice(0, 255) : undefined;
    const email: string | undefined = emailRaw && /.+@.+\..+/.test(emailRaw) ? emailRaw : undefined;
    const supa = getAdminClient();

    // 1) If email exists, reuse uuid (idempotent)
    let userUuid: string | null = null;
    if (email) {
      const { data: existing, error } = await supa.from('users').select('uuid').eq('email', email).maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      if (existing?.uuid) userUuid = existing.uuid;
    }

    // 2) Create user if not exists
    if (!userUuid) {
      userUuid = (globalThis.crypto?.randomUUID?.() || '').toString() || `${Date.now()}-xxxx`.replace('xxxx', Math.random().toString(36).slice(2,6));
      const { error: e1 } = await supa.from('users').insert([{ uuid: userUuid, display_name: display_name ?? null, email: email ?? null }]);
      if (e1) throw e1;
    }

    // 3) Build sig = HMAC(uuid + issued_at)
    // 4) Insert qrcodes(uuid, sig, issued_at) if not exists; if exists, keep existing (idempotent issuance)
    const nowISO = new Date().toISOString(); // issued_at in UTC
    const secret = process.env.HMAC_SECRET || 'dev_secret';
    const candidateSig = hmacSign(userUuid + nowISO, secret);

    // Check existing qrcode to be idempotent per user
    const { data: existingQr, error: e2 } = await supa.from('qrcodes').select('uuid, sig, issued_at').eq('uuid', userUuid).maybeSingle();
    if (e2 && e2.code !== 'PGRST116') throw e2;

    const sig = existingQr?.sig || candidateSig;
    const issued_at = existingQr?.issued_at || nowISO;
    if (!existingQr) {
      const { error: e3 } = await supa.from('qrcodes').insert([{ uuid: userUuid, sig, issued_at }]);
      if (e3) throw e3;
    }

    // 5) qrUrl = `${ORIGIN or FRONTEND_BASE}/p?id=${uuid}&sig=${sig}`
    const origin = process.env.FRONTEND_BASE || req.headers.get('origin') || '';
    const base = origin || (process.env.FRONTEND_BASE || '');
    const qrUrl = base ? `${String(base).replace(/\/$/, '')}/p?id=${encodeURIComponent(userUuid)}&sig=${encodeURIComponent(sig)}` : '';
    return json({ ok: true, uuid: userUuid, sig, qrUrl, issued_at }, req, 200);
  } catch (e: any) {
    return serverError(e?.message || 'issue failed', req);
  }
}
