begin;

-- Rename the service variable in owner setup mapping queries. Without this,
-- PostgreSQL treats service_id as ambiguous and rolls back every service save.
create or replace function public.save_appointment_setup(
  p_business_id uuid,
  p_actor_id uuid,
  p_setup jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  business_record public.businesses%rowtype;
  settings_json jsonb := p_setup->'settings';
  service_json jsonb;
  resource_json jsonb;
  window_json jsonb;
  override_json jsonb;
  v_service_id uuid;
  resource_id uuid;
  offering_id uuid;
  resource_user_id uuid;
  affected_rows integer;
  service_ids uuid[] := '{}';
  resource_ids uuid[] := '{}';
  services_json jsonb := coalesce(p_setup->'services','[]'::jsonb);
  resources_json jsonb := coalesce(p_setup->'resources','[]'::jsonb);
  windows_json jsonb := coalesce(p_setup->'windows','[]'::jsonb);
  overrides_json jsonb := coalesce(p_setup->'overrides','[]'::jsonb);
begin
  if p_actor_id is null or jsonb_typeof(p_setup) <> 'object'
    or jsonb_typeof(settings_json) <> 'object'
    or jsonb_typeof(services_json) <> 'array'
    or jsonb_typeof(resources_json) <> 'array'
    or jsonb_typeof(windows_json) <> 'array'
    or jsonb_typeof(overrides_json) <> 'array' then
    raise exception 'APPOINTMENT_SETUP_INVALID' using errcode = '22023';
  end if;
  if jsonb_array_length(services_json) > 30 or jsonb_array_length(resources_json) > 50
    or jsonb_array_length(windows_json) > 300 or jsonb_array_length(overrides_json) > 300 then
    raise exception 'APPOINTMENT_SETUP_TOO_LARGE' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.business_members member
    where member.business_id = p_business_id and member.user_id = p_actor_id
      and member.role = 'owner' and member.is_active
  ) then raise exception 'OWNER_REQUIRED' using errcode = '42501'; end if;
  select * into business_record from public.businesses
    where id = p_business_id and business_type = 'services' for update;
  if not found then raise exception 'BUSINESS_UNAVAILABLE' using errcode = 'P0002'; end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = settings_json->>'timezone') then
    raise exception 'INVALID_TIMEZONE' using errcode = '22023';
  end if;

  insert into public.appointment_settings(
    business_id,enabled,timezone,minimum_notice_minutes,booking_horizon_days,
    slot_interval_minutes,automatically_confirm,cancellation_cutoff_minutes,
    cancellation_terms,public_instructions,updated_by
  ) values (
    p_business_id,coalesce((settings_json->>'enabled')::boolean,false),settings_json->>'timezone',
    coalesce((settings_json->>'minimumNoticeMinutes')::integer,120),
    coalesce((settings_json->>'bookingHorizonDays')::integer,60),
    coalesce((settings_json->>'slotIntervalMinutes')::integer,15),
    coalesce((settings_json->>'automaticallyConfirm')::boolean,true),
    coalesce((settings_json->>'cancellationCutoffMinutes')::integer,1440),
    left(coalesce(settings_json->>'cancellationTerms',''),1200),
    left(coalesce(settings_json->>'publicInstructions',''),1200),p_actor_id
  ) on conflict (business_id) do update set
    enabled=excluded.enabled,timezone=excluded.timezone,
    minimum_notice_minutes=excluded.minimum_notice_minutes,
    booking_horizon_days=excluded.booking_horizon_days,
    slot_interval_minutes=excluded.slot_interval_minutes,
    automatically_confirm=excluded.automatically_confirm,
    cancellation_cutoff_minutes=excluded.cancellation_cutoff_minutes,
    cancellation_terms=excluded.cancellation_terms,
    public_instructions=excluded.public_instructions,
    updated_by=excluded.updated_by,updated_at=now();

  for resource_json in select value from jsonb_array_elements(resources_json) loop
    resource_id := coalesce(nullif(resource_json->>'id','')::uuid,gen_random_uuid());
    resource_user_id := nullif(resource_json->>'userId','')::uuid;
    if resource_user_id is not null and not exists (
      select 1 from public.business_members member
      where member.business_id=p_business_id and member.user_id=resource_user_id
        and member.is_active and member.role in ('owner','staff')
    ) then raise exception 'APPOINTMENT_RESOURCE_MEMBER_INVALID' using errcode = '22023'; end if;
    insert into public.appointment_resources(id,business_id,user_id,name,is_active)
      values(resource_id,p_business_id,resource_user_id,left(trim(resource_json->>'name'),120),
        coalesce((resource_json->>'isActive')::boolean,true))
      on conflict (id) do update set user_id=excluded.user_id,name=excluded.name,
        is_active=excluded.is_active,updated_at=now()
      where public.appointment_resources.business_id=excluded.business_id;
    get diagnostics affected_rows = row_count;
    if affected_rows = 0 then raise exception 'APPOINTMENT_RESOURCE_INVALID' using errcode = '22023'; end if;
    resource_ids := array_append(resource_ids,resource_id);
  end loop;
  update public.appointment_resources set is_active=false,updated_at=now()
    where business_id=p_business_id and not (id=any(resource_ids));

  update public.appointment_services set is_bookable=false,archived_at=coalesce(archived_at,now()),updated_at=now()
    where business_id=p_business_id and archived_at is null;
  for service_json in select value from jsonb_array_elements(services_json) loop
    v_service_id := coalesce(nullif(service_json->>'id','')::uuid,gen_random_uuid());
    offering_id := nullif(service_json->>'offeringItemId','')::uuid;
    if offering_id is not null and not exists (
      select 1 from public.offering_items offering
      where offering.id=offering_id and offering.business_id=p_business_id
    ) then raise exception 'APPOINTMENT_OFFERING_INVALID' using errcode = '22023'; end if;
    insert into public.appointment_services(
      id,business_id,offering_item_id,name,description,duration_minutes,buffer_minutes,
      price_minor,currency,price_is_fixed,payment_policy,deposit_minor,deposit_percent,
      capacity,requires_resource,requires_approval,is_bookable,public_instructions,internal_notes,archived_at
    ) values (
      v_service_id,p_business_id,offering_id,left(trim(service_json->>'name'),120),
      left(coalesce(service_json->>'description',''),1000),
      (service_json->>'durationMinutes')::integer,
      coalesce((service_json->>'bufferMinutes')::integer,0),
      coalesce((service_json->>'priceMinor')::integer,0),upper(coalesce(service_json->>'currency','USD')),
      coalesce((service_json->>'priceIsFixed')::boolean,true),
      coalesce(service_json->>'paymentPolicy','pay_in_person'),
      nullif(service_json->>'depositMinor','')::integer,
      nullif(service_json->>'depositPercent','')::integer,
      coalesce((service_json->>'capacity')::integer,1),
      coalesce((service_json->>'requiresResource')::boolean,false),
      coalesce((service_json->>'requiresApproval')::boolean,false),
      coalesce((service_json->>'isBookable')::boolean,false),
      left(coalesce(service_json->>'publicInstructions',''),1200),
      left(coalesce(service_json->>'internalNotes',''),1200),null
    ) on conflict (id) do update set
      offering_item_id=excluded.offering_item_id,name=excluded.name,description=excluded.description,
      duration_minutes=excluded.duration_minutes,buffer_minutes=excluded.buffer_minutes,
      price_minor=excluded.price_minor,currency=excluded.currency,price_is_fixed=excluded.price_is_fixed,
      payment_policy=excluded.payment_policy,deposit_minor=excluded.deposit_minor,
      deposit_percent=excluded.deposit_percent,capacity=excluded.capacity,
      requires_resource=excluded.requires_resource,requires_approval=excluded.requires_approval,
      is_bookable=excluded.is_bookable,public_instructions=excluded.public_instructions,
      internal_notes=excluded.internal_notes,archived_at=null,updated_at=now()
      where public.appointment_services.business_id=excluded.business_id;
    get diagnostics affected_rows = row_count;
    if affected_rows = 0 then raise exception 'APPOINTMENT_SERVICE_INVALID' using errcode = '22023'; end if;
    service_ids := array_append(service_ids,v_service_id);
    delete from public.appointment_service_resources mapping where mapping.service_id=v_service_id;
    if jsonb_typeof(coalesce(service_json->'resourceIds','[]'::jsonb)) <> 'array' then
      raise exception 'APPOINTMENT_SETUP_INVALID' using errcode = '22023';
    end if;
    for resource_id in select value::uuid from jsonb_array_elements_text(coalesce(service_json->'resourceIds','[]'::jsonb)) loop
      if not (resource_id=any(resource_ids)) then raise exception 'APPOINTMENT_RESOURCE_INVALID' using errcode = '22023'; end if;
      insert into public.appointment_service_resources(business_id,service_id,resource_id)
        values(p_business_id,v_service_id,resource_id);
    end loop;
    if coalesce((service_json->>'requiresResource')::boolean,false)
      and not exists (select 1 from public.appointment_service_resources mapping where mapping.service_id=v_service_id) then
      raise exception 'APPOINTMENT_RESOURCE_REQUIRED' using errcode = '22023';
    end if;
  end loop;

  delete from public.appointment_weekly_windows where business_id=p_business_id;
  for window_json in select value from jsonb_array_elements(windows_json) loop
    insert into public.appointment_weekly_windows(
      business_id,service_id,resource_id,day_of_week,opens_at,closes_at
    ) values (
      p_business_id,nullif(window_json->>'serviceId','')::uuid,
      nullif(window_json->>'resourceId','')::uuid,
      (window_json->>'dayOfWeek')::smallint,(window_json->>'opensAt')::time,
      (window_json->>'closesAt')::time
    );
  end loop;
  delete from public.appointment_date_overrides
    where business_id=p_business_id and local_date >= current_date;
  for override_json in select value from jsonb_array_elements(overrides_json) loop
    insert into public.appointment_date_overrides(
      business_id,service_id,resource_id,local_date,is_closed,opens_at,closes_at,note
    ) values (
      p_business_id,nullif(override_json->>'serviceId','')::uuid,
      nullif(override_json->>'resourceId','')::uuid,(override_json->>'localDate')::date,
      coalesce((override_json->>'isClosed')::boolean,false),
      nullif(override_json->>'opensAt','')::time,nullif(override_json->>'closesAt','')::time,
      left(coalesce(override_json->>'note',''),300)
    );
  end loop;
  return true;
end;
$$;
revoke all on function public.save_appointment_setup(uuid,uuid,jsonb) from public;
grant execute on function public.save_appointment_setup(uuid,uuid,jsonb) to service_role;

-- Availability intersects the appointment schedule with published business hours.
grant select on public.business_hours to service_role;

commit;
