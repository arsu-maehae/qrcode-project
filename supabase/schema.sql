create table if not exists public.qr_generations (
  uuid text primary key,
  generated_at timestamptz not null default now()
);

alter table public.qr_generations enable row level security;

-- Optional read-only policy for anon (commented out by default):
-- create policy "public read qr_generations"
--   on public.qr_generations for select
--   to anon
--   using (true);

