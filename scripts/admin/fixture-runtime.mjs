import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { PickupOperations } from '../../supabase/functions/_shared/pickup-operations.ts';
import { createReportPayload } from '../../apps/mobile/src/lib/customer-safety-core.ts';
import { fixtureSupabase } from './fixture-supabase.mjs';

export const repositoryPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const root = pathToFileURL(repositoryPath + path.sep);
export const ADMIN_ID = 'a0000000-0000-4000-8000-000000000001';
export const OWNER_ID = 'a0000000-0000-4000-8000-000000000002';
export const CUSTOMER_ID = 'a0000000-0000-4000-8000-000000000003';
export const FIXTURE_COUNTS = {
  users: 4,
  businesses: 7,
  content_reports: 3,
  pickup_review_reports: 3,
  event_review_reports: 2,
};
export const FIXTURE_VERSION = '2026-10-06.v6-normal-flows-outcome-security';

function table(sql, name) {
  const start = sql.indexOf(`create table public.${name} (`);
  if (start < 0) throw new Error(`Missing authoritative table ${name}`);
  return sql.slice(start, sql.indexOf('\n);', start) + 4);
}
function fn(sql, name) {
  const start = sql.indexOf(`create or replace function public.${name}(`);
  if (start < 0) throw new Error(`Missing authoritative function ${name}`);
  return sql.slice(start, sql.indexOf('$$;', sql.indexOf('as $$', start)) + 3);
}

