\set ON_ERROR_STOP on

begin;

do $$
declare
  target_business_id uuid;
  actor_id uuid;
  target_program_id uuid;
  target_membership_id uuid;
  first_token uuid := gen_random_uuid();
  first_transaction uuid;
  result jsonb;
  balance record;
  counter integer;
begin
  select business.id, member.user_id
  into target_business_id, actor_id
  from public.businesses business
  join public.business_members member on member.business_id = business.id
  where business.status = 'active' and member.role = 'owner' and member.is_active
  limit 1;

  if target_business_id is null then
    raise exception 'Secure loyalty test requires one active business with an owner';
  end if;

  insert into public.loyalty_programs (
    business_id, name, reward_description, stamps_required, terms, is_active
  ) values (
    target_business_id, 'Automated test rewards', 'Test reward', 8, '', true
  )
  on conflict (business_id) do update
  set name = excluded.name,
      reward_description = excluded.reward_description,
      stamps_required = excluded.stamps_required,
      is_active = true
  returning id into target_program_id;

  insert into public.loyalty_memberships (program_id, business_id, customer_id, is_active)
  values (target_program_id, target_business_id, actor_id, true)
  on conflict (program_id, customer_id) do update set is_active = true
  returning id into target_membership_id;

  result := public.process_loyalty_action(
    actor_id, target_membership_id, first_token, 'stamp', gen_random_uuid()
  );
  first_transaction := (result ->> 'transactionId')::uuid;

  begin
    perform public.process_loyalty_action(
      actor_id, target_membership_id, first_token, 'stamp', gen_random_uuid()
    );
    raise exception 'Replay protection test failed';
  exception
    when unique_violation then null;
  end;

  begin
    perform public.process_loyalty_action(
      actor_id, target_membership_id, gen_random_uuid(), 'stamp', gen_random_uuid()
    );
    raise exception 'Rapid duplicate protection test failed';
  exception
    when data_exception then
      if sqlerrm not ilike '%last minute%' then raise; end if;
  end;

  update public.loyalty_transactions
  set created_at = now() - interval '2 minutes'
  where id = first_transaction;

  for counter in 1..7 loop
    perform public.process_loyalty_action(
      actor_id, target_membership_id, gen_random_uuid(), 'stamp', gen_random_uuid()
    );
    update public.loyalty_transactions
    set created_at = now() - interval '2 minutes'
    where loyalty_transactions.membership_id = target_membership_id
      and transaction_type = 'stamp';
  end loop;

  select * into balance from public.calculate_loyalty_balance(target_membership_id);
  if balance.rewards_ready <> 1 or balance.progress_stamps <> 0 then
    raise exception 'Eight-stamp reward calculation failed: %', row_to_json(balance);
  end if;

  perform public.process_loyalty_action(
    actor_id, target_membership_id, gen_random_uuid(), 'redemption', gen_random_uuid()
  );
  select * into balance from public.calculate_loyalty_balance(target_membership_id);
  if balance.rewards_ready <> 0 or balance.available_stamps <> 0 then
    raise exception 'Redemption calculation failed: %', row_to_json(balance);
  end if;

  perform set_config('request.jwt.claim.sub', actor_id::text, true);
  perform public.reverse_loyalty_stamp(first_transaction, gen_random_uuid(), 'Automated test');
  if not exists (
    select 1 from public.loyalty_transactions
    where reversal_of = first_transaction and transaction_type = 'reversal'
  ) then
    raise exception 'Owner reversal audit record was not created';
  end if;

  begin
    perform public.reverse_loyalty_stamp(first_transaction, gen_random_uuid(), 'Duplicate test');
    raise exception 'Duplicate reversal protection test failed';
  exception
    when unique_violation then null;
  end;
end;
$$;

rollback;

select 'secure loyalty checks passed' as result;
