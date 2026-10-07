import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { PGlite } from '../../apps/web/node_modules/@electric-sql/pglite/dist/index.js';
import {
  createFixtureDatabase,
  fixtureOperations,
  asUser,
  ADMIN_ID,
  OWNER_ID,
  CUSTOMER_ID,
} from './fixture-runtime.mjs';
import {
  recommend,
  DEFAULT_RULES,
  normalizeRules,
  decisionGuidance,
} from '../../apps/web/src/lib/admin/moderation-rules.ts';
import { availableDecisions } from '../../apps/web/src/lib/admin/moderation-types.ts';
import { demoConfigured } from '../../apps/web/src/lib/admin/demo-guard.ts';
import { canSubmitBusinessForReview } from '../../packages/business-logic/src/index.ts';
import { moderationPushCopy } from '../../supabase/functions/_shared/moderation-push.ts';
import { hash } from '../../supabase/functions/_shared/square-security.ts';
import { createReportPayload } from '../../apps/mobile/src/lib/customer-safety-core.ts';

const results = [];
const db = await createFixtureDatabase(PGlite, undefined, { adversarial: true });
async function test(name, body) {
  try {
    await body();
    results.push({ name, passed: true });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, passed: false, error: error.message, code: error.code });
    console.error(`FAIL ${name}: ${error.message}`);
  }
}
async function denied(user, query, params = [], code = '42501') {
  await assert.rejects(asUser(db, user, query, params), (error) => error.code === code);
}
async function snapshot(kind = null, state = 'all', search = '', offset = 0) {
  return (
    await asUser(db, ADMIN_ID, 'select public.get_admin_moderation_snapshot($1,$2,$3,$4) data', [
      kind,
      state,
      search,
      offset,
    ])
  ).rows[0].data;
}
async function record(kind, id) {
  return (
    await asUser(db, ADMIN_ID, 'select public.get_admin_moderation_record($1,$2) data', [kind, id])
  ).rows[0].data;
}
function decide(
  r,
  action,
  reason = 'Synthetic manual decision after examining the evidence.',
  requestId = randomUUID(),
) {
  return asUser(db, ADMIN_ID, 'select public.admin_moderation_action($1,$2,$3,$4,$5,$6) data', [
    r.kind,
    r.id,
    action,
    reason,
    r.revision,
    requestId,
  ]);
}
const b = (i) => `b0000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
const c = (i) => `c0000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
const p = (i) => `f2000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
const e = (i) => `e3000000-0000-4000-8000-${String(i).padStart(12, '0')}`;

await test('Moderation installs against the original and live staging business-status enum without invented values', async () => {
  const labels = (
    await db.query(
      "select enumlabel from pg_enum where enumtypid='public.business_status'::regtype order by enumsortorder",
    )
  ).rows.map((row) => row.enumlabel);
  assert.deepEqual(labels, ['draft', 'pending_review', 'active', 'suspended']);
  assert.equal((await snapshot()).total, 15);
});

await test('Synthetic fixtures cover all four queues and every content target', async () => {
  const data = await snapshot();
  assert.equal(data.total, 15);
  assert.equal(data.records.length, 15);
  assert.deepEqual(data.counts, {
    business: 5,
    content_report: 2,
    pickup_review: 2,
    event_review: 1,
  });
  assert.deepEqual(data.operations, { service_requests: 2, order_requests: 1, appointments: 2 });
  assert.deepEqual(
    new Set(
      data.records.filter((r) => r.kind === 'content_report').map((r) => r.context.target_type),
    ),
    new Set(['business', 'event', 'offering_item']),
  );
});
await test('Unauthenticated, merchant and customer cannot list, inspect or decide', async () => {
  for (const user of [null, OWNER_ID, CUSTOMER_ID]) {
    await denied(user, 'select public.get_admin_moderation_snapshot()');
    await denied(user, 'select public.get_admin_moderation_record($1,$2)', ['business', b(1)]);
    await denied(user, 'select public.admin_moderation_action($1,$2,$3,$4,$5,$6)', [
      'business',
      b(1),
      'approve',
      'Synthetic decision reason',
      '0'.repeat(32),
      randomUUID(),
    ]);
  }
});
await test('Revoked admins immediately lose read and decision access; clients cannot self-grant membership', async () => {
  const current = await record('business', b(1));
  const before = (await db.query('select count(*)::int count from public.platform_admin_audit_log'))
    .rows[0].count;
  await denied(OWNER_ID, 'insert into public.platform_admins(user_id) values($1)', [OWNER_ID]);
  const removed = (
    await db.query('delete from public.platform_admins where user_id=$1 returning created_at', [
      ADMIN_ID,
    ])
  ).rows[0];
  try {
    await denied(ADMIN_ID, 'select public.get_admin_moderation_snapshot()');
    await denied(ADMIN_ID, 'select public.get_admin_moderation_record($1,$2)', ['business', b(1)]);
    await assert.rejects(decide(current, 'approve'), (error) => error.code === '42501');
    await db.transaction(async (tx) => {
      await tx.query(
        "select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",
        [OWNER_ID, '{"role":"platform_admin","user_role":"admin"}'],
      );
      await tx.exec('set local role authenticated');
      assert.equal(
        (await tx.query('select public.is_platform_admin() allowed')).rows[0].allowed,
        false,
      );
    });
    assert.equal(
      (await db.query('select count(*)::int count from public.platform_admin_audit_log')).rows[0]
        .count,
      before,
    );
    assert.equal(
      (await db.query('select status from public.businesses where id=$1', [b(1)])).rows[0].status,
      current.status,
    );
  } finally {
    await db.query('insert into public.platform_admins(user_id,created_at) values($1,$2)', [
      ADMIN_ID,
      removed.created_at,
    ]);
  }
  assert.equal((await record('business', b(1))).revision, current.revision);
});
await test('Anonymous execution, private projection, legacy writes and audit tampering denied', async () => {
  await db.transaction(async (tx) => {
    await tx.exec('set local role anon');
    await assert.rejects(
      tx.query('select public.get_admin_moderation_snapshot()'),
      (error) => error.code === '42501',
    );
  });
  await denied(ADMIN_ID, 'select * from public.admin_moderation_records');
  await denied(ADMIN_ID, 'delete from public.platform_admin_audit_log');
  await denied(ADMIN_ID, 'select public.approve_business($1)', [b(1)]);
  await denied(ADMIN_ID, 'select public.reject_business($1,$2)', [b(1), 'Synthetic reason']);
  await denied(ADMIN_ID, 'select public.resolve_pickup_review_report($1,$2,$3)', [
    p(1),
    'remove',
    'Synthetic reason',
  ]);
});
await test('Owner cannot bypass moderation via direct business status update', async () => {
  await assert.rejects(
    asUser(
      db,
      OWNER_ID,
      "update public.businesses set status='active',approved_at=now() where id=$1",
      [b(1)],
    ),
  );
  assert.equal((await record('business', b(1))).status, 'pending_review');
});
await test('Search, literal wildcard search, pagination and empty states are correct', async () => {
  assert.equal((await snapshot(null, 'all', 'no-such-synthetic-business')).total, 0);
  assert.equal((await snapshot(null, 'all', '%')).total, 0);
  assert.equal((await snapshot('business', 'all', 'Bayou')).total, 1);
  assert.equal((await snapshot(null, 'all', '', 50)).records.length, 0);
  await denied(
    ADMIN_ID,
    'select public.get_admin_moderation_snapshot($1,$2,$3,$4)',
    ['invalid', 'all', '', 0],
    '22023',
  );
});
await test('Required reasons, readiness failures and unsupported destructive actions rejected', async () => {
  const r = await record('business', b(2));
  assert.equal(r.readiness.ready, false);
  await assert.rejects(decide(r, 'approve'), (error) => error.code === '22023');
  await assert.rejects(decide(r, 'reject', 'short'), (error) => error.code === '22023');
  await assert.rejects(decide(r, 'delete'), (error) => error.code === '22023');
  assert.equal((await record('business', b(2))).status, 'pending_review');
});
await test('Audit insertion failure rolls back the underlying decision', async () => {
  await db.exec(`create function public.synthetic_fail_audit() returns trigger language plpgsql as $$
    begin if new.details->>'reason'='Synthetic forced audit failure' then raise exception 'Synthetic audit unavailable'; end if; return new; end $$;
    create trigger synthetic_audit_failure before insert on public.platform_admin_audit_log for each row execute function public.synthetic_fail_audit();`);
  const r = await record('business', b(2));
  await assert.rejects(
    decide(r, 'reject', 'Synthetic forced audit failure'),
    (error) => error.code === 'P0001',
  );
  assert.equal((await record('business', b(2))).status, 'pending_review');
  await db.exec(
    'drop trigger synthetic_audit_failure on public.platform_admin_audit_log;drop function public.synthetic_fail_audit();',
  );
});
await test('Competing decisions reject stale state; retries are idempotent and audited once', async () => {
  const r = await record('business', b(1));
  const ids = [randomUUID(), randomUUID()];
  const attempts = await Promise.allSettled([
    decide(r, 'approve', undefined, ids[0]),
    decide(r, 'request_info', undefined, ids[1]),
  ]);
  assert.equal(attempts.filter((a) => a.status === 'fulfilled').length, 1);
  assert.equal(attempts.find((a) => a.status === 'rejected').reason.code, '40001');
  const success = attempts[0].status === 'fulfilled' ? 0 : 1;
  const action = success === 0 ? 'approve' : 'request_info';
  const replay = await decide(r, action, undefined, ids[success]);
  assert.equal(replay.rows[0].data.replayed, true);
  await assert.rejects(
    decide(r, action, 'Different synthetic reason', ids[success]),
    (error) => error.code === '22023',
  );
  const updated = await record('business', b(1));
  assert.equal(updated.history.length, 1);
  assert.equal(updated.history[0].details.before.status, 'pending_review');
  assert.equal(updated.history[0].actor, 'Synthetic moderator');
  assert.ok(updated.history[0].details.reason);
});
await test('Business approval is reversible; information requests remain owner-visible', async () => {
  const r = await record('business', b(1));
  await decide(r, 'reopen');
  const reopened = await record('business', b(1));
  assert.equal(reopened.status, 'pending_review');
  await decide(
    reopened,
    'request_info',
    'Synthetic request: please clarify the holiday opening hours.',
  );
  const returned = await record('business', b(1));
  assert.equal(returned.status, 'draft');
  assert.match(returned.resolution_note, /holiday/);
  await decide(returned, 'reopen');
  assert.equal((await record('business', b(1))).status, 'pending_review');
});
await test('Business rejected to editable draft and safely reopened', async () => {
  await decide(
    await record('business', b(2)),
    'reject',
    'Synthetic rejection: complete public contact and seven-day hours.',
  );
  const draft = await record('business', b(2));
  assert.equal(draft.status, 'draft');
  assert.ok(availableDecisions(draft).includes('reopen'));
  await decide(draft, 'reopen');
  assert.equal((await record('business', b(2))).status, 'pending_review');
});
await test('Content reports reviewing, resolve, dismiss and reopen preserve reported content', async () => {
  const r = await record('content_report', c(1));
  const content = r.text;
  await decide(r, 'start_review');
  assert.equal((await record('content_report', c(1))).status, 'reviewing');
  await assert.rejects(
    decide(await record('content_report', c(1)), 'start_review'),
    (error) => error.code === '22023',
  );
  await decide(await record('content_report', c(1)), 'resolve');
  await decide(await record('content_report', c(1)), 'reopen');
  await decide(await record('content_report', c(1)), 'dismiss');
  const updated = await record('content_report', c(1));
  assert.equal(updated.status, 'dismissed');
  assert.equal(updated.text, content);
  assert.equal(updated.history.length, 4);
});
await test('Pickup review hide/restore/dismiss/reopen are reversible and centrally audited', async () => {
  await decide(await record('pickup_review', p(2)), 'hide');
  const hidden = await record('pickup_review', p(2));
  assert.equal(hidden.content_status, 'hidden');
  assert.equal(hidden.status, 'resolved');
  await decide(hidden, 'restore');
  const restored = await record('pickup_review', p(2));
  assert.equal(restored.content_status, 'published');
  await decide(restored, 'reopen');
  await decide(await record('pickup_review', p(2)), 'dismiss');
  const done = await record('pickup_review', p(2));
  assert.equal(done.status, 'dismissed');
  assert.equal(done.content_status, 'published');
  assert.equal(done.history.length, 4);
});
await test('Event reviews use the same reversible manual moderation contract', async () => {
  await decide(await record('event_review', e(1)), 'hide');
  assert.equal((await record('event_review', e(1))).content_status, 'hidden');
  await decide(await record('event_review', e(1)), 'restore');
  assert.equal((await record('event_review', e(1))).content_status, 'published');
  assert.equal((await record('event_review', e(1))).history.length, 2);
});
await test('Signals detect missing data, structured duplicates, spam and activity with manual fallback', async () => {
  assert.ok(
    recommend(await record('business', b(2))).signals.some((s) => s.rule === 'missing_data'),
  );
  const duplicate = recommend(await record('business', b(3)));
  assert.ok(duplicate.signals.some((s) => s.rule === 'duplicate'));
  assert.ok(duplicate.signals.some((s) => s.rule === 'submission_burst'));
  assert.ok(
    recommend(await record('business', b(7))).signals.some((s) => s.rule === 'spam_pattern'),
  );
  const honest = await record('pickup_review', p(1));
  assert.equal(recommend(honest).signals.length, 0);
  const stars = await record('event_review', e(2));
  assert.equal(recommend(stars).signals.length, 0);
  assert.equal(recommend(stars).automaticAction, false);
  assert.equal(recommend(stars).recommendation, 'Review the recorded outcome');
  assert.equal(
    recommend(await record('business', b(7)), { ...DEFAULT_RULES, spam: false, bursts: false })
      .signals.length,
    0,
  );
  assert.deepEqual(normalizeRules({ maxLinks: NaN, burstThreshold: 0 }), {
    ...DEFAULT_RULES,
    burstThreshold: 2,
  });
});
await test('Recommendation evaluation is deterministic and makes no data or audit change', async () => {
  const r = await record('business', b(3));
  const before = (await db.query('select count(*) n from public.platform_admin_audit_log')).rows[0]
    .n;
  assert.deepEqual(recommend(r), recommend(r));
  assert.equal(
    (await db.query('select count(*) n from public.platform_admin_audit_log')).rows[0].n,
    before,
  );
  assert.equal((await record(r.kind, r.id)).revision, r.revision);
});
await test('Synthetic runtime fails closed for production/staging/hosted configurations', async () => {
  const names = [
    'NODE_ENV',
    'PARISH_ADMIN_DEMO',
    'NEXT_PUBLIC_APP_ENV',
    'NEXT_PUBLIC_STAGING_SUPABASE_URL',
    'SUPABASE_INTERNAL_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
  ];
  const saved = Object.fromEntries(names.map((n) => [n, process.env[n]]));
  try {
    names.forEach((n) => delete process.env[n]);
    process.env.NODE_ENV = 'development';
    process.env.PARISH_ADMIN_DEMO = '1';
    assert.equal(demoConfigured(), true);
    for (const [key, value] of [
      ['NODE_ENV', 'production'],
      ['NEXT_PUBLIC_APP_ENV', 'staging'],
      ['NEXT_PUBLIC_APP_ENV', 'production'],
      ['NEXT_PUBLIC_STAGING_SUPABASE_URL', 'https://example.supabase.co'],
      ['NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321'],
      ['SUPABASE_INTERNAL_URL', 'http://kong:8000'],
    ]) {
      const prior = process.env[key];
      process.env[key] = value;
      assert.equal(demoConfigured(), false);
      if (prior === undefined) delete process.env[key];
      else process.env[key] = prior;
    }
  } finally {
    for (const key of names) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
});
// Normal-flow scenarios run on the default ready-submission fixture, independently
// of the deliberately malformed legacy fixture used above.
const normal = await createFixtureDatabase(PGlite);
const normalRecord = async (kind, id) =>
  (
    await asUser(normal, ADMIN_ID, 'select public.get_admin_moderation_record($1,$2) data', [
      kind,
      id,
    ])
  ).rows[0].data;
const normalDecide = async (
  r,
  action,
  reason = 'Synthetic public outcome: checked the item and explained the next step.',
  requestId = randomUUID(),
  privateNote = null,
) =>
  (
    await asUser(
      normal,
      ADMIN_ID,
      'select public.admin_moderation_action($1,$2,$3,$4,$5,$6,$7) data',
      [r.kind, r.id, action, reason, r.revision, requestId, privateNote],
    )
  ).rows[0].data;
const outcome = async (user, id) =>
  (await asUser(normal, user, 'select public.get_my_moderation_outcome($1) data', [id])).rows[0]
    .data;
async function dispatcher(query, params = []) {
  return normal.transaction(async (tx) => {
    await tx.exec('set local role service_role');
    await tx.query("select set_config('request.jwt.claim.role','service_role',true)");
    return tx.query(query, params);
  });
}
await test('Default demo submissions are complete and use the validated submission RPC', async () => {
  const rows = (
    await asUser(
      normal,
      ADMIN_ID,
      "select public.get_admin_moderation_snapshot('business','open','',0) data",
    )
  ).rows[0].data.records;
  assert.equal(rows.length, 5);
  assert.ok(rows.every((r) => r.readiness.ready === true));
  assert.equal(
    (await normalRecord('business', b(2))).readiness.checks.filter((c) => c.complete !== true)
      .length,
    0,
  );
});
await test('Original review submission/report methods enforce eligibility, bounds and self-report protections', async () => {
  const operations = fixtureOperations(normal),
    order = 'f0000000-0000-4000-8000-000000000001',
    event = 'e0000000-0000-4000-8000-000000000001';
  await assert.rejects(
    operations.submitPickupReview(order, OWNER_ID, { rating: 3, text: 'Synthetic review' }),
    (error) => error.code === 'NOT_FOUND',
  );
  await normal.query("update public.square_orders set status='ready' where id=$1", [order]);
  try {
    await assert.rejects(
      operations.submitPickupReview(order, CUSTOMER_ID, { rating: 3, text: '' }),
      (error) => error.code === 'ORDER_NOT_COMPLETE',
    );
  } finally {
    await normal.query("update public.square_orders set status='completed' where id=$1", [order]);
  }
  for (const input of [
    { rating: 0, text: '' },
    { rating: 6, text: '' },
    { rating: 3, text: 'x'.repeat(1201) },
  ])
    await assert.rejects(
      operations.submitPickupReview(order, CUSTOMER_ID, input),
      (error) => error.code === 'INVALID_REVIEW',
    );
  await normal.query('update public.square_orders set customer_id=$1 where id=$2', [
    OWNER_ID,
    order,
  ]);
  try {
    await assert.rejects(
      operations.submitPickupReview(order, OWNER_ID, { rating: 3, text: '' }),
      (error) => error.code === 'BUSINESS_REVIEW_NOT_ALLOWED',
    );
  } finally {
    await normal.query('update public.square_orders set customer_id=$1 where id=$2', [
      CUSTOMER_ID,
      order,
    ]);
  }
  await assert.rejects(
    operations.submitVerifiedEventReview(event, null, { rating: 3, text: '' }),
    (error) => error.code === 'SIGN_IN',
  );
  await assert.rejects(
    operations.submitVerifiedEventReview(event, OWNER_ID, { rating: 3, text: '' }),
    (error) => error.code === 'EVENT_ATTENDANCE_REQUIRED',
  );
  await assert.rejects(
    operations.reportPickupReview(CUSTOMER_ID, {
      reviewId: 'f1000000-0000-4000-8000-000000000001',
      reason: 'spam',
    }),
    (error) => error.code === 'OWN_REVIEW',
  );
  await assert.rejects(
    operations.reportPickupReview(OWNER_ID, {
      reviewId: 'f1000000-0000-4000-8000-000000000001',
      reason: 'invented',
    }),
    (error) => error.code === 'INVALID_REPORT',
  );
  const repeated = await operations.submitPickupReview(order, CUSTOMER_ID, {
    rating: 4,
    text: 'Synthetic repeat',
  });
  assert.equal(repeated.review.rating, 2);
  assert.equal(
    (
      await normal.query('select count(*) n from public.pickup_order_reviews where order_id=$1', [
        order,
      ])
    ).rows[0].n,
    1,
  );
});
await test('Normal content report payload and RLS require a valid reason, caller identity and open status', async () => {
  const target = { type: 'business', businessId: b(5), label: 'Synthetic market' };
  assert.throws(
    () => createReportPayload(CUSTOMER_ID, target, 'invented', ''),
    /Choose a report reason/,
  );
  assert.throws(() => createReportPayload(CUSTOMER_ID, target, 'other', 'x'.repeat(2001)), /2,000/);
  const query =
    'insert into public.content_reports(reporter_id,target_type,business_id,reason,status) values($1,$2,$3,$4,$5)';
  await assert.rejects(
    asUser(normal, CUSTOMER_ID, query, [OWNER_ID, 'business', b(5), 'Synthetic report', 'open']),
    (error) => error.code === '42501',
  );
  await assert.rejects(
    asUser(normal, CUSTOMER_ID, query, [
      CUSTOMER_ID,
      'business',
      b(5),
      'Synthetic report',
      'resolved',
    ]),
    (error) => error.code === '42501',
  );
});
await test('Client submission gate fails closed for missing checks, non-owner, non-draft and repeat taps', async () => {
  const readiness = (await normalRecord('business', b(1))).readiness;
  const input = { isOwner: true, status: 'draft', saving: false, readiness };
  assert.equal(canSubmitBusinessForReview(input), true);
  for (const check of readiness.checks)
    assert.equal(
      canSubmitBusinessForReview({
        ...input,
        readiness: {
          ready: true,
          checks: readiness.checks.map((c) =>
            c.key === check.key ? { ...c, complete: false } : c,
          ),
        },
      }),
      false,
    );
  for (const change of [
    { isOwner: false },
    { status: 'pending_review' },
    { status: 'active' },
    { saving: true },
    { readiness: null },
    { readiness: { ready: false, checks: readiness.checks } },
  ])
    assert.equal(canSubmitBusinessForReview({ ...input, ...change }), false);
});
await test('Server submission rejects each missing requirement without changing the pending fixture', async () => {
  const mutations = [
    "update public.businesses set description='short' where id=$1",
    'delete from public.business_categories where business_id=$1',
    'update public.businesses set phone=null,email=null,website_url=null where id=$1',
    'update public.businesses set address_line_1=null where id=$1',
    'delete from public.business_hours where business_id=$1 and day_of_week=0',
    "delete from public.business_photos where business_id=$1 and role='logo'",
    "delete from public.business_photos where business_id=$1 and role='cover'",
  ];
  for (const mutation of mutations) {
    await assert.rejects(
      normal.transaction(async (tx) => {
        await tx.query(mutation, [b(1)]);
        await tx.exec('set local role authenticated');
        await tx.query(
          "select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)",
          [OWNER_ID],
        );
        await tx.query('select public.submit_business_for_review($1)', [b(1)]);
      }),
      (error) => error.code === '22023',
    );
    assert.equal((await normalRecord('business', b(1))).status, 'pending_review');
  }
});
await test('Direct owner submission is blocked; complete owner RPC submission succeeds once', async () => {
  await normal.query("update public.businesses set status='draft' where id=$1", [b(2)]);
  await assert.rejects(
    asUser(normal, OWNER_ID, "update public.businesses set status='pending_review' where id=$1", [
      b(2),
    ]),
    (error) => error.code === '42501',
  );
  await assert.rejects(
    asUser(normal, CUSTOMER_ID, 'select public.submit_business_for_review($1)', [b(2)]),
    (error) => error.code === '42501',
  );
  await asUser(normal, OWNER_ID, 'select public.submit_business_for_review($1)', [b(2)]);
  assert.equal((await normalRecord('business', b(2))).status, 'pending_review');
  await assert.rejects(
    asUser(normal, OWNER_ID, 'select public.submit_business_for_review($1)', [b(2)]),
    (error) => error.code === '22023',
  );
});
await test('Pending profile, category, hours and photo edits return the business to draft', async () => {
  for (const query of [
    "update public.businesses set description=description||' Updated synthetic detail.' where id=$1",
    'update public.business_categories set category_id=category_id where business_id=$1',
    "update public.business_hours set closes_at='18:00' where business_id=$1 and day_of_week=0",
    'update public.business_photos set role=role where business_id=$1',
  ]) {
    await asUser(normal, OWNER_ID, query, [b(2)]);
    assert.equal(
      (await asUser(normal, OWNER_ID, 'select status from public.businesses where id=$1', [b(2)]))
        .rows[0].status,
      'draft',
    );
    await asUser(normal, OWNER_ID, 'select public.submit_business_for_review($1)', [b(2)]);
  }
});
await test('Guidance explains evidence, conditional action, public effect, alternatives and reversal', async () => {
  const clean = recommend(await normalRecord('business', b(1)));
  assert.equal(clean.suggestedAction, 'approve');
  assert.match(clean.uncertainty.join(' '), /not identity verification/);
  const duplicate = recommend(await normalRecord('business', b(3)));
  assert.equal(duplicate.suggestedAction, 'request_info');
  assert.match(duplicate.nextStep, /separate branch/);
  const spam = recommend(await normalRecord('pickup_review', p(2)));
  assert.equal(spam.suggestedAction, 'hide');
  assert.match(spam.undo, /Restore/);
  assert.equal(spam.confidence.label, 'Limited evidence');
  const ordinary = recommend(await normalRecord('pickup_review', p(1)));
  assert.equal(ordinary.suggestedAction, 'dismiss');
  assert.equal(ordinary.signals.length, 0);
  assert.match(ordinary.uncertainty.join(' '), /do not disprove/);
  const report = recommend(await normalRecord('content_report', c(1)));
  assert.equal(report.suggestedAction, 'start_review');
  assert.match(report.change, /Content stays/);
  const privacy = recommend({
    ...(await normalRecord('pickup_review', p(1))),
    reason: 'private_information',
  });
  assert.equal(privacy.priority, 'prompt');
  assert.equal(privacy.suggestedAction, null);
  const missing = recommend(await record('business', b(2)), {
    ...DEFAULT_RULES,
    missingData: false,
  });
  assert.equal(missing.suggestedAction, 'request_info');
  assert.ok(missing.missingInformation.length);
  for (const guidance of [clean, duplicate, spam, ordinary, report, privacy]) {
    assert.equal(guidance.automaticAction, false);
    assert.ok(
      guidance.nextStep &&
        guidance.why.length &&
        guidance.uncertainty.length &&
        guidance.change &&
        guidance.undo,
    );
    const source =
      guidance === clean
        ? await normalRecord('business', b(1))
        : guidance === duplicate
          ? await normalRecord('business', b(3))
          : guidance === report
            ? await normalRecord('content_report', c(1))
            : await normalRecord('pickup_review', p(guidance === spam ? 2 : 1));
    assert.ok(guidance.alternatives.every((a) => availableDecisions(source).includes(a.action)));
  }
  assert.match(
    decisionGuidance({ ...(await normalRecord('business', b(1))), status: 'active' }, 'reopen')
      .change,
    /Withdraws/,
  );
});
let infoDelivery, infoRequest, infoRecord, reviewDelivery;
await test('Business outcome alerts target active owners, retain public feedback, and exclude private data', async () => {
  infoRecord = await normalRecord('business', b(1));
  infoRequest = randomUUID();
  const result = await normalDecide(
    infoRecord,
    'request_info',
    'Please clarify weekend hours and resubmit this synthetic business.',
    infoRequest,
    'PRIVATE CANARY: reporter name and internal suspicion must never leave the audit.',
  );
  assert.equal(result.notification_count, 1);
  const rows = (
    await normal.query('select * from public.notification_deliveries where dedupe_key=$1', [
      `moderation:${infoRequest}:${OWNER_ID}`,
    ])
  ).rows;
  assert.equal(rows.length, 1);
  infoDelivery = rows[0];
  assert.equal(infoDelivery.user_id, OWNER_ID);
  assert.ok(infoDelivery.inbox_available_at);
  const publicJson = JSON.stringify(infoDelivery);
  assert.ok(!publicJson.includes('PRIVATE CANARY'));
  assert.ok(!publicJson.includes('reporter'));
  assert.ok(!publicJson.includes(ADMIN_ID));
  assert.equal(
    infoDelivery.moderation_outcome.public_reason,
    'Please clarify weekend hours and resubmit this synthetic business.',
  );
  const detail = await outcome(OWNER_ID, infoDelivery.id);
  assert.equal(detail.quick_action.mutates, false);
  assert.equal(detail.quick_action.label, 'Edit business and resubmit');
  assert.equal(detail.quick_action.app_path, `/business?id=${b(1)}&section=review`);
  assert.equal(
    (await normalRecord('business', b(1))).history[0].details.private_note.startsWith(
      'PRIVATE CANARY',
    ),
    true,
  );
});
await test('Repeated decision and notification-helper retry cannot duplicate the outcome alert', async () => {
  const count = (await normal.query('select count(*) n from public.notification_deliveries'))
    .rows[0].n;
  const replay = await normalDecide(
    infoRecord,
    'request_info',
    infoDelivery.moderation_outcome.public_reason,
    infoRequest,
    'PRIVATE CANARY: reporter name and internal suspicion must never leave the audit.',
  );
  assert.equal(replay.replayed, true);
  assert.equal(
    (await normal.query('select count(*) n from public.notification_deliveries')).rows[0].n,
    count,
  );
  assert.equal(
    (
      await normal.query('select public.queue_moderation_outcomes($1) n', [
        infoDelivery.moderation_outcome.decision_sequence,
      ])
    ).rows[0].n,
    0,
  );
  await assert.rejects(
    asUser(normal, ADMIN_ID, 'select public.queue_moderation_outcomes($1)', [
      infoDelivery.moderation_outcome.decision_sequence,
    ]),
    (error) => error.code === '42501',
  );
});
await test('Inbox owners can mark read but cannot rewrite outcomes, delivery state or recipients', async () => {
  for (const assignment of [
    "title='Forged approval'",
    "status='sent'",
    "moderation_outcome='{}'::jsonb",
    'inbox_available_at=null',
    'user_id=gen_random_uuid()',
  ])
    await assert.rejects(
      asUser(
        normal,
        OWNER_ID,
        `update public.notification_deliveries set ${assignment} where id=$1`,
        [infoDelivery.id],
      ),
      (error) => error.code === '42501',
    );
  await asUser(
    normal,
    OWNER_ID,
    'update public.notification_deliveries set read_at=now() where id=$1',
    [infoDelivery.id],
  );
  assert.ok((await outcome(OWNER_ID, infoDelivery.id)).read_at);
  await asUser(
    normal,
    CUSTOMER_ID,
    'update public.notification_deliveries set dismissed_at=now() where id=$1',
    [infoDelivery.id],
  );
  assert.equal(
    (
      await normal.query('select dismissed_at from public.notification_deliveries where id=$1', [
        infoDelivery.id,
      ])
    ).rows[0].dismissed_at,
    null,
  );
});
await test('Wrong user, expired session and forged quick-action reads fail without mutations', async () => {
  await assert.rejects(outcome(CUSTOMER_ID, infoDelivery.id), (error) => error.code === 'P0002');
  await assert.rejects(outcome(null, infoDelivery.id), (error) => error.code === '42501');
  await assert.rejects(outcome(OWNER_ID, randomUUID()), (error) => error.code === 'P0002');
  const before = (await normal.query('select count(*) n from public.platform_admin_audit_log'))
    .rows[0].n;
  for (let i = 0; i < 3; i++)
    assert.equal((await outcome(OWNER_ID, infoDelivery.id)).current_state, 'draft');
  assert.equal(
    (await normal.query('select count(*) n from public.platform_admin_audit_log')).rows[0].n,
    before,
  );
});
await test('Reversal alerts supersede queued push and old quick actions use current item state', async () => {
  await normalDecide(await normalRecord('business', b(1)), 'reopen');
  await normalDecide(await normalRecord('business', b(1)), 'approve');
  const old = await outcome(OWNER_ID, infoDelivery.id);
  assert.equal(old.is_latest, false);
  assert.equal(old.current_state, 'active');
  assert.equal(old.quick_action.label, 'View business status');
  assert.equal(
    (
      await normal.query('select status from public.notification_deliveries where id=$1', [
        infoDelivery.id,
      ])
    ).rows[0].status,
    'skipped',
  );
  assert.equal(
    (
      await dispatcher('select public.moderation_notification_sendable($1) allowed', [
        infoDelivery.id,
      ])
    ).rows[0].allowed,
    false,
  );
});
await test('Review hide and restoration alert the review author, never the reporting merchant', async () => {
  const req = randomUUID();
  await normalDecide(
    await normalRecord('pickup_review', p(2)),
    'hide',
    'Unrelated promotion was checked; this synthetic review is temporarily hidden.',
    req,
  );
  reviewDelivery = (
    await normal.query('select * from public.notification_deliveries where dedupe_key=$1', [
      `moderation:${req}:${CUSTOMER_ID}`,
    ])
  ).rows[0];
  assert.ok(reviewDelivery);
  assert.equal(reviewDelivery.user_id, CUSTOMER_ID);
  assert.equal(
    reviewDelivery.moderation_outcome.resource_id,
    'f1000000-0000-4000-8000-000000000002',
  );
  assert.equal(
    (
      await normal.query(
        'select count(*) n from public.notification_deliveries where dedupe_key=$1',
        [`moderation:${req}:${OWNER_ID}`],
      )
    ).rows[0].n,
    0,
  );
  const detail = await outcome(CUSTOMER_ID, reviewDelivery.id);
  assert.equal(detail.current_state, 'hidden');
  assert.equal(detail.quick_action.app_path, '/order?orderId=f0000000-0000-4000-8000-000000000002');
  await normalDecide(await normalRecord('pickup_review', p(2)), 'restore');
  assert.equal((await outcome(CUSTOMER_ID, reviewDelivery.id)).current_state, 'published');
});
await test('Content and event-review outcomes target owners/authors and reveal no allegations', async () => {
  const reportReq = randomUUID();
  await normalDecide(
    await normalRecord('content_report', c(1)),
    'resolve',
    'The owner confirmed the listing location and the report has been checked.',
    reportReq,
  );
  const report = (
    await normal.query('select * from public.notification_deliveries where dedupe_key=$1', [
      `moderation:${reportReq}:${OWNER_ID}`,
    ])
  ).rows[0];
  assert.ok(report);
  assert.ok(!JSON.stringify(report.moderation_outcome).includes('wrong block'));
  assert.equal(report.moderation_outcome.resource_type, 'business');
  const eventReq = randomUUID();
  await normalDecide(
    await normalRecord('event_review', e(1)),
    'dismiss',
    'The attendance review was checked and remains published.',
    eventReq,
  );
  const event = (
    await normal.query('select * from public.notification_deliveries where dedupe_key=$1', [
      `moderation:${eventReq}:${CUSTOMER_ID}`,
    ])
  ).rows[0];
  assert.equal(
    (await outcome(CUSTOMER_ID, event.id)).quick_action.app_path,
    '/my-event-reviews?eventId=e0000000-0000-4000-8000-000000000001',
  );
});
await test('Notification write failure rolls back the decision and its audit', async () => {
  const r = await normalRecord('business', b(2)),
    count = (await normal.query('select count(*) n from public.platform_admin_audit_log')).rows[0]
      .n;
  await normal.exec(
    "create function public.fixture_reject_notification() returns trigger language plpgsql as $$ begin raise exception 'Synthetic outbox failure'; end $$; create trigger fixture_reject_notification before insert on public.notification_deliveries for each row execute function public.fixture_reject_notification();",
  );
  try {
    await assert.rejects(normalDecide(r, 'approve'), /Synthetic outbox failure/);
    assert.equal((await normalRecord(r.kind, r.id)).status, 'pending_review');
    assert.equal(
      (await normal.query('select count(*) n from public.platform_admin_audit_log')).rows[0].n,
      count,
    );
  } finally {
    await normal.exec(
      'drop trigger fixture_reject_notification on public.notification_deliveries; drop function public.fixture_reject_notification();',
    );
  }
});
await test('Disabled push preference still creates an immediately readable in-app outcome', async () => {
  await normal.query(
    "insert into public.notification_preferences(user_id,business_id,notification_type,is_enabled) values($1,$2,'operational',false)",
    [OWNER_ID, b(2)],
  );
  const req = randomUUID();
  await normalDecide(
    await normalRecord('business', b(2)),
    'reject',
    'Please correct the verified synthetic business detail and resubmit.',
    req,
  );
  const d = (
    await normal.query('select * from public.notification_deliveries where dedupe_key=$1', [
      `moderation:${req}:${OWNER_ID}`,
    ])
  ).rows[0];
  assert.equal(d.status, 'skipped');
  assert.ok(d.inbox_available_at);
  assert.equal((await outcome(OWNER_ID, d.id)).current_state, 'draft');
});
await test('Removed ownership blocks inbox access, dispatch and new outcomes atomically', async () => {
  await normal.query(
    'update public.business_members set is_active=false where business_id=$1 and user_id=$2',
    [b(1), OWNER_ID],
  );
  try {
    await assert.rejects(outcome(OWNER_ID, infoDelivery.id), (error) => error.code === 'P0002');
    assert.equal(
      (
        await asUser(
          normal,
          OWNER_ID,
          'select id from public.notification_deliveries where id=$1',
          [infoDelivery.id],
        )
      ).rows.length,
      0,
    );
    const r = await normalRecord('business', b(1));
    await assert.rejects(normalDecide(r, 'reopen'), (error) => error.code === 'P0002');
    assert.equal((await normalRecord('business', b(1))).status, 'active');
  } finally {
    await normal.query(
      'update public.business_members set is_active=true where business_id=$1 and user_id=$2',
      [b(1), OWNER_ID],
    );
  }
});
await test('Outbox claim/retry uses one durable row; fake transport contains no private or public reason', async () => {
  const req = randomUUID();
  await normalDecide(
    await normalRecord('event_review', e(1)),
    'reopen',
    'Synthetic public reason that must stay out of the lock-screen payload.',
    req,
  );
  const d = (
    await normal.query('select * from public.notification_deliveries where dedupe_key=$1', [
      `moderation:${req}:${CUSTOMER_ID}`,
    ])
  ).rows[0];
  const claimed = (await dispatcher('select * from public.claim_notification_deliveries(100)'))
    .rows;
  assert.ok(claimed.some((row) => row.id === d.id));
  assert.equal(
    (
      await normal.query('select attempt_count from public.notification_deliveries where id=$1', [
        d.id,
      ])
    ).rows[0].attempt_count,
    1,
  );
  await normal.query(
    "update public.notification_deliveries set status='queued',next_attempt_at=now(),last_error='Synthetic transient transport failure' where id=$1",
    [d.id],
  );
  const retry = (
    await dispatcher('select * from public.claim_notification_deliveries(100)')
  ).rows.find((row) => row.id === d.id);
  assert.equal(retry.attempt_count, 2);
  assert.equal(
    (await dispatcher('select public.moderation_notification_sendable($1) allowed', [d.id])).rows[0]
      .allowed,
    true,
  );
  const fakeTransport = [];
  fakeTransport.push(moderationPushCopy(retry));
  assert.equal(fakeTransport.length, 1);
  assert.equal(fakeTransport[0].url, `/notification?deliveryId=${d.id}`);
  assert.ok(!JSON.stringify(fakeTransport).includes('Synthetic public reason'));
  await normal.query(
    "update public.notification_deliveries set status='skipped',last_error='Synthetic no device token' where id=$1",
    [d.id],
  );
  assert.equal((await outcome(CUSTOMER_ID, d.id)).quick_action.mutates, false);
  await assert.rejects(
    asUser(normal, CUSTOMER_ID, 'select public.moderation_notification_sendable($1)', [d.id]),
    (error) => error.code === '42501',
  );
});
await test('Missing owned review makes historical outcome unavailable without item disclosure', async () => {
  await normal.query('delete from public.pickup_order_reviews where id=$1', [
    reviewDelivery.moderation_outcome.resource_id,
  ]);
  await assert.rejects(outcome(CUSTOMER_ID, reviewDelivery.id), (error) => error.code === 'P0002');
});
await test('Guest proof allows a normal pickup review; moderation is reversible and records no-account notification', async () => {
  const operations = fixtureOperations(normal),
    order = 'f0000000-0000-4000-8000-000000000004',
    proof = 'a'.repeat(64);
  await normal.query(
    "insert into public.square_orders(id,business_id,customer_id,status,completed_at,guest_hash) values($1,$2,null,'completed',now(),$3)",
    [order, b(5), await hash(proof)],
  );
  await assert.rejects(
    operations.submitPickupReview(order, null, {
      statusToken: 'b'.repeat(64),
      rating: 2,
      text: 'Synthetic guest review',
    }),
    (error) => error.code === 'NOT_FOUND',
  );
  const review = (
    await operations.submitPickupReview(order, null, {
      statusToken: proof,
      rating: 2,
      text: 'Synthetic: fictional unrelated promotion.',
    })
  ).review;
  await operations.reportPickupReview(OWNER_ID, {
    reviewId: review.id,
    reason: 'spam',
    details: 'Synthetic guest review requires manual context check.',
  });
  const id = 'f2000000-0000-4000-8000-000000000004',
    r = await normalRecord('pickup_review', id),
    requestId = randomUUID();
  const result = await normalDecide(
    r,
    'hide',
    'Synthetic unrelated promotion was checked; this guest review is hidden.',
    requestId,
  );
  assert.equal(result.notification_count, 0);
  assert.equal(result.notification_state, 'no_account');
  assert.equal(result.record.content_status, 'hidden');
  assert.equal(
    (
      await normal.query(
        'select count(*) n from public.notification_deliveries where dedupe_key like $1',
        [`moderation:${requestId}:%`],
      )
    ).rows[0].n,
    0,
  );
  assert.equal(
    (await normalRecord('pickup_review', id)).history[0].details.notification_state,
    'no_account',
  );
  const replay = await normalDecide(
    r,
    'hide',
    'Synthetic unrelated promotion was checked; this guest review is hidden.',
    requestId,
  );
  assert.equal(replay.replayed, true);
  assert.equal(replay.notification_state, 'no_account');
  assert.equal(
    (await normalDecide(await normalRecord('pickup_review', id), 'restore')).record.content_status,
    'published',
  );
});
await test('Event review with a removed author can still be moderated without inventing a recipient', async () => {
  await normal.query('update public.verified_event_reviews set customer_id=null where id=$1', [
    'e2000000-0000-4000-8000-000000000001',
  ]);
  const r = await normalRecord('event_review', e(1));
  const result = await normalDecide(r, 'hide');
  assert.equal(result.notification_count, 0);
  assert.equal(result.notification_state, 'no_account');
  assert.equal(
    (await normalDecide(await normalRecord('event_review', e(1)), 'restore')).record.content_status,
    'published',
  );
});
await test('Absent push activation gate preserves inbox while keeping the legacy dispatcher from claiming outcomes', async () => {
  await normal.query("delete from public.platform_settings where key='moderation_push_enabled'");
  const r = await normalRecord('business', b(2)),
    req = randomUUID();
  await normalDecide(
    r,
    'reopen',
    'Synthetic current information request was reopened for review.',
    req,
  );
  const d = (
    await normal.query('select * from public.notification_deliveries where dedupe_key=$1', [
      `moderation:${req}:${OWNER_ID}`,
    ])
  ).rows[0];
  assert.equal(d.status, 'skipped');
  assert.match(d.last_error, /push disabled/);
  assert.ok((await outcome(OWNER_ID, d.id)).quick_action);
  assert.equal(
    (await dispatcher('select public.moderation_notification_sendable($1) allowed', [d.id])).rows[0]
      .allowed,
    false,
  );
  assert.ok(
    !(await dispatcher('select * from public.claim_notification_deliveries(100)')).rows.some(
      (row) => row.id === d.id,
    ),
  );
});
await test('Anonymized or scrubbed audit history cannot be mistaken for an identical actor retry', async () => {
  const saved = (
    await normal.query(
      'select * from public.platform_admin_audit_log where actor_id=$1 and request_id is not null order by id desc limit 1',
      [ADMIN_ID],
    )
  ).rows[0];
  const payload = [
    saved.target_type,
    saved.target_id,
    saved.action.replace('moderation_', ''),
    saved.details.reason,
    saved.details.expected_revision,
    saved.request_id,
    saved.details.private_note ?? null,
  ];
  const sql = 'select public.admin_moderation_action($1,$2,$3,$4,$5,$6,$7) data';
  const count = (await normal.query('select count(*)::int n from public.platform_admin_audit_log'))
    .rows[0].n;
  // Only simulate the future deletion migration's nullable attribution here;
  // this is not a test of its deletion/PII scrub implementation.
  await normal.exec(
    'alter table public.platform_admin_audit_log alter column actor_id drop not null',
  );
  try {
    await normal.query('update public.platform_admin_audit_log set actor_id=null where id=$1', [
      saved.id,
    ]);
    await assert.rejects(asUser(normal, ADMIN_ID, sql, payload), (error) => error.code === '22023');
    await normal.query(
      'update public.platform_admin_audit_log set actor_id=$1,details=$2::jsonb where id=$3',
      [ADMIN_ID, JSON.stringify({ ...saved.details, reason: null }), saved.id],
    );
    await assert.rejects(asUser(normal, ADMIN_ID, sql, payload), (error) => error.code === '22023');
    await normal.query('update public.platform_admin_audit_log set details=$1::jsonb where id=$2', [
      JSON.stringify({ ...saved.details, expected_revision: null }),
      saved.id,
    ]);
    await assert.rejects(asUser(normal, ADMIN_ID, sql, payload), (error) => error.code === '22023');
    assert.equal(
      (await normal.query('select count(*)::int n from public.platform_admin_audit_log')).rows[0].n,
      count,
    );
  } finally {
    await normal.query(
      'update public.platform_admin_audit_log set actor_id=$1,details=$2::jsonb where id=$3',
      [saved.actor_id, JSON.stringify(saved.details), saved.id],
    );
    await normal.exec(
      'alter table public.platform_admin_audit_log alter column actor_id set not null',
    );
  }
  assert.equal((await asUser(normal, ADMIN_ID, sql, payload)).rows[0].data.replayed, true);
});
await test('Privacy-redacted history cannot replay a substituted marker as a complete decision result', async () => {
  const saved = (
    await normal.query(
      'select * from public.platform_admin_audit_log where actor_id=$1 and request_id is not null order by id desc limit 1',
      [ADMIN_ID],
    )
  ).rows[0];
  const beforeCounts = (
    await normal.query(`select
    (select count(*)::int from public.platform_admin_audit_log) audits,
    (select count(*)::int from public.notification_deliveries) deliveries`)
  ).rows[0];
  const marker = '[Removed for account privacy]';
  try {
    // Simulate the allowed reduced historical shape, keeping a surviving actor
    // and the same technical key. No deletion implementation is loaded here.
    await normal.query('update public.platform_admin_audit_log set details=$1::jsonb where id=$2', [
      JSON.stringify({
        reason: marker,
        private_note: null,
        expected_revision: saved.details.expected_revision,
        notification_state: saved.details.notification_state,
        privacy_redacted: true,
        before: {
          kind: saved.target_type,
          id: saved.target_id,
          status: 'pending_review',
          context: {},
        },
        after: { kind: saved.target_type, id: saved.target_id, status: 'active', context: {} },
      }),
      saved.id,
    ]);
    await assert.rejects(
      asUser(normal, ADMIN_ID, 'select public.admin_moderation_action($1,$2,$3,$4,$5,$6,$7)', [
        saved.target_type,
        saved.target_id,
        saved.action.replace('moderation_', ''),
        marker,
        saved.details.expected_revision,
        saved.request_id,
        null,
      ]),
      (error) => error.code === '22023' && /redacted for account privacy/.test(error.message),
    );
    assert.deepEqual(
      (
        await normal.query(`select
      (select count(*)::int from public.platform_admin_audit_log) audits,
      (select count(*)::int from public.notification_deliveries) deliveries`)
      ).rows[0],
      beforeCounts,
    );
  } finally {
    await normal.query('update public.platform_admin_audit_log set details=$1::jsonb where id=$2', [
      JSON.stringify(saved.details),
      saved.id,
    ]);
  }
});
await normal.close();
await db.close();
const report = {
  generated_at: new Date().toISOString(),
  scope: 'Isolated reduced PGlite schema contract; not staging/Supabase-stack readiness',
  concurrency_limit:
    'PGlite serializes its single backend; competing requests tested, real multi-session lock contention requires full PostgreSQL integration.',
  passed: results.filter((r) => r.passed).length,
  total: results.length,
  results,
};
const reportRoot = new URL('../../docs/admin-verification/', import.meta.url);
await mkdir(reportRoot, { recursive: true });
await writeFile(new URL('contract-tests.json', reportRoot), JSON.stringify(report, null, 2));
console.log(`${report.passed}/${report.total} checks passed.`);
if (report.passed !== report.total) process.exitCode = 1;
