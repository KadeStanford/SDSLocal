begin;

alter table public.square_orders
  add column refunded_minor bigint not null default 0,
  add column refund_amount_minor bigint,
  add column payment_resume_status text,
  add column dispute_state text,
  add column dispute_id text,
  add column disputed_minor bigint not null default 0,
  add column reviewed_refunded_minor bigint not null default 0;
alter table public.square_orders add constraint pickup_refund_total_check
  check (refunded_minor between 0 and total_minor and disputed_minor between 0 and total_minor and reviewed_refunded_minor between 0 and total_minor and (refund_amount_minor is null or refund_amount_minor between 1 and total_minor));
alter table public.square_orders drop constraint square_orders_status_check;
alter table public.square_orders add constraint square_orders_status_check check (status in (
  'checkout_pending','checkout_expired','checkout_failed','payment_review','placed','accepted',
  'preparing','ready','completed','refund_pending','refund_failed','refunded','dispute_lost'
));
update public.square_orders set refunded_minor = total_minor where status = 'refunded';
create function public.capture_pickup_payment_review() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status in ('payment_review','refund_pending') and old.status not in ('payment_review','refund_pending','refund_failed') then
    new.payment_resume_status := old.status;
  end if;
  return new;
end $$;
revoke all on function public.capture_pickup_payment_review() from public,anon,authenticated;
create trigger pickup_payment_review_capture before update on public.square_orders
for each row execute function public.capture_pickup_payment_review();

-- Signed compensating entries preserve the original ledger and work with all
-- existing SUM-based wallet/redemption readers, including a debt after a refund
-- when earned points have already been spent on another order.
alter table public.loyalty_transactions add column payment_adjustment text;
drop index public.loyalty_transactions_square_order_redemption_idx;
create unique index loyalty_transactions_square_order_redemption_idx on public.loyalty_transactions(square_order_id)
  where square_order_id is not null and transaction_type = 'redemption' and payment_adjustment is null;
alter table public.loyalty_transactions drop constraint loyalty_transaction_amount;
alter table public.loyalty_transactions drop constraint loyalty_transaction_action_amount;
alter table public.loyalty_transactions add constraint loyalty_transaction_amount check (coalesce((
  amount between 1 and 30 or (amount = -1 and payment_adjustment = 'reward_restored') or (amount = 0 and payment_adjustment = 'earnings_reversed' and transaction_type = 'reversal')
),false));
alter table public.loyalty_transactions add constraint loyalty_transaction_action_amount check (coalesce((
  (payment_adjustment is null and (
    (transaction_type = 'stamp' and amount = 1 and points_amount = 0 and spend_minor is null)
    or (transaction_type = 'redemption' and amount = 1 and points_amount >= 0 and spend_minor is null)
    or (transaction_type = 'points_earned' and amount = 1 and points_amount > 0 and spend_minor > 0)
    or (transaction_type = 'reversal' and points_amount = 0 and spend_minor is null)
  )) or (square_order_id is not null and (
    (payment_adjustment = 'reward_restored' and transaction_type = 'redemption' and amount = -1 and points_amount <= 0 and spend_minor is null)
    or (payment_adjustment = 'earnings_reversed' and transaction_type = 'points_earned' and amount = 1 and points_amount <= 0 and spend_minor > 0)
    or (payment_adjustment = 'earnings_reversed' and transaction_type = 'reversal' and amount in (0,1) and points_amount = 0 and spend_minor is null)
  ))
),false));
create unique index loyalty_payment_adjustment_once on public.loyalty_transactions(square_order_id, payment_adjustment)
  where payment_adjustment is not null;

