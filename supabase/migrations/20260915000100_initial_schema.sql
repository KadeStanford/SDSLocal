begin;

create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create type public.business_type as enum (
  'food_drink',
  'services',
  'retail',
  'entertainment_venue',
  'general'
);
create type public.business_status as enum ('draft', 'pending_review', 'active', 'suspended');
create type public.business_role as enum ('owner', 'staff');
create type public.page_theme as enum ('light', 'dark');
create type public.photo_role as enum ('gallery', 'logo', 'cover', 'offering', 'event', 'loyalty');
create type public.media_status as enum ('processing', 'ready', 'failed', 'pending_delete');
create type public.media_variant as enum (
  'logo_small',
  'logo_standard',
  'logo_high_density',
  'thumbnail',
  'card',
  'full',
  'cover',
  'event_card'
);
create type public.loyalty_transaction_type as enum ('stamp', 'redemption', 'reversal');
create type public.subscription_provider as enum ('stripe', 'apple', 'google');
create type public.subscription_status as enum (
  'trialing',
  'active',
  'past_due',
  'grace_period',
  'cancelled',
  'expired'
);
create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
create type public.report_target_type as enum ('business', 'event', 'offering_item');
create type public.analytics_event_name as enum (
  'page_view',
  'qr_scan',
  'offering_view',
  'follow',
  'unfollow',
  'loyalty_join',
  'loyalty_stamp',
  'reward_redeemed',
  'event_view',
  'event_save',
  'phone_click',
  'directions_click',
  'social_click'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name varchar(100),
  avatar_media_id uuid,
  city varchar(100),
  region_code varchar(10),
  postal_code varchar(20),
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (char_length(display_name) between 1 and 100)
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete restrict,
  slug varchar(80) not null unique,
  name varchar(120) not null,
  business_type public.business_type not null,
  status public.business_status not null default 'draft',
  description varchar(2000) not null default '',
  category_summary varchar(240),
  phone varchar(32),
  email varchar(254),
  website_url varchar(2048),
  instagram_url varchar(2048),
  facebook_url varchar(2048),
  tiktok_url varchar(2048),
  google_profile_url varchar(2048),
  address_line_1 varchar(160),
  address_line_2 varchar(160),
  city varchar(100),
  region_code varchar(10),
  postal_code varchar(20),
  country_code char(2) not null default 'US',
  service_area varchar(240),
  location extensions.geography(point, 4326),
  timezone varchar(64) not null default 'America/Chicago',
  primary_color char(7) not null default '#176B4D',
  accent_color char(7) not null default '#E99B45',
  page_theme public.page_theme not null default 'light',
  font_pair varchar(40) not null default 'friendly_sans',
  button_style varchar(24) not null default 'rounded',
  section_order smallint[] not null default '{1,2,3,4}',
  approved_at timestamptz,
  suspended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_document tsvector generated always as (
    to_tsvector(
      'english',
      coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(category_summary, '')
    )
  ) stored,
  constraint businesses_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint businesses_name_length check (char_length(name) between 2 and 120),
  constraint businesses_colors check (
    primary_color ~ '^#[0-9A-Fa-f]{6}$' and accent_color ~ '^#[0-9A-Fa-f]{6}$'
  ),
  constraint businesses_approval_state check (
    (status = 'active' and approved_at is not null) or status <> 'active'
  )
);

create table public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.business_role not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create table public.categories (
  id smallint generated always as identity primary key,
  slug varchar(80) not null unique,
  name varchar(100) not null,
  business_type public.business_type,
  display_order smallint not null default 0,
  is_active boolean not null default true,
  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table public.business_categories (
  business_id uuid not null references public.businesses (id) on delete cascade,
  category_id smallint not null references public.categories (id) on delete restrict,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (business_id, category_id)
);

create table public.business_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  day_of_week smallint not null,
  interval_number smallint not null default 1,
  opens_at time,
  closes_at time,
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, day_of_week, interval_number),
  constraint business_hours_day check (day_of_week between 0 and 6),
  constraint business_hours_interval check (interval_number between 1 and 2),
  constraint business_hours_values check (
    (is_closed and opens_at is null and closes_at is null)
    or (not is_closed and opens_at is not null and closes_at is not null and opens_at <> closes_at)
  )
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  asset_group_id uuid not null,
  business_id uuid not null references public.businesses (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id) on delete restrict,
  bucket varchar(63) not null default 'business-media',
  storage_path varchar(512) not null unique,
  role public.photo_role not null,
  variant public.media_variant not null,
  status public.media_status not null default 'processing',
  mime_type varchar(100) not null,
  width integer not null,
  height integer not null,
  byte_size integer not null,
  content_hash char(64),
  alt_text varchar(240),
  created_at timestamptz not null default now(),
  ready_at timestamptz,
  delete_after timestamptz,
  unique (asset_group_id, variant),
  constraint media_dimensions_positive check (width > 0 and height > 0),
  constraint media_bytes_positive check (byte_size > 0 and byte_size <= 15728640),
  constraint media_mime_allowed check (
    mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/svg+xml')
  )
);

