// Supabase helpers using @supabase/supabase-js
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { ScanAction, SummaryRow } from './types.js';

function envs() {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE, SUPABASE_ANON_KEY } = process.env as Record<string, string | undefined>;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) throw new Error('Supabase env not configured');
  return { url: SUPABASE_URL, service: SUPABASE_SERVICE_ROLE, anon: SUPABASE_ANON_KEY };
}

let adminClient: SupabaseClient | null = null;
let publicClient: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (adminClient) return adminClient;
  const { url, service } = envs();
  adminClient = createClient(url, service, { auth: { persistSession: false } });
  return adminClient;
}

export function getPublicClient(): SupabaseClient {
  if (publicClient) return publicClient;
  const { url, anon } = envs();
  if (!anon) throw new Error('SUPABASE_ANON_KEY not set');
  publicClient = createClient(url, anon, { auth: { persistSession: false } });
  return publicClient;
}

// Common helpers
export async function insertScanEvent(uuid: string, direction: 'IN'|'OUT', base_id?: string|null, device_id?: string|null, ts?: string, note?: string|null) {
  const supa = getAdminClient();
  const { data, error } = await supa.from('scan_events').insert([{ uuid, base_id: base_id ?? null, device_id: device_id ?? null, direction, ts: ts ?? undefined, note: note ?? null }]).select().single();
  if (error) throw error; return data;
}

export async function getOpenSession(uuid: string, base_id?: string|null) {
  const supa = getAdminClient();
  const q = supa.from('sessions').select('session_id, uuid, base_id, in_at, out_at').eq('uuid', uuid).is('out_at', null).order('in_at', { ascending: false }).limit(1);
  if (base_id) q.eq('base_id', base_id);
  const { data, error } = await q.maybeSingle();
  if (error && error.code !== 'PGRST116') throw error; // no rows
  return data || null;
}

export async function createSession(uuid: string, base_id: string|null, in_event_id: number, in_at: string) {
  const supa = getAdminClient();
  const { data, error } = await supa.from('sessions').insert([{ uuid, base_id, in_event_id, in_at }]).select().single();
  if (error) throw error; return data;
}

export async function closeSession(session_id: number, out_event_id: number, out_at: string) {
  const supa = getAdminClient();
  // compute duration on DB side would be better; for now, update and let consumer compute
  const { data, error } = await supa.from('sessions').update({ out_event_id, out_at }).eq('session_id', session_id).select().single();
  if (error) throw error; return data;
}

export async function listSummary(limit = 1000): Promise<SummaryRow[]> {
  const supa = getAdminClient();
  // fetch issued_at from qrcodes and last IN/OUT from scan_events
  const [{ data: codes }, { data: scans }] = await Promise.all([
    supa.from('qrcodes').select('uuid, issued_at').order('issued_at', { ascending: false }).limit(limit),
    supa.from('scan_events').select('uuid, direction, ts').order('ts', { ascending: false }).limit(limit * 5)
  ]);
  const map = new Map<string, SummaryRow>();
  (codes||[]).forEach(r => map.set(r.uuid, { uuid: r.uuid, createdAt: r.issued_at, checkinAt: null, checkoutAt: null }));
  (scans||[]).forEach(s => {
    const row = map.get(s.uuid) || { uuid: s.uuid, createdAt: null, checkinAt: null, checkoutAt: null };
    if (s.direction === 'IN') row.checkinAt = (!row.checkinAt || row.checkinAt < s.ts) ? s.ts : row.checkinAt;
    if (s.direction === 'OUT') row.checkoutAt = (!row.checkoutAt || row.checkoutAt < s.ts) ? s.ts : row.checkoutAt;
    map.set(s.uuid, row);
  });
  return Array.from(map.values()).sort((a,b)=> new Date(b.createdAt||b.checkinAt||b.checkoutAt||0).getTime() - new Date(a.createdAt||a.checkinAt||a.checkoutAt||0).getTime());
}
