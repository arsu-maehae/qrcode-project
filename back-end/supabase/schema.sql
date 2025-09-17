-- Supabase Schema — Minimal: only track QR UUID and generation time

create table if not exists public.qr_generations (
  uuid text primary key,
  generated_at timestamptz not null default now()
);

create index if not exists idx_qr_generations_generated_at
  on public.qr_generations (generated_at desc);

-- Enable RLS (service role function bypasses RLS)
alter table public.qr_generations enable row level security;
