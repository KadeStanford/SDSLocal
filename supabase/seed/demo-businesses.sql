-- SDS Local demo catalog. This is intentionally separate from seed.sql so it can
-- be applied to an existing local database without resetting real user data.
-- Every row uses the demo-* slug prefix and the current local profile as owner.

begin;

do $$
begin
  if not exists (select 1 from public.profiles limit 1) then
    raise exception 'Demo seed requires at least one local profile';
  end if;
end;
$$;

insert into public.businesses (
  id, created_by, slug, name, business_type, status, description, category_summary,
  phone, email, website_url, address_line_1, city, region_code, postal_code,
  service_area_type, service_area_regions, service_radius_miles, service_area,
  location, timezone, primary_color, accent_color, approved_at
)
select
  demo.id,
  owner.id,
  demo.slug,
  demo.name,
  demo.business_type::public.business_type,
  'active',
  demo.description,
  demo.category_summary,
  demo.phone,
  demo.email,
  demo.website_url,
  demo.address_line_1,
  demo.city,
  demo.region_code,
  demo.postal_code,
  demo.service_area_type::public.service_area_type,
  demo.service_area_regions,
  demo.service_radius_miles,
  demo.service_area,
  extensions.st_setsrid(extensions.st_makepoint(demo.longitude, demo.latitude), 4326)::extensions.geography,
  'America/Chicago',
  demo.primary_color,
  demo.accent_color,
  now()
from (
  values
    ('11111111-1111-4111-8111-111111111111'::uuid, 'demo-bayou-bloom', 'Bayou & Bloom Cafe', 'food_drink',
      'A bright neighborhood cafe pairing Louisiana comfort with seasonal coffee and pastries.',
      'Coffee, brunch, pastries', '(985) 555-0101', 'hello@bayouandbloom.example', 'https://example.com/bayou-bloom',
      '211 Oak Street', 'Hammond', 'LA', '70401', 'radius', '{}'::text[], 15::smallint, null,
      -90.4612::double precision, 30.5048::double precision, '#F2B66D', '#176B4D'),
    ('22222222-2222-4222-8222-222222222222'::uuid, 'demo-cypress-care', 'Cypress & Co Home Care', 'services',
      'Reliable home refresh and repair services from a small team that treats every home with care.',
      'Home services, repairs, maintenance', '(985) 555-0102', 'hello@cypresscare.example', 'https://example.com/cypress-care',
      '803 Florida Avenue', 'Hammond', 'LA', '70401', 'cities', array['Hammond', 'Ponchatoula', 'Amite']::text[], null::smallint, null,
      -90.4671::double precision, 30.5057::double precision, '#4C8C76', '#F3C969'),
    ('33333333-3333-4333-8333-333333333333'::uuid, 'demo-lantern-row', 'Lantern Row Market', 'retail',
      'A thoughtfully edited shop for useful goods, handmade gifts, and objects with a story.',
      'Gifts, home goods, local makers', '(985) 555-0103', 'shop@lanternrow.example', 'https://example.com/lantern-row',
      '114 Cate Street', 'Hammond', 'LA', '70403', 'statewide', '{}'::text[], null::smallint, null,
      -90.4877::double precision, 30.5054::double precision, '#4D6D8D', '#E99B45'),
    ('44444444-4444-4444-8444-444444444444'::uuid, 'demo-magnolia-room', 'The Magnolia Room', 'entertainment_venue',
      'An intimate listening room for live music, comedy, and community nights in downtown Hammond.',
      'Live music, comedy, community events', '(985) 555-0104', 'hello@magnoliaroom.example', 'https://example.com/magnolia-room',
      '509 Phoenix Square', 'Hammond', 'LA', '70401', 'at_location', '{}'::text[], null::smallint, null,
      -90.4859::double precision, 30.5088::double precision, '#704C8D', '#F29E8E'),
    ('55555555-5555-4555-8555-555555555555'::uuid, 'demo-northshore-makers', 'Northshore Makers Guild', 'general',
      'A welcoming workshop and community hub for classes, collaborations, and local creative projects.',
      'Classes, workshops, community', '(985) 555-0105', 'hello@northshoremakes.example', 'https://example.com/northshore-makers',
      '130 Market Street', 'Hammond', 'LA', '70401', 'custom', '{}'::text[], null::smallint, 'Tangipahoa Parish and nearby Northshore communities',
      -90.4822::double precision, 30.5072::double precision, '#2B7A78', '#E8C547'),
    ('66666666-6666-4666-8666-666666666666'::uuid, 'demo-roaming-roots', 'Roaming Roots Food Truck', 'mobile',
      'A seasonal food truck serving bright bowls, pressed sandwiches, and cold brew at rotating neighborhood stops.',
      'Food trucks, mobile food, catering', '(985) 555-0106', 'hello@roamingroots.example', 'https://example.com/roaming-roots',
      null, 'Hammond', 'LA', '70401', 'cities', array['Hammond', 'Ponchatoula', 'Amite']::text[], null::smallint, null,
      -90.4742::double precision, 30.5059::double precision, '#C96B3B', '#F5C66A'),
    ('77777777-7777-4777-8777-777777777777'::uuid, 'demo-cane-clove', 'Cane & Clove Kitchen', 'food_drink',
      'A neighborhood restaurant serving relaxed Southern plates, seasonal produce, and warm hospitality.',
      'Southern plates, seasonal cocktails, dessert', '(985) 555-0107', 'hello@caneandclove.example', 'https://example.com/cane-clove',
      '318 Coleman Avenue', 'Hammond', 'LA', '70401', 'at_location', '{}'::text[], null::smallint, null,
      -90.4791::double precision, 30.5076::double precision, '#A9573F', '#F2C078')
) as demo(id, slug, name, business_type, description, category_summary, phone, email, website_url,
          address_line_1, city, region_code, postal_code, service_area_type, service_area_regions,
          service_radius_miles, service_area, longitude, latitude, primary_color, accent_color)
