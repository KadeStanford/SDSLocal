# Payment systems staging release — 2026-09-28

## Deployment

The earlier 13 audit fixes and the following payment lifecycle repairs are deployed
to Supabase staging `lgddhdexvwclfrnzjtly`. Production was not changed.
Expo Preview was published for iOS and Android at `2026-09-28T20:02:09Z`.
Readback verifies channel/branch/environment `preview`, runtime `0.1.0`, and the
existing Stripe test platform key. Source commit: `b3f47c3`.

- Update group: `bfd90bd0-5780-4076-aaeb-1895b14d67c9`.
- Android: `01a0e99c-4a70-7fc9-bbe6-9a63c94fdf41`.
- iOS: `01a0e99c-4a70-78a7-be4f-344c6f571d24`.
- [Expo release](https://expo.dev/accounts/kadestanford/projects/sds-local/updates/bfd90bd0-5780-4076-aaeb-1895b14d67c9).

| Function               | Deployed version |
| ---------------------- | ---------------- |
| square-commerce        | 44               |
| square-webhook         | 12               |
| square-oauth-callback  | 11               |
| stripe-webhook         | 9                |
| stripe-oauth-callback  | 12               |
| stripe-checkout-return | 6                |
| square-maintenance     | 15               |
| delete-account         | 11               |

Both migrations were applied in one transaction and recorded in migration history:
`20260928000100_payment_lifecycle_settlement` and
`20260928000200_stripe_webhook_recovery`. All eight functions read back ACTIVE.
Public/guest commerce and signed webhooks retain their application authorization
checks; delete-account retains gateway JWT verification.

## Repairs

1. **Loyalty settlement:** unpaid expired/failed checkouts and fully refunded orders
   restore redeemed rewards once. Earned points are reversed proportionally to
   settled refunds or lost disputes; visit rewards reverse when the whole payment
   is returned. Signed ledger adjustments preserve already-spent reward debt.
   A won dispute restores the earnings adjustment. Settlement is transactional,
   locks memberships, and is inaccessible to client roles.
2. **Late appointment payment:** payment after an expired or cancelled hold enters
   review. The active owner can verify canonical Square payment and choose
   cancellation/refund. No occupied or expired slot is automatically reassigned.
3. **External appointment refunds:** provider refund identities are recorded,
   successful amounts aggregated, pending/failure states reconciled, and settled
   refund replays cannot reverse money. External pending refunds are polled rather
   than creating a second request. Fulfilled service history survives full refunds.
4. **Stripe delivery coverage/recovery:** the existing enabled Sandbox Connect
   destination `we_1UI1lpLV9cSPw2jbKQYo30c4` now has 14 payment, refund, dispute,
   and account event subscriptions. The authenticated configuration call returned
   HTTP 200 with all 14 events. A private durable inbox stores only minimal event
   references, uses atomic leases, retries failures in maintenance, and expires
   processed entries after 30 days. Delayed deauthorization cannot revoke a newer
   recorded connection attempt.
5. **Partial refunds and disputes:** both pickup rails expose refunded/remaining
   money, support a bounded partial or remaining-balance refund, and keep fulfillment
   separately while money is under review. An owner explicitly acknowledges a
   verified partial refund before continuing fulfillment. Active/lost disputes block
   in-app refund actions; canonical won/resolved disputes restore the previous phase,
   and lost disputes become terminal. Appointment disputes use trusted money/hold
   updates. The app shows refund totals and owner review actions.

## Verification

- 175 backend tests passed across 16 files; provider responses are mocked.
- 55 targeted app tests passed across five files; app TypeScript checking passed.
- All eight affected Edge Function entrypoints passed Deno checking.
- New settlement and inbox regressions passed in a rolled-back staging transaction
  before deployment: both payment rails, points/visits, expiration, partial/full
  refunds, won/lost disputes, late cancelled payment, active owner authorization,
  external aggregate refunds, monotonic replay, hold release, exclusive event claims,
  and client-denied settlement/inbox privileges. Fixtures sent no email or payments.
- Readback confirmed both migrations and all eight ACTIVE functions.
- All five SQL suites passed again against the deployed schema, with fixture
  transactions rolled back: payment_lifecycle_settlement,
  ordering_provider_separation, square_appointments,
  pickup_confirmation_and_notifications, and square_commerce.
- Deployed smoke checks: Stripe availability HTTP 200/open, Square public
  appointment discovery HTTP 200/two services, anonymous private Stripe settings
  and Square appointment owner setup HTTP 401, unsigned Square/Stripe webhooks
  HTTP 401, and unauthenticated maintenance HTTP 401. Both inboxes had zero pending
  events. The new inbox has RLS and denies both client roles SELECT.
- Actual deployed minute-scheduler HTTP responses returned 200, no timeouts, and
  zero Square/Stripe reconciliation failures. Current fixtures are terminal, so
  these responses do not prove outage behavior or volume resilience.
- Prior real Sandbox payment/fulfillment/full-refund evidence remains in
  [Square status](appointment-staging-status.md) and [Stripe status](stripe-staging-status.md).
  No new provider payment was created during this release validation.

## Remaining acceptance and configuration

- Square subscription currently has nine events. Adding dispute.created,
  dispute.state.updated, dispute.evidence.created, and dispute.evidence.deleted is
  awaiting UI completion; browser automation could open its details but not activate
  Edit. Existing Sandbox seller OAuth also needs reconnecting with DISPUTES_READ.
  This is a configuration requirement for Square dispute events, not a code deployment
  blocker. Do not claim Square dispute delivery has passed until both are verified.
- The existing Supabase management credential can deploy functions and run scoped
  SQL, but API-key retrieval is denied (`api_gateway_keys_read`). No server key was
  saved or newly retrieved. Authenticated owner/provider exception tests therefore
  remain required against the deployed version.
- Phone acceptance was deferred by the user. Verify cancellation/3DS, duplicate
  taps, app kill/background/return links, offline recovery, both themes, narrow
  screens, large text, guest versus signed-in access, and owner/staff differences.
- The audit's P2 maintenance volume/outage controls and appointment queue pagination
  remain follow-up work. Queue currently returns at most 100 appointments.
- These deployments establish a staging candidate, not production sign-off. Actual
  provider exception events, concurrency/outage tests, supported tax/currency policy,
  and a separately reviewed production configuration remain release requirements.
