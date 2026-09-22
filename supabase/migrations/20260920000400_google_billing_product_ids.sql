begin;

delete from public.billing_products where provider = 'google';
insert into public.billing_products (provider, product_id, plan_code, billing_period)
values
  ('google', 'listing_single_v1:monthly', 'single', 'monthly'),
  ('google', 'listing_single_v1:yearly', 'single', 'yearly'),
  ('google', 'listing_multi_v1:monthly', 'multi', 'monthly'),
  ('google', 'listing_multi_v1:yearly', 'multi', 'yearly');

commit;
