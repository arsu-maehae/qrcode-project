-- RLS — enable on all phase-2 tables (policies can be added as needed)
-- Assumes tables are created by supabase/schema.sql

-- Minimal: only qr_generations is used
alter table if exists public.qr_generations enable row level security;

-- No anon access for qr_generations (service role via API bypasses RLS)

-- Note:
-- - Other tables (users, qrcodes, bases, sessions) remain non-readable for anon.
-- - Dashboards that need richer aggregates should call the serverless summary API
--   (which uses the Service Role key) instead of reading tables directly.