cross join lateral (select id from public.profiles order by created_at limit 1) owner
on conflict (id) do update set
  created_by = excluded.created_by,
  name = excluded.name,
  business_type = excluded.business_type,
  status = 'active',
  description = excluded.description,
  category_summary = excluded.category_summary,
  phone = excluded.phone,
  email = excluded.email,
  website_url = excluded.website_url,
  address_line_1 = excluded.address_line_1,
  city = excluded.city,
  region_code = excluded.region_code,
  postal_code = excluded.postal_code,
  service_area_type = excluded.service_area_type,
  service_area_regions = excluded.service_area_regions,
  service_radius_miles = excluded.service_radius_miles,
  service_area = excluded.service_area,
  location = excluded.location,
  primary_color = excluded.primary_color,
  accent_color = excluded.accent_color,
  approved_at = coalesce(public.businesses.approved_at, excluded.approved_at),
  updated_at = now();

insert into public.business_members (business_id, user_id, role, is_active)
select business.id, profile.id, 'owner', true
from public.businesses business
cross join lateral (select id from public.profiles order by created_at limit 1) profile
where business.slug in ('demo-bayou-bloom', 'demo-cypress-care', 'demo-lantern-row', 'demo-magnolia-room', 'demo-northshore-makers', 'demo-roaming-roots', 'demo-cane-clove')
on conflict (business_id, user_id) do update set role = 'owner', is_active = true;

insert into public.business_categories (business_id, category_id, is_primary)
select business.id, category.id, true
from public.businesses business
join public.categories category on category.slug = case business.slug
  when 'demo-bayou-bloom' then 'coffee-tea'
  when 'demo-cypress-care' then 'home-services'
  when 'demo-lantern-row' then 'shopping'
  when 'demo-magnolia-room' then 'live-music'
  when 'demo-northshore-makers' then 'other'
  when 'demo-cane-clove' then 'restaurants'
  else 'food-trucks'
end
where business.slug like 'demo-%'
on conflict (business_id, category_id) do nothing;