alter table public.profiles
  add constraint profiles_avatar_media_fk
  foreign key (avatar_media_id) references public.media_assets (id) on delete set null;

create table public.business_photos (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  media_asset_id uuid not null references public.media_assets (id) on delete restrict,
  role public.photo_role not null default 'gallery',
  caption varchar(240),
  display_order smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (business_id, media_asset_id)
);

create table public.offering_sections (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name varchar(100) not null,
  description varchar(500),
  display_order smallint not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offering_sections_name_length check (char_length(name) between 1 and 100),
  unique (id, business_id)
);

create table public.offering_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  section_id uuid not null,
  media_asset_id uuid references public.media_assets (id) on delete set null,
  name varchar(120) not null,
  description varchar(1000) not null default '',
  price_minor integer,
  price_text varchar(80),
  currency char(3) not null default 'USD',
  is_available boolean not null default true,
  is_featured boolean not null default false,
  is_visible boolean not null default true,
  display_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_document tsvector generated always as (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
  ) stored,
  constraint offering_items_name_length check (char_length(name) between 1 and 120),
  constraint offering_items_price check (price_minor is null or price_minor >= 0),
  constraint offering_items_price_present check (price_minor is not null or price_text is not null),
  foreign key (section_id, business_id)
    references public.offering_sections (id, business_id) on delete cascade
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  media_asset_id uuid references public.media_assets (id) on delete set null,
  slug varchar(100) not null,
  title varchar(160) not null,
  description varchar(5000) not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz,
  address_text varchar(320),
  location extensions.geography(point, 4326),
  external_url varchar(2048),
  age_note varchar(120),
  capacity_text varchar(120),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, slug),
  constraint events_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint events_time_order check (ends_at is null or ends_at > starts_at)
);

create table public.event_saves (
  event_id uuid not null references public.events (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  reminder_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (event_id, customer_id)
);

create table public.business_follows (
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (business_id, customer_id)
);

create table public.loyalty_programs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses (id) on delete cascade,
  media_asset_id uuid references public.media_assets (id) on delete set null,
  name varchar(120) not null,
  reward_description varchar(500) not null,
  stamps_required smallint not null,
  terms varchar(2000) not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, business_id),
  constraint loyalty_stamps_required check (stamps_required between 2 and 30)
);

create table public.loyalty_memberships (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null,
  business_id uuid not null,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (program_id, customer_id),
  unique (id, business_id),
  foreign key (program_id, business_id)
    references public.loyalty_programs (id, business_id) on delete cascade
);

create table public.loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null,
  business_id uuid not null,
  transaction_type public.loyalty_transaction_type not null,
  amount smallint not null default 1,
  actor_id uuid not null references public.profiles (id) on delete restrict,
  reversal_of uuid references public.loyalty_transactions (id) on delete restrict,
  idempotency_key uuid not null,
  note varchar(240),
  created_at timestamptz not null default now(),
  foreign key (membership_id, business_id)
    references public.loyalty_memberships (id, business_id) on delete restrict,
  unique (business_id, idempotency_key),
  constraint loyalty_transaction_amount check (amount between 1 and 30),
  constraint loyalty_reversal_reference check (
    (transaction_type = 'reversal' and reversal_of is not null)
    or (transaction_type <> 'reversal' and reversal_of is null)
  )
);

create unique index loyalty_transactions_one_reversal_idx
  on public.loyalty_transactions (reversal_of)
  where reversal_of is not null;

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  expo_push_token varchar(255) not null unique,
  platform varchar(12) not null,
  device_id_hash char(64),
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint push_tokens_platform check (platform in ('ios', 'android'))
);

