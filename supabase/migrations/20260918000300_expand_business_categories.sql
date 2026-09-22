-- Keep onboarding useful for the full range of local businesses supported by
-- the platform. Categories remain scoped to a business type so the picker
-- stays relevant without forcing owners to search through every category.
begin;

insert into public.categories (slug, name, business_type, display_order)
values
  -- Food and drink
  ('coffee-tea', 'Coffee & tea', 'food_drink', 10),
  ('restaurants', 'Restaurants', 'food_drink', 11),
  ('fast-food', 'Fast food', 'food_drink', 12),
  ('brunch', 'Brunch', 'food_drink', 13),
  ('bakeries', 'Bakeries', 'food_drink', 14),
  ('desserts-ice-cream', 'Desserts & ice cream', 'food_drink', 15),
  ('bars-cocktails', 'Bars & cocktails', 'food_drink', 16),
  ('breweries-wineries', 'Breweries & wineries', 'food_drink', 17),
  ('grocery-markets', 'Grocery & markets', 'food_drink', 18),

  -- Services
  ('beauty-personal-care', 'Beauty & personal care', 'services', 30),
  ('hair-barber', 'Hair & barber', 'services', 31),
  ('spa-massage', 'Spa & massage', 'services', 32),
  ('fitness-wellness', 'Fitness & wellness', 'services', 33),
  ('home-services', 'Home services', 'services', 34),
  ('home-improvement', 'Home improvement', 'services', 35),
  ('cleaning', 'Cleaning services', 'services', 36),
  ('landscaping-lawn-care', 'Landscaping & lawn care', 'services', 37),
  ('automotive', 'Automotive', 'services', 38),
  ('auto-repair', 'Auto repair', 'services', 39),
  ('car-wash-detailing', 'Car wash & detailing', 'services', 40),
  ('professional-consulting', 'Professional consulting', 'services', 41),
  ('accounting-tax', 'Accounting & tax', 'services', 42),
  ('legal-services', 'Legal services', 'services', 43),
  ('real-estate', 'Real estate', 'services', 44),
  ('pet-care', 'Pet care', 'services', 45),
  ('education-tutoring', 'Education & tutoring', 'services', 46),
  ('childcare', 'Childcare', 'services', 47),
  ('photography', 'Photography', 'services', 48),
  ('creative-marketing', 'Creative & marketing', 'services', 49),
  ('event-services', 'Event services', 'services', 50),
  ('repair-maintenance', 'Repair & maintenance', 'services', 51),

  -- Retail
  ('shopping', 'Shopping', 'retail', 60),
  ('clothing-accessories', 'Clothing & accessories', 'retail', 61),
  ('gifts-specialty', 'Gifts & specialty goods', 'retail', 62),
  ('home-garden', 'Home & garden', 'retail', 63),
  ('electronics', 'Electronics', 'retail', 64),
  ('beauty-products', 'Beauty products', 'retail', 65),
  ('books-media', 'Books & media', 'retail', 66),
  ('jewelry', 'Jewelry', 'retail', 67),
  ('furniture', 'Furniture', 'retail', 68),
  ('sporting-goods', 'Sporting goods', 'retail', 69),
  ('pet-supplies', 'Pet supplies', 'retail', 70),
  ('convenience', 'Convenience store', 'retail', 71),
  ('thrift-vintage', 'Thrift & vintage', 'retail', 72),
  ('art-craft', 'Art & craft supplies', 'retail', 73),

  -- Entertainment and venues
  ('live-music', 'Live music', 'entertainment_venue', 80),
  ('arts-entertainment', 'Arts & entertainment', 'entertainment_venue', 81),
  ('nightlife', 'Nightlife', 'entertainment_venue', 82),
  ('family-activities', 'Family activities', 'entertainment_venue', 83),
  ('sports-recreation', 'Sports & recreation', 'entertainment_venue', 84),
  ('museums-galleries', 'Museums & galleries', 'entertainment_venue', 85),
  ('theaters', 'Theaters & performing arts', 'entertainment_venue', 86),
  ('event-venue', 'Event venue', 'entertainment_venue', 87),
  ('comedy', 'Comedy', 'entertainment_venue', 88),
  ('dance', 'Dance', 'entertainment_venue', 89),
  ('attractions', 'Attractions', 'entertainment_venue', 90),
  ('parks-outdoors', 'Parks & outdoors', 'entertainment_venue', 91),
  ('gaming', 'Gaming', 'entertainment_venue', 92),

  -- Mobile and pop-up businesses
  ('food-trucks', 'Food trucks', 'mobile', 100),
  ('mobile-food', 'Mobile food & drink', 'mobile', 101),
  ('pop-up-dining', 'Pop-up dining', 'mobile', 102),
  ('farmers-markets', 'Farmers markets', 'mobile', 103),
  ('pop-up-retail', 'Pop-up retail', 'mobile', 104),
  ('mobile-services', 'Mobile services', 'mobile', 105),
  ('mobile-beauty', 'Mobile beauty & wellness', 'mobile', 106),
  ('mobile-auto', 'Mobile auto care', 'mobile', 107),
  ('mobile-fitness', 'Mobile fitness', 'mobile', 108),
  ('mobile-event-services', 'Mobile event services', 'mobile', 109),

  -- General, community, and organizations
  ('community-organizations', 'Community organizations', 'general', 120),
  ('markets-fairs', 'Markets & fairs', 'general', 121),
  ('religious-organizations', 'Religious organizations', 'general', 122),
  ('nonprofit', 'Nonprofit organizations', 'general', 123),
  ('public-community', 'Public & community services', 'general', 124),
  ('local-services', 'Local services', 'general', 125),
  ('other', 'Other local business', 'general', 126)
on conflict (slug) do update
set name = excluded.name,
    business_type = excluded.business_type,
    display_order = excluded.display_order,
    is_active = true;

commit;
