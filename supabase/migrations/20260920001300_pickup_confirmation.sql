create table public.square_pickup_codes (
  order_id uuid primary key references public.square_orders(id) on delete cascade,
  token_hash text not null check (token_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null
);
create table public.square_pickup_confirmations (
  order_id uuid primary key references public.square_orders(id) on delete restrict,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  token_hash text not null,
  transaction_id uuid references public.loyalty_transactions(id) on delete restrict,
  points_awarded integer not null default 0,
  visits_awarded integer not null default 0,
  confirmed_at timestamptz not null default now()
);
alter table public.square_pickup_codes enable row level security;
alter table public.square_pickup_confirmations enable row level security;
revoke all on public.square_pickup_codes,public.square_pickup_confirmations from public,anon,authenticated;
grant all on public.square_pickup_codes,public.square_pickup_confirmations to service_role;

-- This single transaction is the handoff boundary: staff access, a live pickup
-- code, paid/ready status, receipt, rewards, and order completion succeed together.
create function public.square_confirm_pickup(p_order uuid,p_actor uuid,p_business uuid,p_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  o public.square_orders;
  receipt public.square_pickup_confirmations;
  membership record;
  earned integer := 0;
  visits integer := 0;
  transaction_id uuid;
begin
  if not exists(select 1 from public.business_members m where m.business_id=p_business
    and m.user_id=p_actor and m.is_active and m.role in ('owner','staff')) then
    raise exception 'OPERATOR_REQUIRED';
  end if;
  select * into o from public.square_orders where id=p_order and business_id=p_business for update;
  if o.id is null then raise exception 'INVALID_PICKUP_CODE'; end if;
  select * into receipt from public.square_pickup_confirmations where order_id=o.id;
  if receipt.order_id is not null then
    if receipt.token_hash<>p_hash then raise exception 'INVALID_PICKUP_CODE'; end if;
    return jsonb_build_object('orderId',o.id,'completed',true,'alreadyConfirmed',true,
      'pointsAwarded',receipt.points_awarded,'visitsAwarded',receipt.visits_awarded);
  end if;
  if not exists(select 1 from public.square_pickup_codes c where c.order_id=o.id
    and c.token_hash=p_hash and c.expires_at>now()) then raise exception 'INVALID_PICKUP_CODE'; end if;
  if o.status<>'ready' or o.paid_at is null or o.square_payment_id is null then
    raise exception 'PICKUP_NOT_READY';
  end if;
  if o.lease_until>now() then raise exception 'ORDER_BUSY'; end if;
  select m.id,m.business_id,p.program_type,p.points_per_dollar into membership
    from public.loyalty_memberships m
    join public.loyalty_programs p on p.id=m.program_id and p.business_id=m.business_id
    join public.businesses b on b.id=m.business_id
    where m.business_id=o.business_id and m.customer_id=o.customer_id
      and m.is_active and p.is_active and b.status='active'
    for update of m;
  if membership.id is not null then
    if membership.program_type='points' then
      -- Item subtotal only: tax and tips never earn points.
      earned := floor(o.subtotal_minor::numeric * membership.points_per_dollar / 100)::integer;
      if earned>0 then
        insert into public.loyalty_transactions(membership_id,business_id,transaction_type,
          amount,points_amount,spend_minor,actor_id,idempotency_key,token_id,note)
        values(membership.id,o.business_id,'points_earned',1,earned,o.subtotal_minor::integer,
          p_actor,o.id,gen_random_uuid(),'Pickup order '||o.order_number)
        returning id into transaction_id;
      end if;
    else
      visits := 1;
      insert into public.loyalty_transactions(membership_id,business_id,transaction_type,
        amount,points_amount,actor_id,idempotency_key,token_id,note)
      values(membership.id,o.business_id,'stamp',1,0,p_actor,o.id,gen_random_uuid(),
        'Pickup order '||o.order_number) returning id into transaction_id;
    end if;
  end if;
  update public.square_orders set status='completed',completed_at=now() where id=o.id;
  insert into public.square_pickup_confirmations(order_id,actor_id,token_hash,transaction_id,points_awarded,visits_awarded)
    values(o.id,p_actor,p_hash,transaction_id,earned,visits);
  insert into public.square_order_events(order_id,actor_type,actor_id,from_state,to_state)
    values(o.id,'pickup_scan',p_actor,'ready','completed');
  return jsonb_build_object('orderId',o.id,'completed',true,'alreadyConfirmed',false,
    'pointsAwarded',earned,'visitsAwarded',visits);
end;
$$;
revoke all on function public.square_confirm_pickup(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.square_confirm_pickup(uuid,uuid,uuid,text) to service_role;
notify pgrst,'reload schema';