// Reduced schema contract harness, NOT a Supabase stack or staging clone.
// Moderation tables/constraints, readiness, guard and new RPCs come from source SQL.
// Spatial column is text; merchant operational tables and auth are minimal stubs.
// No SMTP, networked providers, dispatch worker, storage objects or payment keys.
export async function createFixtureDatabase(PGlite, rootPath, options = {}) {
  const fixtureRoot = rootPath ? pathToFileURL(rootPath.replace(/[/\\]?$/, '/')) : root;
  const source = (name) =>
    readFile(new URL(`supabase/migrations/${name}.sql`, fixtureRoot), 'utf8');
  const db = new PGlite();
  const initial = await source('20260915000100_initial_schema');
  await db.exec(`create schema auth; create schema extensions;
    create role anon; create role authenticated; create role service_role nologin bypassrls;
    create role sds_billing_manager nologin; grant usage on schema public,auth to anon,authenticated;
    create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.role() returns text language sql stable as $$
      select nullif(current_setting('request.jwt.claim.role',true),'') $$;
    ${[...initial.matchAll(/create type public\.\w+ as enum[\s\S]*?;/g)].map((x) => x[0]).join('\n')}`);
  for (const name of [
    'profiles',
    'businesses',
    'business_members',
    'categories',
    'business_categories',
    'business_hours',
    'media_assets',
    'business_photos',
    'offering_sections',
    'offering_items',
    'events',
    'content_reports',
    'platform_settings',
    'notification_preferences',
  ]) {
    await db.exec(table(initial, name).replace('extensions.geography(point, 4326)', 'text'));
  }
  await db.exec(`create index businesses_search_idx on public.businesses using gin(search_document);
    ${fn(initial, 'set_updated_at')}
    create trigger businesses_set_updated_at before update on public.businesses for each row execute function public.set_updated_at();
    create function public.is_business_owner(p_business_id uuid,p_user_id uuid) returns boolean
      language sql stable security definer set search_path='' as $$ select exists(
        select 1 from public.business_members where business_id=p_business_id and user_id=p_user_id and role='owner' and is_active) $$;
    create table public.square_orders(id uuid primary key,business_id uuid references public.businesses(id),
      customer_id uuid references auth.users(id),status text,completed_at timestamptz,guest_hash text);
    create table public.event_rsvps(id uuid primary key,event_id uuid references public.events(id),customer_id uuid references auth.users(id),status text,checked_in_at timestamptz);
    create table public.service_requests(id uuid primary key default gen_random_uuid(),status text);
    create table public.square_order_support_requests(id uuid primary key default gen_random_uuid(),status text);
    create table public.appointments(id uuid primary key default gen_random_uuid(),status text);
    create trigger content_reports_set_updated_at before update on public.content_reports for each row execute function public.set_updated_at();
    alter table public.businesses enable row level security;
    create policy businesses_owner_read on public.businesses for select to authenticated using(public.is_business_owner(id,auth.uid()));
    create policy businesses_owner_update on public.businesses for update to authenticated using(public.is_business_owner(id,auth.uid()));
    grant select,update on public.businesses to authenticated;`);
  await db.exec(`alter table public.content_reports enable row level security;
    create policy reports_create on public.content_reports for insert to authenticated
      with check(reporter_id=auth.uid() and status='open');
    create policy reports_own_read on public.content_reports for select to authenticated using(reporter_id=auth.uid());
    grant insert,select on public.content_reports to authenticated;`);
  const structured = await source('20260915000600_structured_service_areas');
  await db.exec(
    structured.slice(
      structured.indexOf('create type'),
      structured.indexOf('create or replace function'),
    ),
  );
  await db.exec(await source('20260915000900_review_and_offering_management'));
  for (const name of ['business_categories', 'business_hours', 'business_photos'])
    await db.exec(`
    alter table public.${name} enable row level security;
    create policy fixture_owner_write on public.${name} for all to authenticated
      using(public.is_business_owner(business_id,auth.uid())) with check(public.is_business_owner(business_id,auth.uid()));
    grant select,insert,update,delete on public.${name} to authenticated;`);
  await db.exec(await source('20260915001100_allow_trusted_moderation_updates'));
  await db.exec(await source('20260915001300_private_moderation_audit_helper'));
  await db.exec(await source('20260915001400_isolate_moderation_trigger_from_auth_schema'));
  await db.exec(
    fn(await source('20260920000200_billing_moderation_role'), 'protect_business_moderation_state'),
  );
  await db.exec(`create trigger businesses_moderation_guard before update on public.businesses
    for each row execute function public.protect_business_moderation_state();`);
  for (const [migration, names] of [
    [
      '20260927000300_verified_order_reviews',
      ['pickup_order_reviews', 'pickup_order_review_reports', 'pickup_order_review_events'],
    ],
    [
      '20260927000600_verified_event_reviews',
      ['verified_event_reviews', 'verified_event_review_reports', 'verified_event_review_events'],
    ],
  ]) {
    const sql = await source(migration);
    for (const name of names) await db.exec(table(sql, name));
    const review = names[0];
    await db.exec(`create trigger ${review}_set_updated_at before update on public.${review} for each row execute function public.set_updated_at();
      alter table public.${review} enable row level security;
      alter table public.${names[1]} enable row level security;
      alter table public.${names[2]} enable row level security;
      revoke all on public.${review},public.${names[1]},public.${names[2]} from public,anon,authenticated;`);
  }
  await db.exec(await source('20260918000100_platform_admin_console'));
  await db.exec(
    fn(await source('20260920000500_listing_billing_rollout_flag'), 'submit_business_for_review'),
  );
  const notificationSource = await source('20260916001800_notifications');
  await db.exec(table(notificationSource, 'notification_deliveries'));
  await db.exec(`alter table public.notification_deliveries enable row level security;
    create policy notification_deliveries_owner_read on public.notification_deliveries
      for select to authenticated using(user_id=auth.uid());
    grant select,update on public.notification_deliveries to authenticated;
    grant usage on schema public,auth to service_role; grant all on public.notification_deliveries to service_role;`);
  await db.exec(fn(notificationSource, 'notification_enabled'));
  await db.exec(fn(notificationSource, 'claim_notification_deliveries'));
  await db.exec(`revoke all on function public.claim_notification_deliveries(integer) from public,anon,authenticated;
    grant execute on function public.claim_notification_deliveries(integer) to service_role;`);
  await db.exec(await source('20260916002300_notification_inbox'));
  await db.exec(
    fn(await source('20260927000600_verified_event_reviews'), 'resolve_pickup_review_report'),
  );
  await db.exec(await source('20261006000100_admin_moderation_workspace'));
  await db.exec(await source('20261006000200_moderation_outcome_notifications'));
  await db.exec(await source('20261006000300_validated_business_submission'));
  // Exercise queued-row dispatch contracts only in this provider-free harness.
  // Hosted absence of this flag fails closed; no real dispatcher is installed here.
  await db.exec(
    `insert into public.platform_settings(key,value,description) values('moderation_push_enabled','{"enabled":true}','Synthetic transport-contract gate; no provider exists')`,
  );
  await db.exec("set parish.fixture_runtime = 'synthetic-memory-only'");
  await db.exec(
    await readFile(
      new URL('supabase/fixtures/admin-moderation.synthetic.sql', fixtureRoot),
      'utf8',
    ),
  );
  await seedNormalModerationFlows(db);
  if (options.adversarial === true)
    await db.exec(
      await readFile(
        new URL('supabase/fixtures/admin-moderation.adversarial.sql', fixtureRoot),
        'utf8',
      ),
    );
  return db;
}

