begin;
set local statement_timeout='10s';
create temporary table security_profile_fixture(id uuid, label text) on commit drop;
insert into security_profile_fixture values(gen_random_uuid(),'a'),(gen_random_uuid(),'b');
insert into auth.users(id,raw_user_meta_data) select id,'{"display_name":"Local profile fixture"}'::jsonb from security_profile_fixture;
do $$ begin
perform set_config('request.jwt.claim.sub',(select id::text from security_profile_fixture where label='a'),true);
perform set_config('request.jwt.claim.role','authenticated',true);
end $$;
grant select on security_profile_fixture to authenticated;
set local role authenticated;
do $$ begin
 begin
  update public.profiles set display_name='' where id=auth.uid();
  raise exception 'Unexpected: empty display name accepted';
 exception when check_violation then
  if sqlerrm not like '%profiles_display_name_length%' then raise; end if;
  raise notice 'DEMONSTRATED23514: empty display_name violates profiles_display_name_length';
 end;
 update public.profiles set display_name=null where id=auth.uid();
 if not exists(select 1 from public.profiles where id=auth.uid() and display_name is null) then raise exception 'SQL NULL clear failed'; end if;
 raise notice 'PASS: own optional display_name can be cleared to NULL';
 if exists(select 1 from public.profiles where id=(select id from security_profile_fixture where label='b')) then raise exception 'Other profile read leaked'; end if;
 update public.profiles set display_name='Unwanted' where id=(select id from security_profile_fixture where label='b');
 if found then raise exception 'Cross-user profile write succeeded'; end if;
 raise notice 'PASS: cross-user profile read and write blocked by existing RLS';
 begin
  update public.profiles set display_name=repeat('x',101) where id=auth.uid();
  raise exception 'Overlength profile unexpectedly accepted';
 exception when string_data_right_truncation then
  raise notice 'PASS: overlength name rejected22001 by existing varchar100 column';
 end;
 perform set_config('request.jwt.claim.sub','',true);
 update public.profiles set display_name='Signed out';
 if found then raise exception 'Signed-out profile write succeeded'; end if;
 raise notice 'PASS: signed-out profile update affects no rows';
end $$;
reset role;
rollback;
