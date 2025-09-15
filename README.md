# Open House QR Check-in — Phase 2 (Supabase + Vercel)

Front-end only prototype (Phase 1) is upgraded with a minimal backend using:
- Supabase (Postgres + PostgREST) for persistence
- Vercel Serverless API (TypeScript, Edge runtime) for endpoints and CORS

This repo remains usable offline (localStorage fallback). When `API_BASE` is configured, the UI calls the backend.

## File Structure (key parts)
- `front-end/` — Browser UI (HTML/CSS/Vanilla JS)
- `api/` — Vercel serverless functions
  - `issue.ts` — POST: create personal QR (UUID8)
  - `scan.ts` — POST: scan in/out + basic session management
  - `summary.ts` — GET: combined dashboard summary
  - plus: `qr/create.js`, `scan.js`, `stats.js`, `export-csv.js` (JS variants)
- `shared/` — server-side helpers
  - `db.ts` (Supabase REST helpers), `hmac.ts` (sign/verify), `types.ts`
- `supabase/` — Database setup
  - `schema.sql` (DDL tables), `policies.sql` (RLS + policies)
- `.env.example` — Example env for Vercel/Local

## Prerequisites
- Supabase project (URL + Service Role Key)
- Vercel account
- Any static server for local UI (e.g., VSCode Live Server)

## 1) Supabase Setup
1) สร้างโปรเจกต์ใน Supabase.io
- เลือก Region/Password ตามต้องการ
- รอสร้างเสร็จ แล้วเข้า Project → Settings → API เพื่อดู URL/Keys

2) รันสคีมาและนโยบาย RLS
- เปิด SQL Editor → วางและรันไฟล์เหล่านี้ตามลำดับ:
  - `supabase/schema.sql` (DDL ตารางหลัก: users, qrcodes, bases, scan_events, sessions + index + enable RLS)
  - `supabase/policies.sql` (เปิด RLS ทุกตาราง, อนุญาตอ่านสาธารณะเฉพาะ scan_events)

3) เก็บค่า ENV สำหรับ Vercel
- `SUPABASE_URL` (Project Settings → API → URL)
- `SUPABASE_ANON_KEY` (anon public key)
- `SUPABASE_SERVICE_ROLE` (Service Role key — ใช้เฉพาะฝั่งเซิร์ฟเวอร์)

## 2) Vercel Setup
1. Import this repo into Vercel.
2. Project → Settings → Environment Variables:
   - `SUPABASE_URL = https://YOUR-PROJECT.supabase.co`
   - `SUPABASE_ANON_KEY = YOUR-ANON-PUBLIC-KEY`
   - `SUPABASE_SERVICE_ROLE = YOUR-SERVICE-ROLE-KEY`
   - `HMAC_SECRET = change_me_strong_secret`
   - (ทางเลือก) `FRONTEND_BASE = https://your-frontend-domain` ใช้สร้าง qrUrl ใน /api/issue
3. Deploy.

Endpoints will be available at `https://YOUR-APP.vercel.app/api`.

## 3) Front-end (Local / Static Hosting)
- Open `front-end/index.html` directly or via Live Server.
- To enable backend calls, set `API_BASE` (e.g., in `<head>`):
  ```html
  <script>window.API_BASE = 'https://YOUR-APP.vercel.app/api';</script>
  ```
- Without `API_BASE`, UI uses localStorage only (no errors).

## API Summary
- POST `/api/issue` — ออกบัตร QR ส่วนบุคคล (users + qrcodes)
  - Body: `{ display_name?: string, email?: string }`
  - Flow: idempotent ตาม email (ถ้ามี user เดิมจะ reuse uuid เดิม), สร้าง sig = HMAC(uuid+issued_at)
  - Response 200: `{ ok:true, uuid, sig, qrUrl, issued_at }`

- POST `/api/scan` — สแกนเข้า/ออก + จัดการ sessions
  - Body: `{ uuid: string, base_id: string, device_id?: string, direction?: 'IN'|'OUT' }`
  - ถ้าไม่ส่ง direction → toggle: มี session เปิดที่ base_id → OUT, ไม่มีก็ IN
  - Cooldown: ถ้า IN และ session เดิมยังอยู่ในช่วง bases.cooldown_ms → ไม่เปิดซ้ำ (บันทึก event อย่างเดียว)
  - Response 200: `{ ok:true, state:'IN'|'OUT', session_id?, in_at?, out_at?, duration_seconds? }`