async function seedNormalModerationFlows(db) {
  const bid = (i) => `b0000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
  const uuidFor = (prefix, i) => `${prefix}-0000-4000-8000-${String(i).padStart(12, '0')}`;
  async function decision(kind, id, action, reason) {
    const r = (
      await asUser(db, ADMIN_ID, 'select public.get_admin_moderation_record($1,$2) r', [kind, id])
    ).rows[0].r;
    await asUser(
      db,
      ADMIN_ID,
      'select public.admin_moderation_action($1,$2,$3,$4,$5,gen_random_uuid())',
      [kind, id, action, reason, r.revision],
    );
  }
  await decision(
    'business',
    bid(5),
    'approve',
    'Synthetic approval: the complete local market profile was checked.',
  );
  await decision(
    'business',
    bid(6),
    'request_info',
    'Synthetic information request: clarify weekend hours and resubmit.',
  );
  // The original provider-neutral methods validate order ownership/completion,
  // attendance, rating/text bounds, member self-reviews, and report ownership.
  const operations = fixtureOperations(db);
  for (const [i, rating, text] of [
    [
      1,
      2,
      'Synthetic: waited twenty minutes but the pastries were fresh. Staff explained the delay.',
    ],
    [
      2,
      5,
      'Synthetic: Guaranteed profit! Click here now https://one.example https://two.example https://three.example https://four.example',
    ],
    [
      3,
      1,
      'Synthetic: the pickup instructions exposed a fictional neighbor contact number, 555-0109.',
    ],
  ])
    await operations.submitPickupReview(uuidFor('f0000000', i), CUSTOMER_ID, { rating, text });
  await operations.submitVerifiedEventReview(uuidFor('e0000000', 1), CUSTOMER_ID, {
    rating: 4,
    text: 'Synthetic: a welcoming market with local ceramics. More shaded seating would help.',
  });
  await operations.submitVerifiedEventReview(
    uuidFor('e0000000', 1),
    'a0000000-0000-4000-8000-000000000004',
    { rating: 5, text: '' },
  );
  for (const [i, reason, details] of [
    [1, 'inaccurate', 'Synthetic allegation about an ordinary negative service experience.'],
    [2, 'spam', 'Synthetic unrelated promotional links.'],
    [3, 'private_information', 'Synthetic review exposes fictional personal contact details.'],
  ])
    await operations.reportPickupReview(OWNER_ID, {
      reviewId: uuidFor('f1000000', i),
      reason,
      details,
    });
  await operations.reportPickupReview(OWNER_ID, {
    reviewId: uuidFor('e2000000', 1),
    reason: 'other',
    details: 'Synthetic report asks the moderator to check context.',
  });
  await operations.reportPickupReview(CUSTOMER_ID, {
    reviewId: uuidFor('e2000000', 2),
    reason: 'other',
    details: 'Synthetic star-only review; text is optional.',
  });
  for (const [i, target, reason, details] of [
    [
      1,
      { type: 'business', businessId: bid(5), label: 'Synthetic market' },
      'incorrect_information',
      'Synthetic report: location pin appears on the wrong block.',
    ],
    [
      2,
      {
        type: 'event',
        businessId: bid(5),
        eventId: uuidFor('e0000000', 1),
        label: 'Synthetic event',
      },
      'incorrect_information',
      'Synthetic report: start time differs from the poster.',
    ],
    [
      3,
      {
        type: 'offering_item',
        businessId: bid(5),
        offeringItemId: uuidFor('d0000000', 2),
        label: 'Synthetic candle',
      },
      'incorrect_information',
      'Synthetic report: check the listed candle price.',
    ],
  ]) {
    const payload = createReportPayload(CUSTOMER_ID, target, reason, details);
    await asUser(
      db,
      CUSTOMER_ID,
      'insert into public.content_reports(id,reporter_id,target_type,business_id,event_id,offering_item_id,reason,details,status) values($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [
        uuidFor('c0000000', i),
        payload.reporter_id,
        payload.target_type,
        payload.business_id,
        payload.event_id,
        payload.offering_item_id,
        payload.reason,
        payload.details,
        payload.status,
      ],
    );
  }
  await decision(
    'content_report',
    uuidFor('c0000000', 2),
    'start_review',
    'Synthetic investigation: compare the event time with the owner.',
  );
  await decision(
    'content_report',
    uuidFor('c0000000', 3),
    'resolve',
    'Synthetic resolution: the owner confirmed the listed price was correct.',
  );
  await decision(
    'pickup_review',
    uuidFor('f2000000', 3),
    'hide',
    'Synthetic privacy outcome: fictional personal contact information was checked; review hidden pending clarification.',
  );
  await decision(
    'event_review',
    uuidFor('e3000000', 2),
    'dismiss',
    'Synthetic outcome: a star-only verified attendance review is valid and remains published.',
  );
  // Controlled clock normalization only, after normal creation/report/moderation.
  for (const [table, hours] of [
    ['content_reports', [48, 26, 120]],
    ['pickup_order_review_reports', [30, 23, 96]],
    ['verified_event_review_reports', [18, 120]],
  ]) {
    const ids = (await db.query(`select id from public.${table} order by id`)).rows;
    for (let i = 0; i < ids.length; i++)
      await db.query(
        `update public.${table} set created_at=now()-make_interval(hours=>$1::int) where id=$2`,
        [hours[i], ids[i].id],
      );
  }
}

export function fixtureOperations(db) {
  class MemoryOperations extends PickupOperations {
    async rollout() {
      throw new Error('Provider operations unavailable in synthetic fixtures');
    }
    async reconcile() {
      throw new Error('Payment reconciliation unavailable in synthetic fixtures');
    }
  }
  return new MemoryOperations(fixtureSupabase(db));
}

export async function asUser(db, userId, query, params = []) {
  return db.transaction(async (tx) => {
    await tx.exec('set local role authenticated');
    await tx.query(
      "select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)",
      [userId ?? ''],
    );
    return tx.query(query, params);
  });
}