create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  business_id uuid references public.businesses (id) on delete cascade,
  notification_type varchar(32) not null,
  is_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  unique nulls not distinct (user_id, business_id, notification_type),
  constraint notification_preferences_type check (
    notification_type in ('events', 'loyalty', 'general_updates', 'operational')
  )
);

create table public.analytics_recent_events (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses (id) on delete cascade,
  event_name public.analytics_event_name not null,
  subject_id uuid,
  visitor_hash bytea,
  source varchar(40),
  occurred_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '45 days'),
  constraint analytics_source_length check (char_length(source) <= 40)
);

create table public.analytics_daily (
  business_id uuid not null references public.businesses (id) on delete cascade,
  metric_date date not null,
  page_views integer not null default 0,
  unique_visitors integer not null default 0,
  qr_scans integer not null default 0,
  offering_views integer not null default 0,
  follows integer not null default 0,
  unfollows integer not null default 0,
  loyalty_joins integer not null default 0,
  loyalty_stamps integer not null default 0,
  rewards_redeemed integer not null default 0,
  event_views integer not null default 0,
  event_saves integer not null default 0,
  phone_clicks integer not null default 0,
  directions_clicks integer not null default 0,
  social_clicks integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (business_id, metric_date),
  constraint analytics_daily_nonnegative check (
    page_views >= 0 and unique_visitors >= 0 and qr_scans >= 0 and
    offering_views >= 0 and follows >= 0 and unfollows >= 0 and
    loyalty_joins >= 0 and loyalty_stamps >= 0 and rewards_redeemed >= 0 and
    event_views >= 0 and event_saves >= 0 and phone_clicks >= 0 and
    directions_clicks >= 0 and social_clicks >= 0
  )
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  provider public.subscription_provider not null,
  provider_customer_id varchar(255),
  provider_subscription_id varchar(255) not null,
  entitlement varchar(64) not null default 'business_pro',
  status public.subscription_status not null,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  grace_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_subscription_id)
);

create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type public.report_target_type not null,
  business_id uuid references public.businesses (id) on delete cascade,
  event_id uuid references public.events (id) on delete cascade,
  offering_item_id uuid references public.offering_items (id) on delete cascade,
  reason varchar(80) not null,
  details varchar(2000),
  status public.report_status not null default 'open',
  resolution_note varchar(1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_reports_one_target check (
    num_nonnulls(business_id, event_id, offering_item_id) = 1
  ),
  constraint content_reports_target_matches check (
    (target_type = 'business' and business_id is not null)
    or (target_type = 'event' and event_id is not null)
    or (target_type = 'offering_item' and offering_item_id is not null)
  )
);

