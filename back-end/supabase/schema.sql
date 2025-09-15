-- Supabase Schema — Phase 2 Main Tables
create extension if not exists pgcrypto;

-- 1) Users
create table if not exists public.users (
  uuid uuid primary key,
  display_name text,
  email text unique,
  created_at timestamptz not null default now()
);

-- 2) Personal QR codes bound to a user (uuid)
create table if not exists public.qrcodes (
  uuid uuid primary key references public.users(uuid) on delete cascade,
  sig text,
  issued_at timestamptz not null default now(),
  status text not null default 'active'
);

-- 3) Bases (scan points/devices grouping)
create table if not exists public.bases (
  base_id text primary key,
  name text not null,
  cooldown_ms integer not null default 1500,
  created_at timestamptz not null default now()
);

-- 4) Scan events log
create table if not exists public.scan_events (
  id bigserial primary key,
  uuid uuid references public.users(uuid) on delete cascade,
  base_id text references public.bases(base_id) on delete set null,
  device_id text,
  direction text not null check (direction in ('IN','OUT')),
  ts timestamptz not null default now(),
  note text
);
create index if not exists idx_scan_events_uuid_base_ts on public.scan_events (uuid, base_id, ts desc);
create index if not exists idx_scan_events_base_ts on public.scan_events (base_id, ts desc);

-- 5) Sessions (paired in/out)
create table if not exists public.sessions (
  session_id bigserial primary key,
  uuid uuid references public.users(uuid) on delete cascade,
  base_id text references public.bases(base_id) on delete set null,
  in_event_id bigint references public.scan_events(id) on delete set null,
  out_event_id bigint references public.scan_events(id) on delete set null,
  in_at timestamptz not null,
  out_at timestamptz,
  duration_seconds integer,
  created_at timestamptz not null default now(),
  unique (uuid, base_id, in_at)
);
create index if not exists idx_sessions_uuid_base_in_at on public.sessions (uuid, base_id, in_at desc);
create index if not exists idx_sessions_base_in_at on public.sessions (base_id, in_at desc);
create index if not exists idx_sessions_uuid_out_at on public.sessions (uuid, out_at);

-- Enable RLS for all tables (policies are defined separately in policies.sql)
alter table public.users enable row level security;
alter table public.qrcodes enable row level security;
alter table public.bases enable row level security;
alter table public.scan_events enable row level security;
alter table public.sessions enable row level security;
