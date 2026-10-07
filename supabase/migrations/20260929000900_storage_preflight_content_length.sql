begin;

create or replace function public.can_insert_business_media_staging_object(p_name text, p_metadata jsonb)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
declare
  max_bytes integer;
  size_text text;
begin
  if auth.uid() is null or coalesce(p_metadata ->> 'mimetype', '') <> 'image/webp' then return false; end if;
  -- Storage preflight supplies contentLength; completed objects supply size.
  -- Prefer the stored size, and reject missing, malformed, or oversized values.
  size_text := coalesce(p_metadata ->> 'size', p_metadata ->> 'contentLength');
  if size_text is null or size_text !~ '^[0-9]{1,10}$' then return false; end if;

  select (intent.variant_paths -> p_name ->> 'maxBytes')::integer into max_bytes
    from public.media_staging_upload_intents intent
   where intent.actor_id = auth.uid()
     and intent.status = 'active'
     and intent.expires_at > now()
     and intent.variant_paths ? p_name
     and exists (
       select 1 from public.business_members member
        where member.business_id = intent.business_id
          and member.user_id = intent.actor_id
          and member.role = 'owner'
          and member.is_active
     )
   limit 1;
  return max_bytes is not null and size_text::bigint > 0 and size_text::bigint <= max_bytes;
end;
$$;

revoke all on function public.can_insert_business_media_staging_object(text, jsonb)
  from public, anon;
grant execute on function public.can_insert_business_media_staging_object(text, jsonb)
  to authenticated;


commit;
