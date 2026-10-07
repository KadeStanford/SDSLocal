begin;

-- Run only against Supabase staging lgddhdexvwclfrnzjtly.
-- A provider-neutral staging fixture for testing the Stripe onboarding path.
-- It deliberately has no square_connections or square_ordering_settings row;
-- the owner can choose Stripe from the workspace when they are ready.
insert into public.businesses (
  id, created_by, slug, name, business_type, status, description,
  category_summary, phone, email, website_url, address_line_1, city,
  region_code, postal_code, timezone, primary_color, accent_color, approved_at
)
values (
  '99999999-9999-4999-8999-999999999999'::uuid,
  (select id from auth.users where lower(email)='kade20413@gmail.com'),
  'demo-magnolia-main-test-kitchen',
  'Magnolia & Main Test Kitchen',
  'food_drink'::public.business_type,
  'active'::public.business_status,
  'A test kitchen with a full café menu for validating Stripe pickup ordering from onboarding through handoff.',
  'Breakfast, coffee, bowls, sandwiches, and sweets',
  '(985) 555-0188',
  'kade20413+stripe-connect-fixture@gmail.com',
  'https://example.com/magnolia-main',
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
  '99999999-9999-4999-8999-999999999999'::uuid,
  (select id from auth.users where lower(email)='kade20413@gmail.com'),
  'owner', true
)
on conflict (business_id, user_id) do update set role = 'owner', is_active = true;

insert into public.business_categories (business_id, category_id, is_primary)
select '99999999-9999-4999-8999-999999999999'::uuid, id, true
from public.categories
where slug = 'restaurants'
on conflict (business_id, category_id) do update set is_primary = true;

insert into public.business_hours (business_id, day_of_week, interval_number, opens_at, closes_at, is_closed)
select '99999999-9999-4999-8999-999999999999'::uuid, day_of_week, 1,
  case when day_of_week = 0 then '08:00'::time when day_of_week = 6 then '08:00'::time else '07:00'::time end,
  case when day_of_week in (0, 6) then '16:00'::time else '18:00'::time end,
  false
from generate_series(0, 6) as day_of_week
on conflict (business_id, day_of_week, interval_number) do update set
  opens_at = excluded.opens_at, closes_at = excluded.closes_at,
  is_closed = excluded.is_closed, updated_at = now();

insert into public.offering_sections (business_id, name, description, display_order, is_visible)
select '99999999-9999-4999-8999-999999999999'::uuid, section.name, section.description, section.display_order, true
from (values
  ('Breakfast', 'All-day plates, biscuits, and bright morning bowls.', 0),
  ('Coffee & drinks', 'Espresso, cold brew, tea, and seasonal sips.', 1),
  ('Bowls & sandwiches', 'Fresh lunch options made for pickup.', 2),
  ('Sweets', 'Pastries and desserts from the kitchen counter.', 3)
) section(name,description,display_order)
where not exists (select 1 from public.offering_sections existing
  where existing.business_id='99999999-9999-4999-8999-999999999999'::uuid and existing.name=section.name);

insert into public.offering_items (
  business_id, section_id, name, description, price_minor, currency,
  is_available, is_featured, is_visible, display_order
)
select '99999999-9999-4999-8999-999999999999'::uuid, section.id, item.name,
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
join public.offering_sections section on section.business_id = '99999999-9999-4999-8999-999999999999'::uuid
  and section.name = item.section_name
where not exists (
  select 1 from public.offering_items existing
  where existing.business_id = '99999999-9999-4999-8999-999999999999'::uuid
    and existing.name = item.name
);

update public.platform_settings set value=jsonb_set(value,'{business_ids}',coalesce(value->'business_ids','[]'::jsonb) || '["99999999-9999-4999-8999-999999999999"]'::jsonb),updated_at=now() where key='stripe_commerce' and not (value->'business_ids' ? '99999999-9999-4999-8999-999999999999');
commit;
select b.name,b.status,u.email as owner, (select count(*) from public.offering_items i where i.business_id=b.id) as menu_items,
exists(select 1 from public.stripe_account_states s where s.business_id=b.id) as stripe_link_exists
from public.businesses b join auth.users u on u.id=b.created_by where b.id='99999999-9999-4999-8999-999999999999';

