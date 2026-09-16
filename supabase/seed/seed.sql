insert into public.categories (slug, name, business_type, display_order)
values
  ('coffee-tea', 'Coffee & Tea', 'food_drink', 10),
  ('restaurants', 'Restaurants', 'food_drink', 20),
  ('bakeries', 'Bakeries', 'food_drink', 30),
  ('beauty-personal-care', 'Beauty & Personal Care', 'services', 40),
  ('home-services', 'Home Services', 'services', 50),
  ('automotive', 'Automotive', 'services', 60),
  ('shopping', 'Shopping', 'retail', 70),
  ('live-music', 'Live Music', 'entertainment_venue', 80),
  ('arts-entertainment', 'Arts & Entertainment', 'entertainment_venue', 90),
  ('other', 'Other Local Business', 'general', 100)
on conflict (slug) do update
set name = excluded.name,
    business_type = excluded.business_type,
    display_order = excluded.display_order;

insert into public.platform_settings (key, value, description)
values
  ('staff_limit', '{"value": 3}', 'Maximum active staff members per business in V1.'),
  ('gallery_image_limit', '{"value": 10}', 'Maximum gallery images per business in V1.'),
  ('media_review_bytes', '{"value": 52428800}', 'Media usage requiring administrator review.'),
  ('analytics_recent_retention_days', '{"value": 45}', 'Default raw analytics retention window.')
on conflict (key) do update
set value = excluded.value,
    description = excluded.description,
    updated_at = now();
