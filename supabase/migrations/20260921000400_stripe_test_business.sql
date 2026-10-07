begin;

-- A provider-neutral staging fixture for testing the Stripe onboarding path.
-- It deliberately has no square_connections or square_ordering_settings row;
-- the owner can choose Stripe from the workspace when they are ready.
-- This historical fixture must not make a clean database depend on staging-only
-- accounts, or fabricate those accounts during production installation.
do $staging_fixture$
begin
  if not exists (select 1 from public.profiles where id = '90000000-0000-4000-8000-000000000001')
     or not exists (select 1 from public.profiles where id = '90000000-0000-4000-8000-000000000003') then
    return;
  end if;
insert into public.businesses (
  id, created_by, slug, name, business_type, status, description,
  category_summary, phone, email, website_url, address_line_1, city,
  region_code, postal_code, timezone, primary_color, accent_color, approved_at
)
values (
  '88888888-8888-4888-8888-888888888888'::uuid,
  '90000000-0000-4000-8000-000000000001'::uuid,
  'demo-juniper-ember-kitchen',
  'Juniper & Ember Kitchen',
  'food_drink'::public.business_type,
  'active'::public.business_status,
  'A test kitchen with a full café menu for validating Stripe pickup ordering from onboarding through handoff.',
  'Breakfast, coffee, bowls, sandwiches, and sweets',
  '(985) 555-0188',
  'hello@juniperember.example',
  'https://example.com/juniper-ember',
  '420 Cypress Street', 'Hammond', 'LA', '70401',
  'America/Chicago', '#315C4A', '#E5A653', now()
)
on conflict (id) do update set
  created_by = excluded.created_by,
  name = excluded.name,
  status = excluded.status,
  description = excluded.description,
  category_summary = excluded.category_summary,
  phone = excluded.phone,
  email = excluded.email,
  website_url = excluded.website_url,
  address_line_1 = excluded.address_line_1,
  city = excluded.city,
  region_code = excluded.region_code,
  postal_code = excluded.postal_code,
  timezone = excluded.timezone,
  primary_color = excluded.primary_color,
  accent_color = excluded.accent_color,
  approved_at = coalesce(public.businesses.approved_at, excluded.approved_at),
  updated_at = now();

insert into public.business_members (business_id, user_id, role, is_active)
values (
  '88888888-8888-4888-8888-888888888888'::uuid,
  '90000000-0000-4000-8000-000000000001'::uuid,
  'owner', true
)
on conflict (business_id, user_id) do update set role = 'owner', is_active = true;

insert into public.business_categories (business_id, category_id, is_primary)
select '88888888-8888-4888-8888-888888888888'::uuid, id, true
from public.categories
where slug = 'restaurants'
on conflict (business_id, category_id) do update set is_primary = true;

insert into public.business_hours (business_id, day_of_week, interval_number, opens_at, closes_at, is_closed)
select '88888888-8888-4888-8888-888888888888'::uuid, day_of_week, 1,
  case when day_of_week = 0 then '08:00'::time when day_of_week = 6 then '08:00'::time else '07:00'::time end,
  case when day_of_week in (0, 6) then '16:00'::time else '18:00'::time end,
  false
from generate_series(0, 6) as day_of_week
on conflict (business_id, day_of_week, interval_number) do update set
  opens_at = excluded.opens_at, closes_at = excluded.closes_at,
  is_closed = excluded.is_closed, updated_at = now();

insert into public.offering_sections (business_id, name, description, display_order, is_visible)
values
  ('88888888-8888-4888-8888-888888888888'::uuid, 'Breakfast', 'All-day plates, biscuits, and bright morning bowls.', 0, true),
  ('88888888-8888-4888-8888-888888888888'::uuid, 'Coffee & drinks', 'Espresso, cold brew, tea, and seasonal sips.', 1, true),
  ('88888888-8888-4888-8888-888888888888'::uuid, 'Bowls & sandwiches', 'Fresh lunch options made for pickup.', 2, true),
  ('88888888-8888-4888-8888-888888888888'::uuid, 'Sweets', 'Pastries and desserts from the kitchen counter.', 3, true)
on conflict do nothing;

insert into public.offering_items (
  business_id, section_id, name, description, price_minor, currency,
  is_available, is_featured, is_visible, display_order
)
select '88888888-8888-4888-8888-888888888888'::uuid, section.id, item.name,
  item.description, item.price_minor, 'USD', true, item.is_featured, true, item.display_order
