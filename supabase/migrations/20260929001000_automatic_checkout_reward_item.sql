begin;

create or replace function public.square_redeem_checkout_reward(
  p_order uuid,
  p_membership uuid,
  p_customer uuid,
  p_reward jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  membership public.loyalty_memberships;
  program public.loyalty_programs;
  available_points integer;
  available_stamps integer;
  required integer;
  result_id uuid;
  reward_type text := p_reward->>'type';
begin
  if p_order is null or p_membership is null or p_customer is null then
    raise exception 'REWARD_SIGN_IN' using errcode = '22023';
  end if;
  select * into membership from public.loyalty_memberships
    where id = p_membership and customer_id = p_customer and is_active for update;
  if membership.id is null then raise exception 'REWARD_UNAVAILABLE' using errcode = '22023'; end if;
  select * into program from public.loyalty_programs
    where id = membership.program_id and business_id = membership.business_id and is_active for update;
  if program.id is null or program.checkout_reward_type <> reward_type then
    raise exception 'REWARD_CHANGED' using errcode = '22023';
  end if;
  if reward_type = 'percent_discount' and program.checkout_reward_percent <> (p_reward->>'percent')::integer then
    raise exception 'REWARD_CHANGED' using errcode = '22023';
  end if;
  -- A blank configured item means the checkout service chooses an eligible cart item.
  -- Still require a concrete selected item, and honor an explicit merchant restriction.
  if reward_type in ('free_item','bogo') and (
    nullif(btrim(p_reward->>'variationId'), '') is null
    or (program.checkout_reward_variation_id is not null
      and program.checkout_reward_variation_id is distinct from p_reward->>'variationId')
  ) then
    raise exception 'REWARD_CHANGED' using errcode = '22023';
  end if;
  select coalesce(sum(t.points_amount) filter (where t.transaction_type = 'points_earned'), 0)
    - coalesce(sum(t.points_amount) filter (where t.transaction_type = 'redemption'), 0)
    into available_points from public.loyalty_transactions t where t.membership_id = membership.id;
  select coalesce(sum(t.amount) filter (where t.transaction_type = 'stamp'), 0)
    - coalesce(sum(t.amount) filter (where t.transaction_type = 'reversal'), 0)
    - coalesce(sum(t.amount) filter (where t.transaction_type = 'redemption'), 0) * program.stamps_required
    into available_stamps from public.loyalty_transactions t where t.membership_id = membership.id;
  required := case when program.program_type = 'points' then program.points_required else program.stamps_required end;
  if (program.program_type = 'points' and available_points < required)
     or (program.program_type = 'visits' and available_stamps < required) then
    raise exception 'REWARD_NOT_READY' using errcode = '22023';
  end if;
  insert into public.loyalty_transactions
    (membership_id, business_id, transaction_type, amount, points_amount, actor_id, idempotency_key, square_order_id, note)
  values
    (membership.id, membership.business_id, 'redemption', 1,
     case when program.program_type = 'points' then required else 0 end,
     p_customer, gen_random_uuid(), p_order, 'Pickup checkout reward')
  returning id into result_id;
  return result_id;
end;
$$;

revoke all on function public.square_redeem_checkout_reward(uuid, uuid, uuid, jsonb) from public;
grant execute on function public.square_redeem_checkout_reward(uuid, uuid, uuid, jsonb) to service_role;

-- Add optional loyalty metadata to the existing serialized reservation.

notify pgrst, 'reload schema';
commit;