insert into public.business_hours (business_id, day_of_week, interval_number, opens_at, closes_at, is_closed)
select business.id, days.day_of_week, 1, schedule.opens_at, schedule.closes_at, schedule.opens_at is null
from public.businesses business
cross join generate_series(0, 6) as days(day_of_week)
cross join lateral (
  select
    case
      when business.slug = 'demo-bayou-bloom' and days.day_of_week between 1 and 5 then '07:00'::time
      when business.slug = 'demo-bayou-bloom' and days.day_of_week = 6 then '08:00'::time
      when business.slug = 'demo-cypress-care' and days.day_of_week between 1 and 5 then '08:00'::time
      when business.slug = 'demo-cypress-care' and days.day_of_week = 6 then '09:00'::time
      when business.slug = 'demo-lantern-row' and days.day_of_week between 2 and 6 then '10:00'::time
      when business.slug = 'demo-lantern-row' and days.day_of_week = 0 then '11:00'::time
      when business.slug = 'demo-magnolia-room' and days.day_of_week between 3 and 6 then '17:00'::time
      when business.slug = 'demo-magnolia-room' and days.day_of_week = 0 then '14:00'::time
      when business.slug = 'demo-northshore-makers' and days.day_of_week between 1 and 6 then '09:00'::time
      when business.slug = 'demo-roaming-roots' and days.day_of_week between 1 and 5 then '11:00'::time
      when business.slug = 'demo-roaming-roots' and days.day_of_week = 6 then '10:00'::time
      when business.slug = 'demo-cane-clove' and days.day_of_week between 2 and 5 then '11:00'::time
      when business.slug = 'demo-cane-clove' and days.day_of_week = 6 then '10:00'::time
      when business.slug = 'demo-cane-clove' and days.day_of_week = 0 then '10:00'::time
      else null::time
    end as opens_at,
    case
      when business.slug = 'demo-bayou-bloom' and days.day_of_week between 1 and 5 then '15:00'::time
      when business.slug = 'demo-bayou-bloom' and days.day_of_week = 6 then '14:00'::time
      when business.slug = 'demo-cypress-care' and days.day_of_week between 1 and 5 then '18:00'::time
      when business.slug = 'demo-cypress-care' and days.day_of_week = 6 then '14:00'::time
      when business.slug = 'demo-lantern-row' and days.day_of_week between 2 and 6 then '19:00'::time
      when business.slug = 'demo-lantern-row' and days.day_of_week = 0 then '16:00'::time
      when business.slug = 'demo-magnolia-room' and days.day_of_week between 3 and 6 then '23:00'::time
      when business.slug = 'demo-magnolia-room' and days.day_of_week = 0 then '20:00'::time
      when business.slug = 'demo-northshore-makers' and days.day_of_week between 1 and 6 then '17:00'::time
      when business.slug = 'demo-roaming-roots' and days.day_of_week between 1 and 5 then '19:00'::time
      when business.slug = 'demo-roaming-roots' and days.day_of_week = 6 then '18:00'::time
      when business.slug = 'demo-cane-clove' and days.day_of_week between 2 and 5 then '21:00'::time
      when business.slug = 'demo-cane-clove' and days.day_of_week = 6 then '22:00'::time
      when business.slug = 'demo-cane-clove' and days.day_of_week = 0 then '15:00'::time
      else null::time
    end as closes_at
) schedule
where business.slug like 'demo-%'
on conflict (business_id, day_of_week, interval_number) do update set
  opens_at = excluded.opens_at,
  closes_at = excluded.closes_at,
  is_closed = excluded.is_closed,
  updated_at = now();

insert into public.offering_sections (business_id, name, description, display_order, is_visible)
select business.id,
       case business.slug
         when 'demo-bayou-bloom' then 'Cafe favorites'
         when 'demo-cypress-care' then 'Popular services'
         when 'demo-lantern-row' then 'Shop the row'
         when 'demo-magnolia-room' then 'At the room'
         when 'demo-northshore-makers' then 'Workshops and classes'
         else 'Today’s menu'
       end,
       'A few popular choices to help you get started.', 0, true
