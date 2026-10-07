-- QR and read-aloud codes share one expiry/rotation and the existing atomic
-- handoff transaction. The short secret is never stored in plaintext.
alter table public.square_pickup_codes add column manual_hash text
  check (manual_hash is null or manual_hash ~ '^[a-f0-9]{64}$');
create unique index square_pickup_codes_manual_hash_key
  on public.square_pickup_codes(manual_hash) where manual_hash is not null;
-- Existing RLS and service-role-only grants apply to this column too.
notify pgrst, 'reload schema';
