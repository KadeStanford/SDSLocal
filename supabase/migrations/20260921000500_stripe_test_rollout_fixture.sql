begin;

-- Keep Stripe in the staging/test environment and allow only the dedicated
-- fixture business. Existing Square rollout settings are untouched.
update public.platform_settings
set value = jsonb_set(
  jsonb_set(
    coalesce(value, '{}'::jsonb),
    '{enabled}', 'true'::jsonb, true
  ),
  '{business_ids}',
  (
    select jsonb_agg(distinct id order by id)
    from jsonb_array_elements_text(
      coalesce(value->'business_ids', '[]'::jsonb) ||
      '["88888888-8888-4888-8888-888888888888"]'::jsonb
    ) as ids(id)
  ),
  true
)
where key = 'stripe_commerce';

commit;
notify pgrst, 'reload schema';
