begin;

-- Replaced media is marked pending_delete by the finalize RPCs. A cleanup job
-- can now claim those rows, remove the storage objects, and delete the metadata
-- without racing an in-flight upload or deleting a still-referenced asset.
alter table public.media_assets
  add column if not exists cleanup_claimed_at timestamptz;

create index if not exists media_assets_cleanup_claim_idx
  on public.media_assets (delete_after, cleanup_claimed_at)
  where status = 'pending_delete';

create or replace function public.claim_media_cleanup(p_limit integer default 100)
returns table (id uuid, bucket varchar, storage_path varchar)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with candidates as (
    select asset.id
    from public.media_assets asset
    where asset.status = 'pending_delete'
      and asset.delete_after is not null
      and asset.delete_after <= now()
      and (
        asset.cleanup_claimed_at is null
        or asset.cleanup_claimed_at < now() - interval '10 minutes'
      )
      and not exists (
        select 1 from public.business_photos photo where photo.media_asset_id = asset.id
      )
      and not exists (
        select 1 from public.offering_items item where item.media_asset_id = asset.id
      )
      and not exists (
        select 1 from public.events event_record where event_record.media_asset_id = asset.id
      )
      and not exists (
        select 1 from public.event_photos event_photo where event_photo.media_asset_id = asset.id
      )
      and not exists (
        select 1 from public.loyalty_programs program where program.media_asset_id = asset.id
      )
      and not exists (
        select 1 from public.profiles profile where profile.avatar_media_id = asset.id
      )
    order by asset.delete_after, asset.created_at
    for update skip locked
    limit least(greatest(coalesce(p_limit, 100), 1), 500)
  ), claimed as (
    update public.media_assets asset
    set cleanup_claimed_at = now()
    from candidates
    where asset.id = candidates.id
    returning asset.id, asset.bucket, asset.storage_path
  )
  select claimed.id, claimed.bucket, claimed.storage_path
  from claimed;
end;
$$;

revoke all on function public.claim_media_cleanup(integer) from public;
grant execute on function public.claim_media_cleanup(integer) to service_role;

commit;
