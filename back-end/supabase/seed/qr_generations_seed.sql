-- Seed example for local verification
insert into public.qr_generations (uuid, generated_at)
values
  ('ABCDEFGH2345', now()),
  ('TESTCODE0001', now() - interval '5 minutes')
on conflict (uuid) do nothing;