- GET `/api/summary` — ข้อมูลสรุปสำหรับ dashboard
  - Response 200: `{ ok:true, totals:{ users:number }, live:[{ base_id,count }], latest:[{ session_id, uuid, base_id, in_at, out_at, display_name }] }`

Optional JS variants kept for compatibility:
- `/api/qr/create`, `/api/scan`, `/api/stats`, `/api/export-csv`

## Test Locally (Phase 2)
1) Generate a QR (UUID8)
- Open `front-end/index.html`
- Click “สร้าง QR Code” → QR shown (8-char), localStorage updated
- If `API_BASE` set, server receives `POST /api/qr/create` (or use `/api/issue` manually)

2) Check-in and Check-out (demo manual)
- Open `front-end/checkin.html`
- Paste the 8-char UUID → click “เช็คอิน” and/or “เช็คเอาท์`
- With `API_BASE`, sends `POST /api/scan` accordingly

3) Dashboard
- Open `front-end/dashboard.html`
- If `API_BASE` is set: UI pulls `/api/stats` (or switch to `/api/summary`) for merged rows
- Otherwise: shows localStorage results (`qrCreated`, `checkins`, `checkouts`)
- Search by UUID substring, Export CSV

### cURL / Postman Examples
```bash
# 1) Issue a personal QR (idempotent by email)
curl -X POST "$API_BASE/issue" \
  -H "Content-Type: application/json" \
  -d '{"display_name":"Alice","email":"alice@example.com"}'

# Example successful response
# { "ok": true, "uuid": "1f7c7a6e-...", "sig": "<hex>", "qrUrl": "https://.../p?id=...&sig=...", "issued_at": "2025-09-15T10:20:30.000Z" }

# 2) Scan — explicit IN
curl -X POST "$API_BASE/scan" \
  -H "Content-Type: application/json" \
  -d '{"uuid":"<UUID-from-issue>","base_id":"main_gate","device_id":"dev-1","direction":"IN"}'

# 2.1) Scan — toggle (no direction); if session open → OUT, else IN
curl -X POST "$API_BASE/scan" \
  -H "Content-Type: application/json" \
  -d '{"uuid":"<UUID>","base_id":"main_gate"}'

# 3) Summary
curl "$API_BASE/summary"
# { ok:true, totals:{ users: 10 }, live:[{ base_id:"main_gate", count:3 }], latest:[ ... 50 items ... ] }
```

## Data Model (Phase 2)
- users(uuid uuid PK, display_name text, email text unique, created_at timestamptz default now())
- qrcodes(uuid uuid PK FK->users(uuid) on delete cascade, sig text, issued_at timestamptz default now(), status text default 'active')
- bases(base_id text PK, name text not null, cooldown_ms integer default 1500, created_at timestamptz default now())
- scan_events(id bigserial PK, uuid uuid FK->users, base_id text FK->bases, device_id text, direction IN|OUT, ts timestamptz default now(), note text)
  - index: (uuid, base_id, ts desc), (base_id, ts desc)
- sessions(session_id bigserial PK, uuid uuid FK->users, base_id text FK->bases, in_event_id bigint FK->scan_events, out_event_id bigint FK->scan_events, in_at timestamptz, out_at timestamptz, duration_seconds integer, created_at timestamptz default now(), unique (uuid, base_id, in_at))
  - index: (uuid, base_id, in_at desc), (base_id, in_at desc), (uuid, out_at)

RLS:
- เปิดอ่านสาธารณะ (anon SELECT) เฉพาะ `scan_events` เท่านั้น
- ตารางอื่นอ่าน/เขียนผ่าน Serverless API ที่ใช้ `SUPABASE_SERVICE_ROLE`

## Notes & Security
- ห้าม expose `SUPABASE_SERVICE_ROLE` ให้ฝั่งเบราว์เซอร์ (ตั้งใน Vercel เท่านั้น)
- การเขียน insert/update/delete ทำผ่าน API เท่านั้น ไม่เปิดนโยบายเขียนให้ client
- `shared/hmac.ts` ให้ `sign/verify` แบบ HMAC-SHA256(hex) สำหรับสร้าง/ตรวจ sig ของ QR
- API ใช้ Edge runtime (fetch Request/Response) พร้อม CORS + OPTIONS preflight

## Troubleshooting
- 401/403 from Supabase: verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` on Vercel.
- CORS errors: confirm requests target your `API_BASE` domain; endpoints handle OPTIONS.
- Front-end shows nothing: ensure Live Server or open the `front-end/*.html` directly; check Console.

## License
Internal demo; adjust to your org’s licensing policy.
