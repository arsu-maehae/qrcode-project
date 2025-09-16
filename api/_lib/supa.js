// api/_lib/supa.js
import { createClient } from '@supabase/supabase-js';
export const config = { runtime: 'nodejs' };

const url = process.env.SUPABASE_URL;
// รองรับทั้งตัวใหม่และตัวเก่า
const key = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE');
}

// <<< ให้ชื่อเดียวกันทั้ง named และ default >>>
export const supabaseAdmin = createClient(url, key, { auth: { persistSession: false } });
export default supabaseAdmin;
