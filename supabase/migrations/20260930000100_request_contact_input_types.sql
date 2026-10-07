-- Contact question types and the approved demo multiline correction.
begin;
create or replace function public.save_service_request_form(p_business_id uuid,p_revision integer,p_fields jsonb)
returns integer language plpgsql security definer set search_path='' as $$
declare f jsonb; new_revision integer; current_revision integer;
begin
 if not public.is_business_owner(p_business_id,auth.uid()) then raise exception 'Owner access is required.' using errcode='42501'; end if;
 if not exists(select 1 from public.businesses where id=p_business_id and business_type='services') then raise exception 'Choose a service business.' using errcode='22023'; end if;
 perform 1 from public.businesses where id=p_business_id for update;
 select revision into current_revision from public.service_request_forms where business_id=p_business_id;
 if coalesce(current_revision,0) is distinct from p_revision then raise exception 'This form changed. Reload it before saving.' using errcode='40001'; end if;
 if p_fields is null or jsonb_typeof(p_fields)<>'array' or jsonb_array_length(p_fields)>15 then raise exception 'Use up to 15 questions.' using errcode='22023'; end if;
 if (select count(*)<>count(distinct value->>'id') from jsonb_array_elements(p_fields)) then raise exception 'Question identifiers must be unique.' using errcode='22023'; end if;
 for f in select value from jsonb_array_elements(p_fields) loop
  if jsonb_typeof(f)<>'object' or coalesce(f->>'id','')!~'^[a-zA-Z0-9_-]{1,64}$' or char_length(trim(coalesce(f->>'label',''))) not between 1 and 120 or coalesce(f->>'type','') not in ('text','long_text','number','choice','yes_no','date','email','phone','url') or jsonb_typeof(f->'required') is distinct from 'boolean' then raise exception 'Check the question label, type and required setting.' using errcode='22023'; end if;
  if f->>'type'='choice' then
   if jsonb_typeof(f->'options') is distinct from 'array' then raise exception 'Add choice options.' using errcode='22023'; end if;
   if jsonb_array_length(f->'options') not between 2 and 12 or exists(select 1 from jsonb_array_elements(f->'options') o where jsonb_typeof(o)<>'string' or char_length(trim(o#>>'{}')) not between 1 and 80) or (select count(*)<>count(distinct trim(value)) from jsonb_array_elements_text(f->'options')) then raise exception 'Use 2–12 unique choice options.' using errcode='22023'; end if;
  end if;
 end loop;
 new_revision:=coalesce(current_revision,0)+1;
 insert into public.service_request_forms(business_id,revision,fields) values(p_business_id,new_revision,p_fields)
 on conflict(business_id) do update set revision=excluded.revision,fields=excluded.fields,updated_at=now();
 return new_revision;
end; $$;
revoke all on function public.save_service_request_form(uuid,integer,jsonb) from public;
grant execute on function public.save_service_request_form(uuid,integer,jsonb) to authenticated;


create or replace function public.submit_service_request(
  p_business_id uuid,
  p_idempotency_key uuid,
  p_request_message text,
  p_offering_item_id uuid default null,
  p_preferred_timing text default null,
  p_form_revision integer default null,
  p_answers jsonb default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  requester uuid := auth.uid();
  result_id uuid;
  display_label text;
  email_address text;
  form public.service_request_forms%rowtype;
  f jsonb; answer text; snapshot jsonb := '[]';
begin
  if requester is null then
    raise exception 'Sign in to contact this business.' using errcode = '42501';
  end if;
  if p_idempotency_key is null then
    raise exception 'Retry key is required.' using errcode = '22023';
  end if;
  -- A confirmed retry stays idempotent after an owner edits the form.
  select r.id into result_id from public.service_requests r where r.customer_id=requester and r.idempotency_key=p_idempotency_key;
  if result_id is not null then return result_id; end if;
  perform pg_advisory_xact_lock(hashtextextended(requester::text,0));
  select r.id into result_id from public.service_requests r where r.customer_id=requester and r.idempotency_key=p_idempotency_key;
  if result_id is not null then return result_id; end if;
  perform 1 from public.businesses where id=p_business_id for share;
  select * into form from public.service_request_forms where business_id=p_business_id;
  if coalesce(jsonb_array_length(form.fields),0)>0 and form.revision is distinct from p_form_revision then raise exception 'The business updated its questions. Reload the form and review your answers.' using errcode='22023'; end if;
  if p_answers is null or jsonb_typeof(p_answers)<>'object' or pg_column_size(p_answers)>40000 then raise exception 'Invalid request answers.' using errcode='22023'; end if;
  if exists(select 1 from jsonb_object_keys(p_answers) k where not exists(select 1 from jsonb_array_elements(coalesce(form.fields,'[]')) q where q->>'id'=k)) then raise exception 'The form changed. Reload its questions.' using errcode='22023'; end if;
  for f in select value from jsonb_array_elements(coalesce(form.fields,'[]')) loop
   if p_answers ? (f->>'id') and jsonb_typeof(p_answers->(f->>'id'))<>'string' then raise exception 'Answers must be text.' using errcode='22023'; end if;
   answer:=trim(coalesce(p_answers->>(f->>'id'),''));
   if answer='' then
    if (f->>'required')::boolean then raise exception 'Please answer: %',f->>'label' using errcode='22023'; end if;
    continue;
   end if;
   if char_length(answer)>(case when f->>'type'='long_text' then 2000 else 300 end) then raise exception 'Answer is too long: %',f->>'label' using errcode='22023'; end if;
   if f->>'type'='choice' and not (f->'options' ? answer) then raise exception 'Choose an available option: %',f->>'label' using errcode='22023'; end if;
   if f->>'type'='yes_no' and answer not in ('Yes','No') then raise exception 'Choose Yes or No.' using errcode='22023'; end if;
   if f->>'type'='number' and answer !~ '^-?[0-9]{1,10}(\.[0-9]{1,4})?$' then raise exception 'Enter a valid number.' using errcode='22023'; end if;
   if f->>'type'='email' and answer !~ '^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$' then raise exception 'Enter a valid email address.' using errcode='22023'; end if;
   if f->>'type'='phone' and (answer !~ '^\+?[0-9() .-]+$' or char_length(regexp_replace(answer,'[^0-9]','','g')) not between 7 and 15) then raise exception 'Enter a phone number with 7–15 digits.' using errcode='22023'; end if;
   if f->>'type'='url' and answer !~* '^https?://[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+(:[0-9]{1,5})?([/?#][^\s]*)?$' then raise exception 'Enter a website link starting with https:// or http://.' using errcode='22023'; end if;
   if f->>'type'='date' then
    begin
     if answer !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or to_char(answer::date,'YYYY-MM-DD')<>answer then raise exception 'bad date'; end if;
    exception when others then raise exception 'Enter a valid date (YYYY-MM-DD).' using errcode='22023'; end;
   end if;
   snapshot:=snapshot||jsonb_build_array(jsonb_build_object('id',f->>'id','label',f->>'label','type',f->>'type','value',answer));
  end loop;

  if char_length(trim(coalesce(p_request_message, ''))) not between 10 and 2000 then
    raise exception 'Add a little more detail (10–2000 characters).' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_preferred_timing, ''))) > 200 then
    raise exception 'Preferred timing is too long.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.businesses business
    where business.id = p_business_id and business.status = 'active'
      and business.business_type = 'services'
  ) then
    raise exception 'This service business is unavailable.' using errcode = 'P0002';
  end if;
  if p_offering_item_id is not null and not exists (
    select 1 from public.offering_items item
    where item.id = p_offering_item_id and item.business_id = p_business_id
      and item.is_visible and item.is_available
  ) then
    raise exception 'That service is no longer available.' using errcode = '22023';
  end if;

  select nullif(trim(profile.display_name), ''), nullif(trim(auth_user.email), '')
    into display_label, email_address
  from public.profiles profile
  left join auth.users auth_user on auth_user.id = profile.id
  where profile.id = requester;
  display_label := coalesce(display_label, split_part(coalesce(email_address, 'Customer'), '@', 1));
  if email_address is null then
    raise exception 'Add an email address to your account so the business can reply.' using errcode = '22023';
  end if;

  select request.id into result_id
  from public.service_requests request
  where request.customer_id = requester and request.idempotency_key = p_idempotency_key;
  if result_id is not null then return result_id; end if;

  if (select count(*) from public.service_requests request
      where request.customer_id = requester
        and request.status in ('new','in_review','contacted')
        and request.created_at >= now() - interval '24 hours') >= 5 then
    raise exception 'You have reached today’s request limit. Try again tomorrow.' using errcode = '54000';
  end if;

  insert into public.service_requests (
    business_id, customer_id, offering_item_id, idempotency_key,
    customer_name, customer_email, request_message, preferred_timing, form_revision, form_answers
  ) values (
    p_business_id, requester, p_offering_item_id, p_idempotency_key,
    left(display_label, 100), email_address, trim(p_request_message),
    nullif(trim(p_preferred_timing), ''), form.revision, snapshot
  ) returning id into result_id;

  return result_id;
end;
$$;
revoke all on function public.submit_service_request(uuid, uuid, text, uuid, text, integer, jsonb) from public;
grant execute on function public.submit_service_request(uuid, uuid, text, uuid, text, integer, jsonb) to authenticated;


-- Only correct the known landscape demo question, preserving custom forms and order.
with corrected as (
 select f.business_id, jsonb_agg(case when q.value->>'id'='access'
   and q.value->>'label'='Gate and yard access instructions' and q.value->>'type'='text'
   then jsonb_set(q.value,'{type}','"long_text"') else q.value end order by q.ordinality) as fields
 from public.service_request_forms f join public.businesses b on b.id=f.business_id
 cross join lateral jsonb_array_elements(f.fields) with ordinality q(value,ordinality)
 where b.slug ~ '^demo-playground-landscape-[1-8]$'
 group by f.business_id
)
update public.service_request_forms f set fields=c.fields,revision=f.revision+1,updated_at=now()
from corrected c where f.business_id=c.business_id and f.fields is distinct from c.fields;
commit;
