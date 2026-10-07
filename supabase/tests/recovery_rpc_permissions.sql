begin;
do $$
begin
  if has_function_privilege('anon','public.set_business_categories(uuid,smallint[])','EXECUTE')
    or has_function_privilege('anon','public.get_customer_appointments()','EXECUTE') then
    raise exception 'Anonymous callers can execute private recovery RPCs';
  end if;
  if not has_function_privilege('authenticated','public.set_business_categories(uuid,smallint[])','EXECUTE')
    or not has_function_privilege('authenticated','public.get_customer_appointments()','EXECUTE') then
    raise exception 'Authenticated recovery RPC grants missing';
  end if;
end $$;
rollback;
