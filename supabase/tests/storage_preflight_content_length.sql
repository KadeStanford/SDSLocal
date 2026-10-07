begin;
\ir fixtures/business.sql
do $$
declare b uuid; actor uuid; asset_group uuid:=gen_random_uuid(); p text;
begin
 select fixture.business_id,fixture.owner_id into b,actor from database_test_fixture fixture;
 if b is null then raise exception 'Requires seeded business'; end if;
 perform public.create_business_media_staging_intent(actor,b,asset_group,'cover',null);
 p:=actor::text||'/'||b::text||'/'||asset_group::text||'/cover.webp';
 perform set_config('request.jwt.claim.sub',actor::text,true);
 if not public.can_insert_business_media_staging_object(p,'{"mimetype":"image/webp","contentLength":1000}'::jsonb) then raise exception 'Preflight length rejected'; end if;
 if not public.can_insert_business_media_staging_object(p,'{"mimetype":"image/webp","size":1000}'::jsonb) then raise exception 'Stored object size rejected'; end if;
 if public.can_insert_business_media_staging_object(p,'{"mimetype":"image/webp","size":1000000,"contentLength":1000}'::jsonb) then raise exception 'Actual oversized file accepted'; end if;
 if public.can_insert_business_media_staging_object(p,'{"mimetype":"image/webp","contentLength":1000000}'::jsonb) then raise exception 'Oversized preflight accepted'; end if;
 if public.can_insert_business_media_staging_object(p,'{"mimetype":"image/webp"}'::jsonb) then raise exception 'Missing length accepted'; end if;
 if public.can_insert_business_media_staging_object(p,'{"mimetype":"image/jpeg","contentLength":1000}'::jsonb) then raise exception 'Wrong MIME accepted'; end if;
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 if public.can_insert_business_media_staging_object(p,'{"mimetype":"image/webp","contentLength":1000}'::jsonb) then raise exception 'Different actor accepted'; end if;
 perform set_config('request.jwt.claim.sub',actor::text,true);
 update public.media_staging_upload_intents set expires_at=now()-interval '1 minute' where asset_group_id=asset_group;
 if public.can_insert_business_media_staging_object(p,'{"mimetype":"image/webp","contentLength":1000}'::jsonb) then raise exception 'Expired intent accepted'; end if;
end $$;
rollback;