from public.businesses business
where business.slug like 'demo-%'
  and not exists (select 1 from public.offering_sections section where section.business_id = business.id);

insert into public.offering_items (business_id, section_id, name, description, price_minor, currency, is_available, is_featured, is_visible, display_order)
select business.id, section.id,
       item.name, item.description, item.price_minor, 'USD', true, item.display_order = 0, true, item.display_order
from public.businesses business
join public.offering_sections section on section.business_id = business.id
cross join lateral (
  values
    (0, case business.slug
      when 'demo-bayou-bloom' then 'Café au lait and beignet'
      when 'demo-cypress-care' then 'Seasonal home refresh'
      when 'demo-lantern-row' then 'Local maker gift box'
      when 'demo-magnolia-room' then 'Show night table'
      when 'demo-northshore-makers' then 'Open studio pass'
      when 'demo-cane-clove' then 'Smoked chicken supper'
      else 'Seasonal grain bowl'
    end,
    case business.slug
      when 'demo-bayou-bloom' then 'A classic sweet-and-savory stop for a slow morning.'
      when 'demo-cypress-care' then 'A two-hour visit for the small fixes and resets on your list.'
      when 'demo-lantern-row' then 'A curated bundle assembled from Northshore makers.'
      when 'demo-magnolia-room' then 'Reserved seating and a drink for tonight''s headliner.'
      when 'demo-northshore-makers' then 'Drop in, use the tools, and make something new.'
      when 'demo-cane-clove' then 'A generous plate of smoked chicken, greens, and skillet cornbread.'
      else 'A colorful, filling lunch made fresh at today''s stop.'
    end, 1200),
    (1, case business.slug
      when 'demo-bayou-bloom' then 'Weekend brunch board'
      when 'demo-cypress-care' then 'Care plan consultation'
      when 'demo-lantern-row' then 'Gift wrapping'
      when 'demo-magnolia-room' then 'Community open mic'
      when 'demo-northshore-makers' then 'Beginner workshop'
      when 'demo-cane-clove' then 'Cane syrup old fashioned'
      else 'Pressed sandwich and cold brew'
    end,
    'A friendly option for first-time visitors.', 2200)
) as item(display_order, name, description, price_minor)
where not exists (
  select 1 from public.offering_items existing
  where existing.business_id = business.id and existing.name = item.name
);

update public.offering_items item
set price_minor = case business.slug
  when 'demo-bayou-bloom' then case item.display_order when 0 then 650 else 1450 end
  when 'demo-cypress-care' then case item.display_order when 0 then 12500 else 7500 end
  when 'demo-lantern-row' then case item.display_order when 0 then 2800 else 800 end
  when 'demo-magnolia-room' then case item.display_order when 0 then 1800 else 500 end
  else case item.display_order when 0 then 1500 else 3200 end
end,
updated_at = now()
from public.businesses business
where item.business_id = business.id and business.slug like 'demo-%';

-- Restaurant menu fixtures use three intentionally different sizes so the mobile
-- menu builder and public menu can be exercised with realistic density.
-- Bayou & Bloom is the large cafe menu, Roaming Roots is a medium food-truck
-- menu, and Cane & Clove is a small restaurant menu.
insert into public.offering_sections (business_id, name, description, display_order, is_visible)
select business.id, menu.name, menu.description, menu.display_order, true
from (
  values
    ('demo-bayou-bloom', 'Breakfast & brunch', 'Slow mornings, savory plates, and something sweet.', 1),
    ('demo-bayou-bloom', 'Coffee & tea', 'House espresso, chicory coffee, and seasonal sips.', 2),
    ('demo-bayou-bloom', 'Lunch', 'Bright salads, pressed sandwiches, and Louisiana favorites.', 3),
    ('demo-bayou-bloom', 'Bakery case', 'Baked fresh each morning while supplies last.', 4),
    ('demo-roaming-roots', 'Bowls & plates', 'Build a colorful lunch from what is freshest today.', 1),
    ('demo-roaming-roots', 'Pressed sandwiches', 'Hot-pressed favorites for a quick stop.', 2),
    ('demo-roaming-roots', 'Sides & drinks', 'Small bites and cold drinks for the road.', 3),
    ('demo-cane-clove', 'Dinner plates', 'Comforting plates made for lingering over dinner.', 1)
) as menu(business_slug, name, description, display_order)
join public.businesses business on business.slug = menu.business_slug
where not exists (
  select 1
  from public.offering_sections existing
  where existing.business_id = business.id and existing.name = menu.name
);

