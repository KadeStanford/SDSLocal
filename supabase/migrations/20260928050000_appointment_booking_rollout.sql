begin;

-- Appointment booking is opt-in, even when its schema and Edge routes exist.
insert into public.platform_settings (key, value, description)
values (
  'appointment_booking',
  '{"enabled":false,"business_ids":[],"environment":"staging"}'::jsonb,
  'Square Sandbox appointment pilot; explicitly allowlist test service businesses only.'
)
on conflict (key) do nothing;

commit;
