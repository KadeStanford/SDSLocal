# Square and Stripe payment audit — 2026-09-28

## Assessment

**Historical audit snapshot:** this report records the findings before the follow-up
repairs and deployment. The current implementation, deployment versions, and
remaining acceptance work are tracked in
[payment staging release](../payment-systems-staging-release-2026-09-28.md).
The original statements below about local-only fixes and OPEN-01 through OPEN-05
describe the audited version, not the subsequently deployed staging version.

**Keep both providers in staging. Production readiness is blocked.** The normal
Sandbox flows have prior end-to-end evidence, but the exception paths below can
leave customer money, loyalty balances, or business queues inconsistent.

This audit reviewed Square pickup, Square appointment payments, Stripe pickup,
provider connections, authorization, webhooks, reservations, fulfillment,
refunds, recovery, maintenance, account deletion, and mobile payment handoffs.
It is a source and staging integration audit, not a guarantee that every defect
has been found. No production deployment or live transaction was performed.

**Deployment status:** the fixes described below are local workspace changes.
They have not been deployed by this audit. Current staging therefore still runs
the earlier implementation. No mobile source, native configuration, or OTA was
changed. No new payment was created during this audit.

## Evidence and verification

- **273 tests passed across 21 files**, covering shared commerce logic, the
  maintenance endpoint, and selected mobile payment/access/recovery helpers.
  This includes 50 new audit regressions across the payment and maintenance
  test files. Provider responses in these regressions are mocked.
- **Four transactional SQL suites passed against staging**:
  `ordering_provider_separation`, `square_appointments`,
  `pickup_confirmation_and_notifications`, and `square_commerce`.
  All fixtures and settings changes rolled back. These tests did not send email
  or execute provider transactions.
- Workspace typecheck completed **8/8 tasks**, all cache hits. These workspace
  tasks do **not** typecheck the Supabase Edge Functions.
- Formatting and `git diff --check` passed for the audit changes.
- Staging metadata inspection found **28 private commerce tables** with RLS
  enabled and no SELECT privilege for `anon` or `authenticated`.
- **13 inspected privileged financial RPCs** denied EXECUTE to both client
  roles. Inspection covered reservation, payment/refund application, leases,
  OAuth state consumption, reward redemption, and fulfillment transitions.
  This is the inspected set, not an assertion about every RPC in the project.
- Square's webhook inbox had no pending events at inspection. The minute
  maintenance job was active; recent cron records had no failures.
- Separately inspected actual scheduler HTTP responses: **120 responses in
  the recent two-hour window**, all HTTP 200, none timed out, all containing the
  payment maintenance result, with no reported provider reconciliation failures
  or `unavailable` results. This proves current fixture health, not outage or
  load resilience. The old endpoint can return HTTP 200 when a subtask fails.
- Stripe Dashboard showed the existing staging destination active for connected
  accounts with **three subscribed events**. The subscription was not changed.
  Browser attempts to open its edit controls did not navigate successfully.
- Earlier actual Square payment/refund evidence is in
  [appointment-staging-status](../appointment-staging-status.md); earlier Stripe
  payment, webhook, fulfillment, full refund, and reconnect evidence is in
  [stripe-staging-status](../stripe-staging-status.md). Those earlier successes
  do not validate the new patches or the failure scenarios in this report.

No credentials were written into this report or the patch. The existing
Supabase management token was used in memory for scoped staging inspection and
transactional SQL tests. No privileged server API key was retrieved this audit.

## Confirmed findings repaired locally

Severity: P1 means potentially incorrect financial behavior or an authorization
boundary failure; P2 means reliability, recovery, or operational correctness.

