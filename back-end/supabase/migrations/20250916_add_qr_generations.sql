-- Migration: add qr_generations table and RLS
-- Safe to run multiple times

create table if not exists public.qr_generations (
  uuid text primary key,
  generated_at timestamptz not null default now()
);

create index if not exists idx_qr_generations_generated_at on public.qr_generations (generated_at desc);

alter table public.qr_generations enable row level security;

-- No anon policies by default (service role will bypass RLS)

