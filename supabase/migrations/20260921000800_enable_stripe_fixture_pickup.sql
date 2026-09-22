begin;

-- The seeded Juniper & Ember business is the staging Stripe checkout fixture.
-- Its catalog and Stripe account are already connected; leave pickup enabled so
-- customer discovery and the provider-neutral checkout flow can exercise it.
update public.square_ordering_settings
set provider = 'stripe',
    enabled = true,
    is_open = true,
    updated_at = now()
where business_id = '88888888-8888-4888-8888-888888888888'::uuid
  and synced_at is not null
  and sync_summary->>'provider' = 'stripe'
  and coalesce((sync_summary->>'variations')::integer, 0) > 0;

commit;
notify pgrst, 'reload schema';