| ID     | Severity | Finding and local repair                                                                                                                                                                                                                                                                                | Regression evidence                                                                                                                                                                                                        |
| ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FIX-01 | P1       | Client provider hints or a changed business selection could route an existing order through the wrong rail. Routing now consults the saved order first, including checkout idempotency retries; lookup errors fail closed. Financial entry points also reject the other rail.                           | Saved-provider routing, override attempts, switches, idempotency, lookup failures, and wrong-provider operations.                                                                                                          |
| FIX-02 | P1       | Stripe's private ordering settings could be read without an active owner check. Both reads and writes now require active ownership.                                                                                                                                                                     | Anonymous, staff, and inactive membership denials before private settings access.                                                                                                                                          |
| FIX-03 | P1       | Square saved a payable checkout URL before verifying the canonical order's amount, currency, location, and reference. Publication now follows validation. Mismatch cleanup releases capacity only after confirmed cancellation with no tenders; otherwise the order remains in review.                  | Amount/location/reference mismatches and canonical retrieval failure never publish the URL.                                                                                                                                |
| FIX-04 | P1       | Square financial operations could use the business's current seller for a historical order. Checkout, reconciliation, and refunds now verify the saved merchant and return a safe original-seller recovery instruction.                                                                                 | Wrong-provider coverage and checkout/reconcile/refund replacement-seller regressions deny all provider calls. A switched-seller provider integration test is still required.                                               |
| FIX-05 | P1       | Failed refund retries retained the old refund ID; accepted-but-unsaved Square refunds could remain unresolved. Retries clear stale IDs before a new keyed request; reconciliation replays the original key; tracked pending refunds are retrieved instead of recreated.                                 | Timeout after state persistence, stable-key replay, obsolete refund events, and retrieval of external pending refunds.                                                                                                     |
| FIX-06 | P1       | Stripe reconciliation stopped after payment, missing subsequent Dashboard refunds/disputes. Canonical charge retrieval now detects full/partial/pending refunds and disputed payments. Additional handlers resolve refunds/disputes without requiring order metadata and validate the event's merchant. | Full/partial/pending refund, dispute, currency/amount/environment/binding checks, merchant mismatch, metadata fallback, replay without reversing fulfillment. **Live event subscriptions remain incomplete; see OPEN-04.** |
| FIX-07 | P1       | Partial Square pickup refunds were unsupported during reconciliation. They now enter review rather than being treated as a full refund. Both rails block another full refund after a detected partial refund and direct the owner to Dashboard.                                                         | Partial refund state and Dashboard recovery denial with no financial mutation. A complete partial-refund workflow remains open.                                                                                            |
| FIX-08 | P2       | Cached Stripe readiness could allow new checkout discovery after a provider restriction. Public availability now refreshes canonical readiness and fails closed on disabled charging/payouts or provider failure. Updates cannot overwrite a revoked/replaced account row.                              | Disabled provider readiness and canonical account identity checks. Provider outage and concurrent disconnect integration tests remain required.                                                                            |
| FIX-09 | P2       | Stripe raw provider error text could reach clients; onboarding callback errors could expose unexpected internal messages. Responses now use controlled messages. Callback redirects disable caching/referrers and reject duplicate parameters and non-GET requests.                                     | Provider body privacy regression; callback code review. Callback endpoint redirect tests remain required.                                                                                                                  |
| FIX-10 | P1       | An unexpired Stripe setup state could refer to a replaced/revoked account or a business removed from rollout. Callback use now rechecks active ownership, rollout, and current account identity.                                                                                                        | Stale account, revoked account, missing account, and active owner/rollout checks. **Removed owners were already rejected by the SQL state-consumption RPC; that was not a pre-existing vulnerability.**                    |
| FIX-11 | P2       | Square configuration failure prevented Stripe maintenance from starting; subtask failures were hidden behind HTTP 200. Provider tasks now initialize independently and return degraded HTTP 503 on a rejection or nonzero reconciliation failures.                                                      | Actual endpoint tests: missing Square configuration still runs Stripe; per-order failures return 503; invalid authorization runs neither provider.                                                                         |
| FIX-12 | P2       | Stripe rewards could reduce a USD checkout below the supported charge minimum after the reward had been spent. Quote and checkout now reject totals below 50 cents before reservation/redemption.                                                                                                       | One-cent quote and checkout regressions reject before quote persistence or reservation/redemption RPC; a provider boundary test is still required.                                                                         |
| FIX-13 | P2       | Checkout status could change while waiting for its lease. Hosted checkout now rechecks payable state and expiry inside the lease before creating a checkout. Stripe also initializes only the selected service, avoiding dependency on Square configuration for Stripe calls.                           | Changed-state regression; routing/service initialization source review.                                                                                                                                                    |

Primary implementation files:

- `_shared/commerce-routing.ts`, `square-runtime.ts`, `square-service.ts`,
  `square-domain.ts`
- `_shared/stripe-service.ts`, `stripe-order-state.ts`, `stripe-client.ts`
- `square-maintenance/index.ts`, `stripe-webhook/index.ts`,
  `stripe-oauth-callback/index.ts`
- `_shared/payment-audit.test.ts`, `square-maintenance/index.test.ts`

