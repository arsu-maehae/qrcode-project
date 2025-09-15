-- RLS — enable on all phase-2 tables (policies can be added as needed)
-- Assumes tables are created by supabase/schema.sql

alter table if exists public.users enable row level security;
alter table if exists public.qrcodes enable row level security;
alter table if exists public.bases enable row level security;
alter table if exists public.scan_events enable row level security;
alter table if exists public.sessions enable row level security;

-- Minimal public read access: allow anon SELECT only on scan_events
drop policy if exists anon_select_scan_events on public.scan_events;
create policy anon_select_scan_events on public.scan_events
  for select using (true);

-- Note:
-- - Other tables (users, qrcodes, bases, sessions) remain non-readable for anon.
-- - Dashboards that need richer aggregates should call the serverless summary API
--   (which uses the Service Role key) instead of reading tables directly.
