-- LOCAL fixture-runtime.mjs ONLY. Do not run in hosted Supabase or main seeds.
-- Fixed synthetic IDs, .example contacts, no auth signup or external dispatch.
begin;
do $$ begin
  if current_setting('parish.fixture_runtime',true) is distinct from 'synthetic-memory-only' then
    raise exception 'This fixture is restricted to the isolated admin fixture runtime';
  end if;
end $$;
insert into auth.users(id,raw_user_meta_data) values
 ('a0000000-0000-4000-8000-000000000001','{"display_name":"Synthetic moderator"}'),
 ('a0000000-0000-4000-8000-000000000002','{"display_name":"Synthetic business owner"}'),
 ('a0000000-0000-4000-8000-000000000003','{"display_name":"Synthetic customer"}'),
 ('a0000000-0000-4000-8000-000000000004','{"display_name":"Synthetic second customer"}');
insert into public.profiles(id,display_name) values
 ('a0000000-0000-4000-8000-000000000001','Synthetic moderator'),
 ('a0000000-0000-4000-8000-000000000002','Synthetic business owner'),
 ('a0000000-0000-4000-8000-000000000003','Synthetic customer'),
 ('a0000000-0000-4000-8000-000000000004','Synthetic second customer');
insert into public.platform_admins(user_id) values('a0000000-0000-4000-8000-000000000001');
insert into public.categories(name,slug) values('Synthetic local craft','synthetic-local-craft');

insert into public.businesses(id,created_by,slug,name,business_type,description,phone,email,address_line_1,city,region_code)
select ('b0000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,'a0000000-0000-4000-8000-000000000002',
 'synthetic-business-'||i,
 case i when 1 then 'Synthetic: Cypress Corner Bakery' when 2 then 'Synthetic: Bayou Bicycle Repair'
   when 3 then 'Synthetic: Moss & Clay Studio' when 4 then 'Synthetic: Moss & Clay Studio'
   when 5 then 'Synthetic: Parish Weekend Market' when 6 then 'Synthetic: Riverbend Florist'
   else 'Synthetic: GUARANTEED PROFIT OFFERS' end,'general',
 case i when 2 then 'Synthetic bicycle maintenance, puncture repairs and local commuter tune-ups. All details are fictional.' when 7 then 'Guaranteed profit, click here now! https://one.example https://two.example https://three.example https://four.example'
   else 'A fictional neighborhood business offering handmade goods and friendly local service. This record is synthetic test data.' end,
 '+1 225 555 01'||lpad(i::text,2,'0'),
 'owner'||i||'@synthetic.example',
 i||' Synthetic Lane','Baton Rouge','LA'
from generate_series(1,7) i;
insert into public.business_members(business_id,user_id,role,is_active)
select id,created_by,'owner',true from public.businesses;
insert into public.business_categories(business_id,category_id)
select b.id,c.id from public.businesses b cross join public.categories c;
insert into public.business_hours(business_id,day_of_week,opens_at,closes_at,is_closed)
select b.id,d,'09:00'::time,'17:00'::time,false from public.businesses b cross join generate_series(0,6) d;
insert into public.media_assets(asset_group_id,business_id,uploaded_by,storage_path,role,variant,status,mime_type,width,height,byte_size)
select gen_random_uuid(),b.id,b.created_by,'synthetic/'||b.id||'/'||role,
 role::public.photo_role,case when role='logo' then 'logo_standard' else 'cover' end::public.media_variant,
 'ready','image/png',400,400,1024
from public.businesses b cross join unnest(array['logo','cover']) role;
insert into public.business_photos(business_id,media_asset_id,role) select business_id,id,role from public.media_assets;
insert into public.offering_sections(id,business_id,name) values
 ('d0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000005','Synthetic market stalls');
insert into public.offering_items(id,business_id,section_id,name,description,price_minor) values
 ('d0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000005',
 'd0000000-0000-4000-8000-000000000001','Synthetic handmade candle','Fictional lavender candle, reusable glass jar.',1400);
insert into public.events(id,business_id,slug,title,description,starts_at,is_published) values
 ('e0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000005',
 'synthetic-market','Synthetic: Saturday Community Market','Fictional local makers gathering; all details are test data.',now()-interval '7 days',true);
-- Normal demo submissions use the authoritative validated RPC; no incomplete pending case.
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000002',false);
do $$ declare item record; begin
  for item in select id from public.businesses loop perform public.submit_business_for_review(item.id); end loop;
end $$;
select set_config('request.jwt.claim.sub','',false);
update public.businesses set submitted_at=now()-interval '3 days'+
  right(id::text,1)::integer*interval '2 hours',created_at=now()-interval '4 days'+right(id::text,1)::integer*interval '2 hours';
update public.businesses set submitted_at=now()-interval '2 days'+right(id::text,1)::integer*interval '2 minutes'
 where id in ('b0000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000007');
-- Eligible order/attendance prerequisites only. Actual review/report methods run in fixture-runtime.
-- Completed orders are simulated records; no checkout, charge, provider or payment transport exists.
insert into public.square_orders(id,business_id,customer_id,status,completed_at) select
 ('f0000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,'b0000000-0000-4000-8000-000000000005',
 'a0000000-0000-4000-8000-000000000003','completed',now()-interval '8 days' from generate_series(1,3)i;
insert into public.event_rsvps(id,event_id,customer_id,status,checked_in_at) values
 ('e1000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000003','going',now()-interval '7 days'),
 ('e1000000-0000-4000-8000-000000000002','e0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000004','going',now()-interval '7 days');
insert into public.service_requests(status) values('new'),('in_review');
insert into public.square_order_support_requests(status) values('open');
insert into public.appointments(status) values('requested'),('payment_review');
commit;