create table public.blocked_businesses (
  customer_id uuid not null references public.profiles (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (customer_id, business_id)
);

create table public.platform_settings (
  key varchar(80) primary key,
  value jsonb not null,
  description varchar(500) not null,
  updated_at timestamptz not null default now()
);

create index businesses_active_idx on public.businesses (status, updated_at desc)
  where status = 'active';
create index businesses_location_idx on public.businesses using gist (location)
  where status = 'active' and location is not null;
create index businesses_search_idx on public.businesses using gin (search_document);
create index businesses_name_trgm_idx on public.businesses using gin (name extensions.gin_trgm_ops);
create index business_members_user_idx on public.business_members (user_id, business_id)
  where is_active;
create unique index business_categories_one_primary_idx on public.business_categories (business_id)
  where is_primary;
create index offering_sections_business_order_idx
  on public.offering_sections (business_id, display_order) where is_visible;
create index offering_items_business_order_idx
  on public.offering_items (business_id, section_id, display_order) where is_visible;
create index offering_items_search_idx on public.offering_items using gin (search_document);
create index events_business_date_idx on public.events (business_id, starts_at)
  where is_published;
create index events_upcoming_idx on public.events (starts_at, business_id)
  where is_published;
create index event_saves_customer_idx on public.event_saves (customer_id, created_at desc);
create index business_follows_customer_idx
  on public.business_follows (customer_id, created_at desc);
create index loyalty_memberships_customer_idx
  on public.loyalty_memberships (customer_id, joined_at desc) where is_active;
create index loyalty_transactions_membership_date_idx
  on public.loyalty_transactions (membership_id, created_at desc);
create index analytics_recent_business_date_idx
  on public.analytics_recent_events (business_id, occurred_at desc);
create index analytics_recent_expiry_idx on public.analytics_recent_events (expires_at);
create index subscriptions_business_status_idx on public.subscriptions (business_id, status);
create index reports_queue_idx on public.content_reports (status, created_at)
  where status in ('open', 'reviewing');
create index media_assets_business_idx on public.media_assets (business_id, created_at desc);
create index media_assets_cleanup_idx on public.media_assets (delete_after)
  where delete_after is not null;
create index media_assets_hash_idx on public.media_assets (business_id, content_hash)
  where content_hash is not null;
create index business_photos_order_idx
  on public.business_photos (business_id, role, display_order);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger businesses_set_updated_at before update on public.businesses
for each row execute function public.set_updated_at();
create trigger business_hours_set_updated_at before update on public.business_hours
for each row execute function public.set_updated_at();
create trigger offering_sections_set_updated_at before update on public.offering_sections
for each row execute function public.set_updated_at();
create trigger offering_items_set_updated_at before update on public.offering_items
for each row execute function public.set_updated_at();
create trigger events_set_updated_at before update on public.events
for each row execute function public.set_updated_at();
create trigger loyalty_programs_set_updated_at before update on public.loyalty_programs
for each row execute function public.set_updated_at();
create trigger notification_preferences_set_updated_at before update on public.notification_preferences
for each row execute function public.set_updated_at();
create trigger subscriptions_set_updated_at before update on public.subscriptions
for each row execute function public.set_updated_at();
create trigger reports_set_updated_at before update on public.content_reports
for each row execute function public.set_updated_at();
create trigger settings_set_updated_at before update on public.platform_settings
for each row execute function public.set_updated_at();

create or replace function public.protect_business_moderation_state()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.role() = 'authenticated' then
    if new.approved_at is distinct from old.approved_at
      or new.suspended_at is distinct from old.suspended_at then
      raise exception 'Moderation timestamps are server-managed';
    end if;

    if new.status is distinct from old.status
      and not (
        (old.status = 'draft' and new.status = 'pending_review')
        or (old.status = 'pending_review' and new.status = 'draft')
      ) then
      raise exception 'This business status transition requires moderation';
    end if;
  end if;
  return new;
end;
$$;

create trigger businesses_protect_moderation_state
before update of status, approved_at, suspended_at on public.businesses
for each row execute function public.protect_business_moderation_state();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(left(new.raw_user_meta_data ->> 'display_name', 100), ''));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_business_member(p_business_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.business_members
    where business_id = p_business_id
      and user_id = (select auth.uid())
      and is_active
  );
$$;

create or replace function public.is_business_owner(p_business_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.business_members
    where business_id = p_business_id
      and user_id = (select auth.uid())
      and role = 'owner'
      and is_active
  );
$$;

revoke all on function public.is_business_member(uuid, uuid) from public;
revoke all on function public.is_business_owner(uuid, uuid) from public;
grant execute on function public.is_business_member(uuid, uuid) to anon, authenticated;
grant execute on function public.is_business_owner(uuid, uuid) to authenticated;

create or replace function public.enforce_staff_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  configured_limit integer;
  current_staff integer;
begin
  if new.role <> 'staff' or not new.is_active then
    return new;
  end if;

  select coalesce((value ->> 'value')::integer, 3)
    into configured_limit
    from public.platform_settings
   where key = 'staff_limit';

  select count(*)
    into current_staff
    from public.business_members
   where business_id = new.business_id
     and role = 'staff'
     and is_active
     and id <> new.id;

  if current_staff >= coalesce(configured_limit, 3) then
    raise exception 'Business staff limit reached';
  end if;
  return new;
end;
$$;

create trigger business_members_staff_limit
before insert or update of role, is_active on public.business_members
for each row execute function public.enforce_staff_limit();

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.categories enable row level security;
alter table public.business_categories enable row level security;
alter table public.business_hours enable row level security;
alter table public.media_assets enable row level security;
alter table public.business_photos enable row level security;
alter table public.offering_sections enable row level security;
alter table public.offering_items enable row level security;
alter table public.events enable row level security;
alter table public.event_saves enable row level security;
alter table public.business_follows enable row level security;
alter table public.loyalty_programs enable row level security;
alter table public.loyalty_memberships enable row level security;
alter table public.loyalty_transactions enable row level security;
alter table public.push_tokens enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.analytics_recent_events enable row level security;
alter table public.analytics_daily enable row level security;
alter table public.subscriptions enable row level security;
alter table public.content_reports enable row level security;
alter table public.blocked_businesses enable row level security;
alter table public.platform_settings enable row level security;