insert into public.offering_items (
  business_id, section_id, name, description, price_minor, currency,
  is_available, is_featured, is_visible, display_order
)
select business.id, section.id, item.name, item.description, item.price_minor, 'USD',
       true, item.is_featured, true, item.display_order
from (
  values
    ('demo-bayou-bloom', 'Breakfast & brunch', 'Shrimp & grits', 'Creamy stone-ground grits, Gulf shrimp, and pepper relish.', 1650, true, 0),
    ('demo-bayou-bloom', 'Breakfast & brunch', 'Buttermilk biscuit board', 'Warm biscuits, seasonal jam, whipped butter, and cane syrup.', 1200, false, 1),
    ('demo-bayou-bloom', 'Breakfast & brunch', 'Porch brunch board', 'Eggs, greens, fruit, biscuit, and a little something sweet.', 1800, true, 2),
    ('demo-bayou-bloom', 'Breakfast & brunch', 'Savory bread pudding', 'A rotating baked breakfast with local vegetables and herbs.', 1350, false, 3),
    ('demo-bayou-bloom', 'Coffee & tea', 'Chicory café au lait', 'Steamed milk and dark-roast chicory coffee.', 650, true, 0),
    ('demo-bayou-bloom', 'Coffee & tea', 'Seasonal latte', 'Espresso with house-made syrup and silky milk.', 675, false, 1),
    ('demo-bayou-bloom', 'Coffee & tea', 'Cold brew', 'Slow-steeped coffee served over ice.', 550, false, 2),
    ('demo-bayou-bloom', 'Coffee & tea', 'Mint green tea', 'Bright, refreshing tea with a touch of local honey.', 450, false, 3),
    ('demo-bayou-bloom', 'Lunch', 'Half muffuletta', 'Sesame loaf, olive salad, cured meats, and provolone.', 1300, true, 0),
    ('demo-bayou-bloom', 'Lunch', 'Pecan chicken salad', 'Greens, roasted pecans, grapes, and house vinaigrette.', 1450, false, 1),
    ('demo-bayou-bloom', 'Lunch', 'Tomato tartine', 'Whipped ricotta, roasted tomato, herbs, and toasted sourdough.', 1150, false, 2),
    ('demo-bayou-bloom', 'Lunch', 'Soup of the day', 'Ask what is simmering today.', 850, false, 3),
    ('demo-bayou-bloom', 'Bakery case', 'Beignet flight', 'Three warm beignets with rotating dipping sauces.', 800, true, 0),
    ('demo-bayou-bloom', 'Bakery case', 'Praline morning bun', 'Buttery laminated pastry with brown sugar praline.', 550, false, 1),
    ('demo-bayou-bloom', 'Bakery case', 'Pecan pie bar', 'A gooey pecan bar with flaky sea salt.', 600, false, 2),
    ('demo-roaming-roots', 'Bowls & plates', 'Citrus grain bowl', 'Herbed grains, roasted vegetables, greens, and citrus dressing.', 1500, true, 0),
    ('demo-roaming-roots', 'Bowls & plates', 'Smoky chicken bowl', 'Charred chicken, pickled onions, rice, and green sauce.', 1650, true, 1),
    ('demo-roaming-roots', 'Bowls & plates', 'Seasonal veggie plate', 'Whatever looks best at the morning market, served fresh.', 1400, false, 2),
    ('demo-roaming-roots', 'Pressed sandwiches', 'Cuban-inspired press', 'Roasted pork, ham, pickle, mustard, and melty cheese.', 1450, true, 0),
    ('demo-roaming-roots', 'Pressed sandwiches', 'Green goddess melt', 'Avocado, greens, herbs, and provolone on toasted bread.', 1300, false, 1),
    ('demo-roaming-roots', 'Pressed sandwiches', 'Turkey pepper jam press', 'Smoked turkey, sharp cheddar, and house pepper jam.', 1400, false, 2),
    ('demo-roaming-roots', 'Sides & drinks', 'Crispy okra bites', 'Seasoned okra with lemony dipping sauce.', 650, false, 0),
    ('demo-roaming-roots', 'Sides & drinks', 'House slaw', 'Crunchy cabbage, herbs, and a bright vinegar dressing.', 500, false, 1),
    ('demo-roaming-roots', 'Sides & drinks', 'Cold brew', 'A smooth, ready-to-go cold brew for the afternoon.', 500, false, 2),
    ('demo-cane-clove', 'Dinner plates', 'Smoked chicken supper', 'Smoked chicken, braised greens, skillet cornbread, and jus.', 1900, true, 0),
    ('demo-cane-clove', 'Dinner plates', 'Blackened catfish', 'Crispy catfish, dirty rice, and a bright rémoulade.', 2200, true, 1),
    ('demo-cane-clove', 'Dinner plates', 'Mushroom pot pie', 'Seasonal mushrooms, root vegetables, and flaky pastry.', 1800, false, 2),
    ('demo-cane-clove', 'Dinner plates', 'Cane syrup bread pudding', 'Warm bread pudding with vanilla cream and toasted pecans.', 900, false, 3)
) as item(business_slug, section_name, name, description, price_minor, is_featured, display_order)
join public.businesses business on business.slug = item.business_slug
join public.offering_sections section
  on section.business_id = business.id and section.name = item.section_name