create function public.settle_pickup_loyalty(p_order uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare o public.square_orders; source public.loyalty_transactions; earned public.loyalty_transactions;
  receipt public.square_pickup_confirmations; reversed_points integer;
begin
  select * into o from public.square_orders where id = p_order for update;
  if o.id is null then return; end if;
  select * into source from public.loyalty_transactions where square_order_id = o.id
    and transaction_type = 'redemption' and payment_adjustment is null;
  if source.id is not null then
    perform 1 from public.loyalty_memberships where id = source.membership_id for update;
    if o.status in ('checkout_expired','checkout_failed','refunded') then
      insert into public.loyalty_transactions(membership_id,business_id,transaction_type,amount,points_amount,
        actor_id,idempotency_key,square_order_id,payment_adjustment,note)
      values(source.membership_id,source.business_id,'redemption',-1,-source.points_amount,
        source.actor_id,gen_random_uuid(),o.id,'reward_restored','Checkout reward restored after unpaid checkout or full refund')
      on conflict (square_order_id,payment_adjustment) where payment_adjustment is not null do nothing;
    end if;
  end if;
  select * into receipt from public.square_pickup_confirmations where order_id = o.id;
  if receipt.transaction_id is null then return; end if;
  select * into earned from public.loyalty_transactions where id = receipt.transaction_id;
  if earned.id is null then return; end if;
  perform 1 from public.loyalty_memberships where id = earned.membership_id for update;
  if earned.transaction_type = 'points_earned' then
    reversed_points := floor(earned.points_amount::numeric * least(o.total_minor,o.refunded_minor + case when o.status = 'dispute_lost' then o.disputed_minor else 0 end) / o.total_minor)::integer;
    if reversed_points > 0 then
      insert into public.loyalty_transactions(membership_id,business_id,transaction_type,amount,points_amount,
        spend_minor,actor_id,idempotency_key,square_order_id,payment_adjustment,note)
      values(earned.membership_id,earned.business_id,'points_earned',1,-reversed_points,
        earned.spend_minor,earned.actor_id,gen_random_uuid(),o.id,'earnings_reversed','Pickup points reversed for returned payment')
      on conflict (square_order_id,payment_adjustment) where payment_adjustment is not null
      do update set points_amount = excluded.points_amount;
    else
      update public.loyalty_transactions set points_amount = 0 where square_order_id = o.id and payment_adjustment = 'earnings_reversed';
    end if;
  elsif earned.transaction_type = 'stamp' and (o.refunded_minor + case when o.status = 'dispute_lost' then o.disputed_minor else 0 end >= o.total_minor) then
    insert into public.loyalty_transactions(membership_id,business_id,transaction_type,amount,points_amount,
      actor_id,idempotency_key,square_order_id,reversal_of,payment_adjustment,note)
    values(earned.membership_id,earned.business_id,'reversal',1,0,earned.actor_id,gen_random_uuid(),o.id,
      earned.id,'earnings_reversed','Pickup visit reversed for returned payment')
    on conflict do nothing;
    update public.loyalty_transactions set amount = 1 where square_order_id = o.id and payment_adjustment = 'earnings_reversed';
  elsif earned.transaction_type = 'stamp' then
    update public.loyalty_transactions set amount = 0 where square_order_id = o.id and payment_adjustment = 'earnings_reversed';
  end if;
end;
$$;
revoke all on function public.settle_pickup_loyalty(uuid) from public,anon,authenticated;
grant execute on function public.settle_pickup_loyalty(uuid) to service_role;
create function public.pickup_loyalty_settlement_trigger() returns trigger
language plpgsql security definer set search_path = '' as $$
begin perform public.settle_pickup_loyalty(new.id); return new; end;
$$;
revoke all on function public.pickup_loyalty_settlement_trigger() from public,anon,authenticated;
create trigger pickup_loyalty_settlement after update of status,refunded_minor,disputed_minor on public.square_orders
for each row when (old.status is distinct from new.status or old.refunded_minor is distinct from new.refunded_minor)
execute function public.pickup_loyalty_settlement_trigger();
-- Repair historical terminal fixture/orders using the same idempotent path.
select public.settle_pickup_loyalty(id) from public.square_orders
where status in ('checkout_expired','checkout_failed','refunded');

alter table public.appointments add column payment_resume_status text,
  add column dispute_state text, add column dispute_id text;
alter table public.appointments drop constraint appointments_payment_status_check;
alter table public.appointments add constraint appointments_payment_status_check check (payment_status in (
  'none','pending','paid','refund_pending','refund_failed','refunded','reimbursed_external','review','dispute_lost'
));
create function public.apply_appointment_dispute(p_appointment uuid,p_payment text,p_id text,p_state text)
returns public.appointments language plpgsql security definer set search_path = '' as $$
declare a public.appointments;
begin
  select * into a from public.appointments where id = p_appointment for update;
  if a.id is null or a.square_payment_id is distinct from p_payment then raise exception 'APPOINTMENT_PAYMENT_MISMATCH'; end if;
  if a.dispute_id = p_id and a.dispute_state = p_state then return a; end if;
  update public.appointments set dispute_id = p_id,dispute_state = p_state,
    payment_resume_status = coalesce(payment_resume_status,case when status <> 'payment_review' then status end),
    payment_status = case when payment_status = 'refunded' then payment_status when p_state = 'LOST' then 'dispute_lost' when p_state in ('WON','RESOLVED') then 'paid' else 'review' end,
    status = case when status in ('completed','no_show') then status when p_state = 'LOST' then 'cancelled'
      when p_state in ('WON','RESOLVED') then case when status = 'cancelled' then 'cancellation_pending' else coalesce(payment_resume_status,'cancellation_pending') end else 'payment_review' end,
    checkout_url = null,version = version + 1 where id = a.id returning * into a;
  if p_state = 'LOST' then update public.appointment_holds set state = 'expired' where appointment_id = a.id and state in ('active','review'); end if;
  insert into public.appointment_events(appointment_id,actor_type,event_type,details) values(a.id,'provider','payment_updated',jsonb_build_object('disputeId',p_id,'disputeState',p_state));
  return a;
end $$;
revoke all on function public.apply_appointment_dispute(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.apply_appointment_dispute(uuid,text,text,text) to service_role;

create or replace function public.apply_appointment_provider_refund(
  p_appointment_id uuid,p_square_payment_id text,p_square_refund_id text,p_idempotency_key uuid,
  p_amount_minor integer,p_currency text,p_refund_state text
) returns public.appointments language plpgsql security definer set search_path = '' as $$
declare a public.appointments; r public.appointment_refunds; refunded integer; pending boolean;
begin
  select * into a from public.appointments where id = p_appointment_id for update;
  if a.id is null then raise exception 'APPOINTMENT_NOT_FOUND'; end if;
  if a.square_payment_id is distinct from p_square_payment_id or a.currency <> p_currency
    or p_amount_minor < 1 or p_amount_minor > a.amount_due_minor
    or p_refund_state not in ('PENDING','COMPLETED','FAILED','REJECTED') then
    raise exception 'APPOINTMENT_REFUND_MISMATCH' using errcode = '23514';
  end if;
  select * into r from public.appointment_refunds where square_refund_id = p_square_refund_id;
  if r.square_refund_id is not null and (r.appointment_id <> a.id or r.amount_minor <> p_amount_minor or r.currency <> p_currency) then
    raise exception 'APPOINTMENT_REFUND_MISMATCH' using errcode = '23514';
  end if;
  insert into public.appointment_refunds(square_refund_id,appointment_id,idempotency_key,amount_minor,currency,provider_status)
  values(p_square_refund_id,a.id,coalesce(p_idempotency_key,md5('external-square-refund:'||p_square_refund_id)::uuid),p_amount_minor,p_currency,p_refund_state)
  on conflict (square_refund_id) do update set provider_status = case
    when public.appointment_refunds.provider_status = 'COMPLETED' then 'COMPLETED'
    when public.appointment_refunds.provider_status in ('FAILED','REJECTED') and excluded.provider_status = 'PENDING'
      then public.appointment_refunds.provider_status else excluded.provider_status end, updated_at = now();
  select coalesce(sum(amount_minor) filter (where provider_status = 'COMPLETED'),0),
    coalesce(bool_or(provider_status = 'PENDING'),false) into refunded,pending
    from public.appointment_refunds where appointment_id = a.id;
  if refunded > a.amount_due_minor then raise exception 'APPOINTMENT_REFUND_MISMATCH'; end if;
  if refunded = a.amount_due_minor then
    update public.appointments set refunded_minor = refunded,payment_status = 'refunded',
      status = case when coalesce(payment_resume_status,status) in ('completed','no_show') then coalesce(payment_resume_status,status) else 'cancelled' end,
      cancelled_at = case when coalesce(payment_resume_status,status) in ('completed','no_show') then cancelled_at else coalesce(cancelled_at,now()) end,
      checkout_url = null,operation_lease = null,operation_lease_until = null,version = version + 1
      where id = a.id and (payment_status <> 'refunded' or refunded_minor <> refunded);
    update public.appointment_holds set state = 'expired' where appointment_id = a.id and state in ('active','review');
  elsif refunded > 0 or pending then
    update public.appointments set refunded_minor = refunded,
      square_refund_id = case when p_idempotency_key = square_refund_key then p_square_refund_id else square_refund_id end,
      payment_resume_status = coalesce(payment_resume_status,case when status <> 'payment_review' then status end),
      payment_status = case when pending then 'refund_pending' else 'review' end,
      status = case when status in ('completed','no_show','cancellation_pending') then status else 'payment_review' end,
      checkout_url = null,version = version + 1
      where id = a.id and (refunded_minor <> refunded or payment_status is distinct from case when pending then 'refund_pending' else 'review' end or p_idempotency_key = square_refund_key and square_refund_id is distinct from p_square_refund_id);
  elsif a.square_refund_key = p_idempotency_key and p_refund_state in ('FAILED','REJECTED') then
    update public.appointments set payment_status = 'refund_failed',square_refund_id = p_square_refund_id,
      operation_lease = null,operation_lease_until = null,version = version + 1 where id = a.id;
  elsif a.payment_status = 'refund_pending' and p_refund_state in ('FAILED','REJECTED') then
    update public.appointments set payment_status = 'paid',
      status = case when status = 'payment_review' then coalesce(payment_resume_status,'cancellation_pending') else status end,
      version = version + 1 where id = a.id;
  end if;
  insert into public.appointment_events(appointment_id,actor_type,event_type,details)
    values(a.id,'provider','refund_updated',jsonb_build_object('refundId',p_square_refund_id,'status',p_refund_state,'refundedMinor',refunded));
  select * into a from public.appointments where id = a.id;
  return a;
end;
$$;
revoke all on function public.apply_appointment_provider_refund(uuid,text,text,uuid,integer,text,text) from public,anon,authenticated;
grant execute on function public.apply_appointment_provider_refund(uuid,text,text,uuid,integer,text,text) to service_role;

-- The owner explicitly chooses cancellation/refund for a canonically verified
-- late payment or partially refunded booking; acceptance requires no unsafe
-- resource reassignment. Keep the reservation until money is returned.
create function public.prepare_appointment_review_refund(p_appointment uuid,p_owner uuid,p_version integer)
returns public.appointments language plpgsql security definer set search_path = '' as $$
declare a public.appointments;
begin
  select * into a from public.appointments where id = p_appointment for update;
  if a.id is null or not exists(select 1 from public.business_members where business_id = a.business_id and user_id = p_owner and role = 'owner' and is_active) then
    raise exception 'OWNER_REQUIRED' using errcode = '42501';
  end if;
  if a.version <> p_version then raise exception 'APPOINTMENT_CHANGED' using errcode = '40001'; end if;
  if a.square_payment_id is null or a.dispute_state is not null and a.dispute_state not in ('WON','RESOLVED')
    or a.payment_status <> 'review' or a.refunded_minor >= a.amount_due_minor then raise exception 'REFUND_NOT_READY'; end if;
  update public.appointments set status = 'cancellation_pending',payment_status = 'paid',
    square_refund_key = null,square_refund_id = null,version = version + 1 where id = a.id returning * into a;
  insert into public.appointment_events(appointment_id,actor_type,actor_id,event_type,details)
    values(a.id,'owner',p_owner,'refund_updated','{"action":"review_refund_requested"}');
  return a;
end;
$$;
revoke all on function public.prepare_appointment_review_refund(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.prepare_appointment_review_refund(uuid,uuid,integer) to service_role;

-- A paid event can arrive after cancellation released the unpaid hold. Never
-- confirm that slot automatically, but keep the money visible and refundable.
do $$ declare definition text; begin
  definition := pg_get_functiondef('public.apply_appointment_provider_payment(uuid,text,text,text)'::regprocedure);
  definition := replace(definition,$old$if appointment_row.status <> 'payment_pending' then return appointment_row; end if;$old$,
    $new$if appointment_row.status <> 'payment_pending' and not (appointment_row.status = 'cancelled' and p_payment_state = 'COMPLETED' and appointment_row.payment_status = 'none') then return appointment_row; end if;$new$);
  definition := replace(definition,'if appointment_row.hold_expires_at <= now() then',
    'if appointment_row.status = ''cancelled'' or appointment_row.hold_expires_at <= now() then');
  execute definition;
end $$;

notify pgrst,'reload schema';
commit;