create policy profiles_select_self on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_insert_self on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy profiles_delete_self on public.profiles for delete to authenticated
  using (id = (select auth.uid()));

create policy businesses_public_read on public.businesses for select to anon, authenticated
  using (
    status = 'active'
    or created_by = (select auth.uid())
    or public.is_business_member(id, (select auth.uid()))
  );
create policy businesses_create on public.businesses for insert to authenticated
  with check (created_by = (select auth.uid()) and status = 'draft');
create policy businesses_owner_update on public.businesses for update to authenticated
  using (public.is_business_owner(id, (select auth.uid())))
  with check (public.is_business_owner(id, (select auth.uid())));
create policy businesses_owner_delete on public.businesses for delete to authenticated
  using (public.is_business_owner(id, (select auth.uid())));

create policy members_read on public.business_members for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_business_member(business_id, (select auth.uid()))
  );
create policy members_owner_insert on public.business_members for insert to authenticated
  with check (
    public.is_business_owner(business_id, (select auth.uid()))
    or (
      user_id = (select auth.uid())
      and role = 'owner'
      and exists (
        select 1 from public.businesses b
        where b.id = business_id and b.created_by = (select auth.uid())
      )
    )
  );
create policy members_owner_update on public.business_members for update to authenticated
  using (public.is_business_owner(business_id, (select auth.uid())))
  with check (public.is_business_owner(business_id, (select auth.uid())));
create policy members_owner_delete on public.business_members for delete to authenticated
  using (public.is_business_owner(business_id, (select auth.uid())));

create policy categories_public_read on public.categories for select to anon, authenticated
  using (is_active);

create policy business_categories_read on public.business_categories for select to anon, authenticated
  using (
    exists (select 1 from public.businesses b where b.id = business_id and b.status = 'active')
    or public.is_business_member(business_id, (select auth.uid()))
  );
create policy business_categories_owner_all on public.business_categories for all to authenticated
  using (public.is_business_owner(business_id, (select auth.uid())))
  with check (public.is_business_owner(business_id, (select auth.uid())));

create policy business_hours_read on public.business_hours for select to anon, authenticated
  using (
    exists (select 1 from public.businesses b where b.id = business_id and b.status = 'active')
    or public.is_business_member(business_id, (select auth.uid()))
  );
create policy business_hours_owner_all on public.business_hours for all to authenticated
  using (public.is_business_owner(business_id, (select auth.uid())))
  with check (public.is_business_owner(business_id, (select auth.uid())));

create policy media_assets_read on public.media_assets for select to anon, authenticated
  using (
    (status = 'ready' and exists (
      select 1 from public.businesses b where b.id = business_id and b.status = 'active'
    ))
    or public.is_business_member(business_id, (select auth.uid()))
  );

create policy business_photos_read on public.business_photos for select to anon, authenticated
  using (
    exists (select 1 from public.businesses b where b.id = business_id and b.status = 'active')
    or public.is_business_member(business_id, (select auth.uid()))
  );
create policy business_photos_owner_all on public.business_photos for all to authenticated
  using (public.is_business_owner(business_id, (select auth.uid())))
  with check (public.is_business_owner(business_id, (select auth.uid())));

create policy offering_sections_read on public.offering_sections for select to anon, authenticated
  using (
    (is_visible and exists (
      select 1 from public.businesses b where b.id = business_id and b.status = 'active'
    ))
    or public.is_business_member(business_id, (select auth.uid()))
  );
create policy offering_sections_owner_all on public.offering_sections for all to authenticated
  using (public.is_business_owner(business_id, (select auth.uid())))
  with check (public.is_business_owner(business_id, (select auth.uid())));

create policy offering_items_read on public.offering_items for select to anon, authenticated
  using (
    (is_visible and exists (
      select 1 from public.businesses b where b.id = business_id and b.status = 'active'
    ))
    or public.is_business_member(business_id, (select auth.uid()))
  );
create policy offering_items_owner_all on public.offering_items for all to authenticated
  using (public.is_business_owner(business_id, (select auth.uid())))
  with check (public.is_business_owner(business_id, (select auth.uid())));