where not exists (
  select 1
  from public.offering_items existing
  where existing.business_id = business.id and existing.name = item.name
);

insert into public.loyalty_programs (business_id, name, reward_description, stamps_required, program_type, points_per_dollar, points_required, terms, is_active)
select business.id,
       case business.slug
         when 'demo-bayou-bloom' then 'Bloom points'
         when 'demo-cypress-care' then 'Cypress care club'
         when 'demo-lantern-row' then 'Lantern perks'
         when 'demo-magnolia-room' then 'Magnolia encore'
         when 'demo-northshore-makers' then 'Makers pass'
         else 'Roaming Roots points'
       end,
       case business.slug
         when 'demo-bayou-bloom' then 'A pastry or drip coffee on us.'
         when 'demo-cypress-care' then '$20 off your next scheduled visit.'
         when 'demo-lantern-row' then 'A locally made surprise at checkout.'
         when 'demo-magnolia-room' then 'Two drink tickets for your next show.'
         when 'demo-northshore-makers' then 'One free workshop supply kit.'
         else 'A free side with your next food truck order.'
       end,
       case business.slug when 'demo-bayou-bloom' then 6 when 'demo-magnolia-room' then 4 else 8 end,
       case when business.slug = 'demo-roaming-roots' then 'points'::public.loyalty_program_type else 'visits'::public.loyalty_program_type end,
       case when business.slug = 'demo-roaming-roots' then 2 else null end,
       case when business.slug = 'demo-roaming-roots' then 100 else null end,
       'Demo program for testing the customer wallet.', true
from public.businesses business
where business.slug like 'demo-%'
on conflict (business_id) do update set
  name = excluded.name,
  reward_description = excluded.reward_description,
  stamps_required = excluded.stamps_required,
  program_type = excluded.program_type,
  points_per_dollar = excluded.points_per_dollar,
  points_required = excluded.points_required,
  is_active = true,
  updated_at = now();