from (
  values
    ('Breakfast', 'Cajun egg biscuit', 'Soft scrambled eggs, pepper jack, and andouille on a warm biscuit.', 950, true, 0),
    ('Breakfast', 'Berry ricotta toast', 'Whipped ricotta, berries, cane syrup, and toasted sourdough.', 1050, false, 1),
    ('Breakfast', 'Ember breakfast bowl', 'Crispy potatoes, eggs, greens, avocado, and smoky tomato jam.', 1450, true, 2),
    ('Breakfast', 'Banana pecan pancakes', 'Stack of buttermilk pancakes with roasted pecans and cane syrup.', 1250, false, 3),
    ('Coffee & drinks', 'House drip coffee', 'Dark roast with a touch of chicory.', 350, true, 0),
    ('Coffee & drinks', 'Seasonal latte', 'Espresso, steamed milk, and a rotating house syrup.', 675, false, 1),
    ('Coffee & drinks', 'Cold brew', 'Slow-steeped coffee served over ice.', 550, false, 2),
    ('Coffee & drinks', 'Citrus mint tea', 'Refreshing iced tea with citrus and mint.', 450, false, 3),
    ('Bowls & sandwiches', 'Crispy chicken grain bowl', 'Herbed grains, greens, pickled vegetables, and buttermilk chicken.', 1650, true, 0),
    ('Bowls & sandwiches', 'Roasted vegetable bowl', 'Seasonal vegetables, grains, feta, herbs, and lemon dressing.', 1450, false, 1),
    ('Bowls & sandwiches', 'Pressed muffuletta', 'Olive salad, cured meats, provolone, and sesame bread.', 1500, true, 2),
    ('Bowls & sandwiches', 'Gulf shrimp wrap', 'Citrus shrimp, cabbage crunch, avocado, and remoulade.', 1550, false, 3),
    ('Sweets', 'Beignet trio', 'Three warm beignets with powdered sugar.', 700, true, 0),
    ('Sweets', 'Praline morning bun', 'Laminated pastry with brown sugar praline.', 550, false, 1),
    ('Sweets', 'Chocolate chess pie', 'Rich chocolate custard in a flaky crust.', 650, false, 2)
) as item(section_name, name, description, price_minor, is_featured, display_order)
join public.offering_sections section on section.business_id = '88888888-8888-4888-8888-888888888888'::uuid
  and section.name = item.section_name
where not exists (
  select 1 from public.offering_items existing
  where existing.business_id = '88888888-8888-4888-8888-888888888888'::uuid
    and existing.name = item.name
);

insert into public.loyalty_programs (
  business_id, name, reward_description, stamps_required, program_type,
  points_per_dollar, points_required, terms, is_active
)
values (
  '88888888-8888-4888-8888-888888888888'::uuid,
  'Juniper points', 'Take $5 off a pickup order or redeem a free beignet trio.',
  6, 'points'::public.loyalty_program_type, 2, 100,
  'Staging rewards fixture for testing Stripe checkout redemption.', true
)
on conflict (business_id) do update set
  name = excluded.name, reward_description = excluded.reward_description,
  program_type = excluded.program_type, points_per_dollar = excluded.points_per_dollar,
  points_required = excluded.points_required, is_active = true, updated_at = now();

insert into public.loyalty_memberships (program_id, business_id, customer_id, is_active)
select program.id, program.business_id, '90000000-0000-4000-8000-000000000003'::uuid, true
from public.loyalty_programs program
where program.business_id = '88888888-8888-4888-8888-888888888888'::uuid
on conflict (program_id, customer_id) do update set is_active = true;

insert into public.loyalty_transactions (
  membership_id, business_id, transaction_type, amount, points_amount,
  spend_minor, actor_id, idempotency_key, note
)
select membership.id, membership.business_id, 'points_earned', 1, 120, 6000,
  membership.customer_id, '88888888-8888-4888-8888-888888888881'::uuid,
  'Stripe pickup rewards fixture'
from public.loyalty_memberships membership
where membership.business_id = '88888888-8888-4888-8888-888888888888'::uuid
on conflict (business_id, idempotency_key) do nothing;

insert into public.events (
  business_id, slug, title, description, starts_at, ends_at, timezone,
  location_mode, address_text, age_note, capacity_text, is_published
)
values
  ('88888888-8888-4888-8888-888888888888'::uuid, 'test-kitchen-tasting', 'Test kitchen tasting',
   'A small tasting menu night for exercising business events alongside pickup ordering.',
   now() + interval '10 days', now() + interval '10 days 2 hours', 'America/Chicago',
   'business', '420 Cypress Street, Hammond, LA', 'All ages welcome', '24 seats', true),
  ('88888888-8888-4888-8888-888888888888'::uuid, 'coffee-lab', 'Coffee lab: cold brew flights',
   'Compare three cold brew recipes and vote for the next seasonal pour.',
   now() + interval '21 days', now() + interval '21 days 90 minutes', 'America/Chicago',
   'business', '420 Cypress Street, Hammond, LA', 'All ages welcome', '16 seats', true)
on conflict (business_id, slug) do update set
  title = excluded.title, description = excluded.description,
  starts_at = excluded.starts_at, ends_at = excluded.ends_at,
  is_published = true, archived_at = null, updated_at = now();

end;
$staging_fixture$;

-- Let the owner workspace show a business before it has selected an ordering
-- provider. Pickup availability remains gated by the provider-specific joins.
create or replace function public.square_operator_businesses(p_user_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', b.id, 'name', b.name, 'primaryColor', b.primary_color,
    'timezone', coalesce(s.timezone, b.timezone), 'phone', b.phone,
    'logoPath', (select a.storage_path from public.business_photos p
      join public.media_assets a on a.id=p.media_asset_id
      where p.business_id=b.id and p.role='logo' and a.status='ready' limit 1),
    'canRefund', m.role='owner', 'isOpen', coalesce(s.is_open, false),
    'orderingProvider', s.provider,
    'orderingReady', coalesce(s.enabled and s.synced_at is not null, false),
    'counts', public.square_queue_counts(b.id)
  ) order by b.name,b.id), '[]'::jsonb)
  from public.business_members m join public.businesses b on b.id=m.business_id
  left join public.square_ordering_settings s on s.business_id=b.id
  where m.user_id=p_user_id and m.is_active and m.role in ('owner','staff')
    and b.status in ('draft','pending_review','active');
$$;

commit;
notify pgrst, 'reload schema';