create policy events_read on public.events for select to anon, authenticated
  using (
    (is_published and exists (
      select 1 from public.businesses b where b.id = business_id and b.status = 'active'
    ))
    or public.is_business_member(business_id, (select auth.uid()))
  );
create policy events_owner_all on public.events for all to authenticated
  using (public.is_business_owner(business_id, (select auth.uid())))
  with check (public.is_business_owner(business_id, (select auth.uid())));

create policy event_saves_read on public.event_saves for select to authenticated
  using (customer_id = (select auth.uid()));
create policy event_saves_insert on public.event_saves for insert to authenticated
  with check (customer_id = (select auth.uid()));
create policy event_saves_update on public.event_saves for update to authenticated
  using (customer_id = (select auth.uid())) with check (customer_id = (select auth.uid()));
create policy event_saves_delete on public.event_saves for delete to authenticated
  using (customer_id = (select auth.uid()));

create policy follows_read on public.business_follows for select to authenticated
  using (
    customer_id = (select auth.uid())
    or public.is_business_owner(business_id, (select auth.uid()))
  );
create policy follows_insert on public.business_follows for insert to authenticated
  with check (customer_id = (select auth.uid()));
create policy follows_delete on public.business_follows for delete to authenticated
  using (customer_id = (select auth.uid()));

create policy loyalty_programs_read on public.loyalty_programs for select to anon, authenticated
  using (
    (is_active and exists (
      select 1 from public.businesses b where b.id = business_id and b.status = 'active'
    ))
    or public.is_business_member(business_id, (select auth.uid()))
  );
create policy loyalty_programs_owner_all on public.loyalty_programs for all to authenticated
  using (public.is_business_owner(business_id, (select auth.uid())))
  with check (public.is_business_owner(business_id, (select auth.uid())));

create policy loyalty_memberships_read on public.loyalty_memberships for select to authenticated
  using (
    customer_id = (select auth.uid())
    or public.is_business_member(business_id, (select auth.uid()))
  );
create policy loyalty_memberships_join on public.loyalty_memberships for insert to authenticated
  with check (
    customer_id = (select auth.uid())
    and exists (
      select 1 from public.loyalty_programs p
      join public.businesses b on b.id = p.business_id
      where p.id = program_id and p.business_id = business_id and p.is_active and b.status = 'active'
    )
  );
create policy loyalty_memberships_customer_update on public.loyalty_memberships for update to authenticated
  using (customer_id = (select auth.uid())) with check (customer_id = (select auth.uid()));

create policy loyalty_transactions_read on public.loyalty_transactions for select to authenticated
  using (
    public.is_business_member(business_id, (select auth.uid()))
    or exists (
      select 1 from public.loyalty_memberships m
      where m.id = membership_id and m.customer_id = (select auth.uid())
    )
  );

create policy push_tokens_owner_all on public.push_tokens for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy notification_preferences_owner_all on public.notification_preferences for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy analytics_recent_owner_read on public.analytics_recent_events for select to authenticated
  using (public.is_business_owner(business_id, (select auth.uid())));
create policy analytics_daily_owner_read on public.analytics_daily for select to authenticated
  using (public.is_business_owner(business_id, (select auth.uid())));

create policy subscriptions_owner_read on public.subscriptions for select to authenticated
  using (public.is_business_owner(business_id, (select auth.uid())));

create policy reports_create on public.content_reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and status = 'open');
create policy reports_own_read on public.content_reports for select to authenticated
  using (reporter_id = (select auth.uid()));

create policy blocked_businesses_owner_all on public.blocked_businesses for all to authenticated
  using (customer_id = (select auth.uid())) with check (customer_id = (select auth.uid()));

create policy platform_settings_authenticated_read on public.platform_settings for select to authenticated
  using (true);

-- platform_settings and server-write-only tables intentionally have no client write policy.
-- The service role bypasses RLS for trusted jobs and Edge Functions.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'business-media',
    'business-media',
    true,
    15728640,
    array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
  ),
  (
    'media-staging',
    'media-staging',
    false,
    15728640,
    array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
  )
on conflict (id) do nothing;

create policy media_staging_owner_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'media-staging'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy media_staging_owner_read on storage.objects for select to authenticated
  using (
    bucket_id = 'media-staging'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy media_staging_owner_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'media-staging'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

commit;