insert into public.loyalty_memberships (program_id, business_id, customer_id, is_active)
select program.id, program.business_id, profile.id, true
from public.loyalty_programs program
cross join lateral (select id from public.profiles order by created_at limit 1) profile
join public.businesses business on business.id = program.business_id
where business.slug like 'demo-%'
on conflict (program_id, customer_id) do update set is_active = true;

-- Give the demo customer a little points history so the points card can be
-- exercised immediately after seeding.
insert into public.loyalty_transactions
  (membership_id, business_id, transaction_type, amount, points_amount, spend_minor, actor_id, idempotency_key, note)
select membership.id, membership.business_id, 'points_earned', 1, 50, 2500, membership.customer_id,
  '77777777-7777-4777-8777-777777777771'::uuid, 'Demo points purchase'
from public.loyalty_memberships membership
join public.businesses business on business.id = membership.business_id
where business.slug = 'demo-roaming-roots'
on conflict (business_id, idempotency_key) do nothing;

insert into public.business_follows (business_id, customer_id)
select business.id, profile.id
from public.businesses business
cross join lateral (select id from public.profiles order by created_at limit 1) profile
where business.slug like 'demo-%'
on conflict do nothing;

insert into public.events (
  business_id, slug, title, description, starts_at, ends_at, timezone, location_mode,
  address_text, age_note, capacity_text, is_published
)
select business.id, item.slug, item.title, item.description,
       now() + item.starts_after, now() + item.starts_after + item.duration,
       'America/Chicago', item.location_mode, item.address_text, item.age_note,
       item.capacity_text, true