Stripe's canonical charge distinguishes full refunds, refunded amount, and
disputes. The new charge checks follow those separate fields.
[Stripe Charge object](https://docs.stripe.com/api/charges/object).

## Open production blockers

### OPEN-01 — P1: loyalty does not settle with the payment lifecycle

`20260920001400_checkout_rewards.sql:147` spends the reward during reservation.
The reviewed checkout expiry/failure/refund paths do not restore that redemption.
A customer can lose a reward on an unpaid abandoned order. Separately,
`20260920001300_pickup_confirmation.sql:60` records earned loyalty on fulfillment;
the reviewed refund paths do not reverse earned benefits after a refund.

Required: an idempotent loyalty reservation/settlement/reversal model shared by
both rails. Define the policy for partial refunds and fulfilled-order refunds,
then test abandoned checkout, declines, expiration, full/partial refund,
duplicate webhooks, concurrent retry, and a reward already spent elsewhere.
Changing one status handler alone would not safely repair the ledger.

### OPEN-02 — P1: late paid appointments have no in-app resolution

`20260927000400_square_sandbox_appointments.sql:931` puts a payment received after
its hold into `payment_review` / `review`. Owner cancellation accepts only
requested/confirmed/checked-in appointments and excludes payment review
(`:1020`). `appointment-operations.ts:957` refunds only a cancellation-pending
appointment with paid/refund-pending payment state. The paid review appointment
therefore cannot enter the normal cancel/refund flow. Its review hold also needs
an explicit resolution. Account deletion correctly blocks outstanding review,
so this unresolved state can block that workflow as well.

Required: an authorized owner/support review resolution that verifies provider
money, explicitly accepts or refunds the late payment, reconciles the hold,
records an audit event, and communicates the outcome to the customer. Test both
outcomes and resource conflicts with a replacement booking.

### OPEN-03 — P1: external Square appointment refunds can be acknowledged without application

`square-service.ts:1220` retrieves the canonical refund, payment, and order, but
returns successfully when no internal refund attempt/idempotency key matches.
An independently created Dashboard refund can therefore leave a paid appointment
unchanged even after the provider has returned the money. Appointment refund
application also requires a full amount, leaving partial refunds unsupported.

Required: a canonical external-refund path that records provider refund identity,
aggregates successful refunds, updates money separately from appointment
fulfillment, and has a review/resolution workflow. Test external full/partial
refunds before and after service, multiple partials, replay, and failed/pending
refunds. Square supports multiple partial refunds against a payment.
[Square refund retrieval](https://developer.squareup.com/docs/refunds-api/retrieve-refunds).

### OPEN-04 — P1: Stripe lifecycle handling is not fully connected to its event destination

The live staging destination has only three subscriptions. The new local handler
adds refund, dispute, account restriction, and deauthorization processing, but
those subscriptions have not been enabled or verified. Scheduled canonical
reconciliation helps recent orders; it does not provide timely coverage for all
historical orders or account lifecycle events.

Required: update the existing **Sandbox connected-account** destination to cover
the handler's supported checkout/payment/refund/dispute/account events; verify
signed deliveries from actual provider state changes. Review V2 account thin
events separately: the current handler expects V1-style `data.object`; it does
not implement a generic V2 thin-event resolver. Do not silently subscribe thin
events to that path. Stripe documents connected-account webhook routing and
account lifecycle events.
[Stripe Connect webhooks](https://docs.stripe.com/connect/webhooks).

### OPEN-05 — P1: disputed and partial payments lack a complete operational workflow

Square's reviewed event handler (`square-service.ts:1298`) does not process
dispute events. The Stripe patch can stop an order in payment review but does
not implement dispute outcome resolution. Both apps primarily offer full
refunds. Square pickup does not aggregate several partial refunds into a full
refund, and the order projection does not provide a complete refunded/remaining
amount ledger for receipts and business decisions.

Required: define fulfillment policy during a dispute, implement canonical
dispute outcome handling, and provide an audited review/resolution workflow.
Support partial amounts and aggregate refund totals, or explicitly constrain
the product to full refunds with a reliable Dashboard reconciliation/support
process. Test disputed-before-handoff, won/lost disputes, multiple partials,
and a remaining-balance refund. The current safe review state is containment,
not full use-case support.

### OPEN-06 — P2: maintenance needs outage and volume controls

Square processes bounded batches of webhook retries, orders, connections,
appointment payments, and appointment refunds sequentially within each task.
Stripe processes up to 50 orders, with provider calls having 20-second timeouts.
Neither task has a complete invocation-wide deadline/cursor/retry budget.
Repeated provider failures can exceed the scheduler response window, and
permanently failing oldest rows can repeatedly occupy a batch. Square's recent
completed-order polling window is one day; Stripe's new window is 30 days.
Older orders depend on complete webhook coverage.

Required: deadline-aware batches, fair progress despite poison rows, durable
retry/alerting, and load/outage tests. Stripe also needs an explicit durable
event recovery strategy; it currently relies on provider redelivery plus
order maintenance rather than Square's stored webhook inbox.

### OPEN-07 — P2: appointment queue truncates at 100 without pagination

`appointment-operations.ts:689` defaults to the previous 30 and next 90 days,
sorts by start time, and returns at most 100 appointments without a cursor.
A busy business can miss later bookings in its normal owner queue.

Required: cursor pagination and mobile loading behavior, with more than 100
bookings spanning past/upcoming ranges and equal timestamps.

## Connection and security checks still needing integration evidence

These are validation gaps or product-policy decisions, not demonstrated exploits:

- Stripe hosted setup refresh uses `account_update` after details submission.
  Verify the currently configured V2 account/dashboard combination, expired
  refresh links, requirements becoming due, and removed rollout/account changes.
  Pin/review the V1 API version and the existing V2 preview version before
  designing production configuration.
- Square seller replacement is now rejected safely in the local patch, but
  historical in-app refunds require the original seller connection. Decide
  whether historical connections are retained securely or owners receive an
  explicit Dashboard/support handoff after switching merchants.
- Validate concurrent disconnect/provider switching while quote, checkout,
  webhook reconciliation, and refund are in progress. SQL serialization and
  leases are useful protections, but mocked calls do not prove every race.
- Verify trusted proxy handling for the rate-limit IP identity and realistic
  guest abuse against quote/reservation/status routes. Do not assume arbitrary
  `x-forwarded-for` input has been normalized without a gateway test.
- Test customer deletion during an active paid pickup and restoration of access
  through a retained guest capability. The appointment deletion guard is
  explicit; active pickup rows retain their data while the customer foreign key
  can be cleared. Confirm the intended recovery and privacy policy.
- Test native SDK account switching with overlapping payment attempts. Stripe
  initialization is serialized, but the full PaymentSheet lifecycle is not
  serialized by that initialization queue. This is a concurrency test gap.
- Stripe currently prices tax as zero in its quote/order model. Establish the
  supported tax behavior and validate business-visible totals; zero tax is not
  evidence that the provider calculated tax. Scope remains US/USD card pickup
  and Square-supported appointment payments, not every currency/payment method.

## Use-case coverage and remaining acceptance work

| Use case                                        | Square pickup                                             | Square appointments                                  | Stripe pickup                                                |
| ----------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------ |
| Normal guest payment and canonical confirmation | Prior Sandbox evidence; local regressions                 | Prior Sandbox evidence                               | Prior Sandbox evidence; local regressions                    |
| Owner queue, progress, handoff/completion       | Prior Sandbox evidence + transactional SQL                | Prior evidence + transactional SQL; queue limit open | Prior Sandbox evidence + shared SQL                          |
| Pay in person                                   | Outside current pickup scope                              | Prior API evidence; phone acceptance pending         | Outside current pickup scope                                 |
| Full cancellation/refund                        | Prior provider evidence; local recovery fixes             | Prior provider evidence; late-payment review blocked | Prior provider evidence; local recovery fixes                |
| External Dashboard refund                       | Pickup canonical reconciliation; partial aggregation open | Confirmed unresolved gap                             | Local canonical handling; expanded signed deliveries pending |
| Partial refund / dispute                        | Incomplete                                                | Incomplete                                           | Safe local review containment; resolution incomplete         |
| Reward redemption and refund settlement         | Confirmed unresolved gap                                  | Not the pickup reward flow                           | Confirmed shared unresolved gap                              |
| Retry after provider success and lost response  | Keyed recovery reviewed/tested locally                    | Lease/RPC review; failure injection pending          | Keyed recovery reviewed/tested locally                       |
| Expiration / late payment / concurrent booking  | Unit/SQL evidence; provider race tests pending            | SQL normal states; paid late hold unresolved         | Unit/SQL evidence; provider race tests pending               |
| Disconnect/reconnect                            | Prior evidence; historical seller policy open             | Prior evidence                                       | Prior evidence; restriction/webhook coverage pending         |
| Native phone UX and accessibility               | Pending                                                   | Pending                                              | Pending                                                      |
| Load, outage, older historical events           | Pending                                                   | Pending                                              | Pending                                                      |

Physical-device testing was deferred by the user earlier. Still exercise issuer
declines, 3DS, PaymentSheet cancellation, checkout/browser cancellation, app
background/kill, return links, payment succeeded before local response loss,
offline recovery, account switching, and duplicate taps. Verify guest and
signed-in users, owner/staff permission differences, back gestures, narrow
screens, large text, dark/light appearance, customer status, business queue, and
refund messaging. A successful API payment cannot establish these UI outcomes.

## Release requirements

1. Resolve OPEN-01 through OPEN-05 with transactional state/ledger regressions
   and actual Sandbox provider lifecycle tests.
2. Complete queue pagination, fair maintenance recovery, and concurrent/outage
   tests. Confirm provider event subscriptions and signed delivery recovery.
3. Typecheck/bundle the changed Edge Functions and deploy a coherent version of
   all affected services/callbacks/webhooks/maintenance to **staging**. Re-run
   both normal and exception provider flows against that deployed version.
4. Complete physical-device acceptance and the explicitly supported
   country/currency/tax/refund/dispute policies.
5. Design a separately reviewed production configuration. Existing environment
   guards intentionally reject production; changing an enable flag alone is
   not the release process.

Do not interpret the successful fixture tests, earlier Preview OTA, or these
local fixes as production sign-off.