from (
  values
    ('demo-bayou-bloom', 'first-friday-coffee', 'First Friday coffee flight', 'Taste three rotating roasts and meet the people behind them.', interval '7 days', interval '2 hours', 'business', '211 Oak Street, Hammond, LA', null, 'Seats available'),
    ('demo-bayou-bloom', 'sunday-brunch', 'Sunday porch brunch', 'A relaxed brunch board with seasonal fruit, biscuits, and local preserves.', interval '14 days', interval '2 hours', 'business', '211 Oak Street, Hammond, LA', null, 'Reservations suggested'),
    ('demo-bayou-bloom', 'latte-lab', 'Latte lab: spring flavors', 'A hands-on tasting of house syrups and espresso pairings.', interval '28 days', interval '90 minutes', 'business', '211 Oak Street, Hammond, LA', 'All ages welcome', '12 seats'),
    ('demo-cypress-care', 'home-maintenance-clinic', 'Home maintenance clinic', 'Bring your questions and leave with a seasonal home-care checklist.', interval '7 days 1 hour', interval '2 hours', 'custom', '803 Florida Avenue, Hammond, LA', 'All ages welcome', '20 seats'),
    ('demo-cypress-care', 'neighborhood-fix-day', 'Neighborhood fix-it day', 'A free afternoon of small repairs and practical how-to help.', interval '19 days', interval '4 hours', 'custom', 'Ponchatoula Community Center', 'All ages welcome', 'Drop-in'),
    ('demo-cypress-care', 'storm-ready-workshop', 'Storm-ready home workshop', 'Prepare your home and emergency kit before storm season.', interval '45 days', interval '2 hours', 'online', null, 'All ages welcome', 'Registration required'),
    ('demo-lantern-row', 'maker-saturday', 'Maker Saturday market', 'Browse one-of-a-kind goods and meet the makers behind the shelves.', interval '7 days 3 hours', interval '5 hours', 'business', '114 Cate Street, Hammond, LA', 'All ages welcome', 'Drop-in'),
    ('demo-lantern-row', 'styling-night', 'Small-space styling night', 'Simple ways to make a rental or starter home feel like your own.', interval '23 days', interval '90 minutes', 'business', '114 Cate Street, Hammond, LA', '18+ suggested', '24 seats'),
    ('demo-lantern-row', 'summer-preview', 'Summer collection preview', 'A first look at warm-weather goods from regional makers.', interval '55 days', interval '2 hours', 'business', '114 Cate Street, Hammond, LA', 'All ages welcome', 'RSVP requested'),
    ('demo-magnolia-room', 'friday-listening-room', 'Friday listening room', 'An intimate set from a rotating lineup of Louisiana songwriters.', interval '7 days 5 hours', interval '3 hours', 'business', '509 Phoenix Square, Hammond, LA', '21+', '60 seats'),
    ('demo-magnolia-room', 'comedy-showcase', 'Northshore comedy showcase', 'A stand-up showcase featuring new and familiar local voices.', interval '16 days', interval '2 hours', 'business', '509 Phoenix Square, Hammond, LA', '18+', '60 seats'),
    ('demo-magnolia-room', 'community-jam', 'Community jam night', 'Bring an instrument or just bring your ears for an open community jam.', interval '35 days', interval '3 hours', 'business', '509 Phoenix Square, Hammond, LA', 'All ages welcome', 'Drop-in'),
    ('demo-northshore-makers', 'open-studio', 'Open studio Sunday', 'Explore the studio, try a new tool, and meet fellow makers.', interval '7 days 7 hours', interval '3 hours', 'business', '130 Market Street, Hammond, LA', 'All ages welcome', '20 spots'),
    ('demo-northshore-makers', 'clay-basics', 'Clay basics workshop', 'A low-pressure introduction to hand-building with clay.', interval '21 days', interval '2.5 hours', 'business', '130 Market Street, Hammond, LA', '12+', '10 spots'),
    ('demo-northshore-makers', 'community-collab', 'Community collaboration night', 'Bring a project idea and find a collaborator, mentor, or new friend.', interval '42 days', interval '2 hours', 'business', '130 Market Street, Hammond, LA', 'All ages welcome', 'Drop-in'),
    ('demo-roaming-roots', 'downtown-bowl-pop-up', 'Downtown bowl pop-up', 'Build a bright grain bowl and meet the Roaming Roots crew at the lunch stop.', interval '2 days 11 hours', interval '3 hours', 'custom', 'Cate Square Park, Hammond, LA', 'All ages welcome', 'Drop-in'),
    ('demo-roaming-roots', 'market-brunch-run', 'Market brunch run', 'A Saturday menu of pressed sandwiches, cold brew, and seasonal sides.', interval '6 days 10 hours', interval '4 hours', 'custom', 'Hammond Farmers Market', 'All ages welcome', 'While supplies last')
) as item(business_slug, slug, title, description, starts_after, duration, location_mode, address_text, age_note, capacity_text)
join public.businesses business on business.slug = item.business_slug
on conflict (business_id, slug) do update set
  title = excluded.title,
  description = excluded.description,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  timezone = excluded.timezone,
  location_mode = excluded.location_mode,
  address_text = excluded.address_text,
  age_note = excluded.age_note,
  capacity_text = excluded.capacity_text,
  is_published = true,
  archived_at = null,
  publish_at = null,
  updated_at = now();

insert into public.business_location_stops
  (business_id, title, address_text, latitude, longitude, starts_at, ends_at, timezone, is_published)
select business.id, stop.title, stop.address_text, stop.latitude, stop.longitude,
  stop.starts_at, stop.ends_at, 'America/Chicago', true
from public.businesses business
cross join lateral (
  values
    ('Downtown lunch stop', 'Cate Square Park', 30.5059::double precision, -90.4742::double precision, now() + interval '2 days' + interval '11 hours', now() + interval '2 days' + interval '14 hours'),
    ('Ponchatoula evening stop', 'City Park entrance', 30.4388::double precision, -90.4415::double precision, now() + interval '4 days' + interval '16 hours', now() + interval '4 days' + interval '19 hours'),
    ('Saturday market stop', 'Hammond Farmers Market', 30.5080::double precision, -90.4800::double precision, now() + interval '6 days' + interval '10 hours', now() + interval '6 days' + interval '14 hours')
) as stop(title, address_text, latitude, longitude, starts_at, ends_at)
where business.slug = 'demo-roaming-roots'
  and not exists (
    select 1 from public.business_location_stops existing
    where existing.business_id = business.id and existing.title = stop.title
  );

commit;
