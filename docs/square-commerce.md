# Square Sandbox pickup commerce

This phase implements pickup for USD Square Sandbox locations. Production payment
hosts are absent from the server transport and `APP_ENV=production` is rejected.
The pilot does not charge tips or platform fees, award loyalty points, or change
RevenueCat/listing subscriptions. There are no native dependencies or native
configuration changes. Staff retain their existing limited scanner role; only
active owners can configure ordering, read its queue, progress orders, or refund.

## Current readiness

On September 20, 2026, the coordinating setup task verified the Square migration,
four Square functions, changed `delete-account`, Sandbox credentials, and the
Vault-backed maintenance job on staging project `lgddhdexvwclfrnzjtly`.
`SQUARE_COMMERCE_ENABLED=true`; the database allowlist contains only
**Bayou & Bloom Cafe** (`11111111-1111-4111-8111-111111111111`). Do not expand it.
The maintenance bearer was rotated and synchronized with Vault; a direct run
returned `{retried:0,reconciled:0,failures:0}`. The unrelated listing-billing
migrations `20260920000100` through `20260920000500` were not applied.

The pilot is now connected to **Default Test Account**, has a selected Sandbox
location, four purchasable variations and 128 available pickup slots. Ordering
is enabled and open. Public capability, live open/closed/restored-open behavior,
private-table boundaries and excluded-business rejection were verified on staging.
The initial platform_settings read grant was fixed by migration 20260920000700;
the later availability STORAGE_ERROR was traced to the missing service-role read
grant on business_location_stops and fixed by migration 20260920000900. Details
and exact verification scope appear in the customer-flow section below.
No staging order, payment, refund or real charge was created in this pass.
This implementation task has not operated a physical device.

The latest Preview OTA was published September 20, 2026 with message
`Expose pickup ordering to customers`, EAS environment/channel/branch `preview`,
app environment `staging`, and runtime `0.1.0`:

- Group: `19e0d269-e704-4f20-8717-ac25c1344482`.
- iOS: `01a0c07e-651f-7854-aa18-ca040602e2de`.
- Android: `01a0c07e-651f-70aa-869c-cc3ac6f9de17`.

Both platform updates were verified on Preview. Their native fingerprints match
the preceding settings release (`42f5df06-8d4a-40df-a71e-214bf0941cc9`) and the
initial Square pickup release (`39a1b6f3-052f-4c26-9175-90cbad28f4d3`).

The published fingerprints differ from the previous branding update only because
the pre-existing `react-native-purchases` dependency now appears in native
autolinking. No Square dependency or native configuration changed. Both
RevenueCat public API keys are absent from Preview (including the local export
environment), so the billing provider returns before its dynamic native import.
Square remains usable on the known older iOS Preview binary
`ddcab566-7139-4840-8068-3f31925eb496` under that condition. Do not enable those keys
or test RevenueCat until a new native Preview build is installed. There is no
verified installed Android Preview binary; publication is not device validation.

The mobile CTA fails closed when
the backend, authorization, active location, synchronized menu, published stop,
ordering settings, or pickup capacity is unavailable.

## Trust boundaries and data

Migrations: `20260920000600_square_commerce.sql` and the narrowly scoped server
SELECT grant in `20260920000700_square_platform_settings_grant.sql`.
All `square_*` tables have RLS
enabled, no anonymous/authenticated policies, and explicit client privilege
revocations. Only the server's service-role client can read them. Every owner
operation verifies a Supabase user and active owner membership. The existing
two-argument owner SQL helper is deliberately not used for callback authorization
because it reads `auth.uid()` internally instead of its supplied user argument.

- `square_connections`: merchant/location identity, encrypted token envelopes,
  health and refresh leases. These rows never appear in client responses.
- `square_oauth_states`: hashed 256-bit state, owner/business/Sandbox binding,
  ten-minute expiry, and atomic single-use consumption. Membership is rechecked.
- `square_ordering_settings`: enabled/open switches, prep/notice, 15/30/60-minute
  slots, timezone, weekly windows, capacity, upcoming-stop setting, zero fee.
- `square_catalog`: location-specific Square IDs, versions and payloads, with an
  optional editorial offering mapping. Sync never writes `offering_items` or
  `offering_sections` and does not imply importing/replacing the SDS menu.
- `square_quotes`: private five-minute server quotes bound to a guest capability.
- `square_orders`, `square_order_items`, `square_order_events`: immutable purchase
  snapshots, amounts in integer cents, recipient/location/time snapshots,
  idempotency, provider IDs, operational status and audit history.
- `square_webhook_inbox`: only signature-verified events, deduplication,
  occurrence/receipt times, processing leases, safe failure codes and retries.
- `square_request_buckets`: bounded per-action request rates without raw IPs.

Customer reads require the authenticated purchasing user or the matching random
256-bit capability. Only its hash is stored in Postgres. Native clients store the
capability in existing SecureStore; the web adapter uses local storage. Order IDs
may appear in app links; tokens, contact details and provider credentials never
do. Local carts contain catalog IDs, selections and quantities, expire after four
hours, and are revalidated. Recipient/contact details stay in memory on the client.
The recent order can be reopened from the business page even when ordering closes.

## Functions and authentication

| Function                | Verification                                                                               | Responsibilities                                                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `square-commerce`       | Supabase `getUser` for owner operations; narrow guest capability for status                | OAuth start, owner status/settings, location, catalog sync, availability, quote, checkout, resume, queue, transitions, refunds, disconnect   |
| `square-oauth-callback` | Hashed, expiring, single-use owner-bound state                                             | Code exchange, merchant lookup, encrypted storage, safe app return; checkout return performs navigation only                                 |
| `square-webhook`        | HMAC-SHA256 over exact configured URL plus raw body, constant-time Web Crypto verification | Inbox/deduplication, current-provider reconciliation, revocation, catalog synchronization                                                    |
| `square-maintenance`    | Dedicated server bearer secret                                                             | Retry failed inbox entries, reconcile payments/refunds, revoke expired links, refresh tokens, prune transient data, anonymize settled orders |

JWT gateway verification is disabled only because these functions implement
their distinct verification boundaries themselves. Request sizes, pagination,
timeouts, retries and operation leases are bounded. Square calls use a fixed
Sandbox hostname. Sensitive provider errors are classified; they are never
returned or logged verbatim. The client receives explicit response whitelists.

## OAuth, keys and provider API

Pinned API version: **2026-09-16**. Requested scopes:
`MERCHANT_PROFILE_READ ITEMS_READ ORDERS_READ ORDERS_WRITE PAYMENTS_READ PAYMENTS_WRITE`.
There is no inventory, customer, employee, loyalty, appointment or additional
recipient scope. Sellers authorize through OAuth; personal access tokens are
not a supported integration path.

Tokens use AES-256-GCM, a random 96-bit nonce per envelope, and authenticated
business/environment/token-purpose context. The base64 32-byte key is held in
Edge Function secrets, separate from the database. Each envelope has a key
version. Refresh occurs within 24 hours of expiry or after six days, with a
database lease preventing concurrent refresh. Key-version changes also trigger
refresh/re-encryption. Revocation disables ordering and clears both ciphertexts.

To rotate, install a new `SQUARE_TOKEN_ENCRYPTION_KEY` and
`SQUARE_TOKEN_KEY_VERSION`; retain old keys temporarily in
`SQUARE_TOKEN_PREVIOUS_KEYS` as a JSON map of version to base64 key. Run
maintenance until all connected rows use the new version, then remove old keys.
Do not log keys or place them in SQL, client env files, source, screenshots, or
command-line arguments. Use the provider secret editor/private local env file.

## Catalog and checkout

### Pickup setup and saved settings

Activation requires authoritative owner status showing a connected seller, a
selected location in the current active-location list, a completed catalog sync,
and at least one purchasable variation. The status panel sits directly above the
activation switches. With zero variations, add a purchasable item in the connected
Square Sandbox seller's Dashboard, then return and tap **Sync Square catalog**.
Do not disconnect or replace the already-working seller connection to do this.

Timing, capacity, timezone, mobile-stop options and weekly windows remain editable
and saveable before catalog setup is complete, with both activation switches off.
Enabling requires setup and valid pickup windows; opening additionally requires
pickup ordering enabled. Turning an existing switch off is always permitted even
if setup becomes incomplete. Turning pickup ordering off visibly closes orders
in the draft. Stale impossible activation is rejected beside Save before any
request; the save request never silently changes activation selections.

Dirty state compares normalized editable values against the latest authoritative
saved baseline, with stable window ordering and sync metadata excluded. Reverting
an edit makes the form clean. Background status reads preserve dirty drafts;
queue refreshes do not update the editor. Validation and save feedback appear
beside **Save pickup settings**, with screen-reader announcements. A successful
write must be followed by matching authoritative settings before the baseline and
draft are updated together, dirty state clears, and **Pickup settings saved.** is
shown. A rejected or unconfirmed save retains edits and offers contextual retry.

### Purchasable catalog

The mirror supports fixed-price regular items, variations, standard modifier
groups and their selection limits, categories, images, taxes, and location
availability. Deleted/archived items, incompatible currencies, known sold-out
variations, weighted/variable-price items, text/nested/quantity modifiers and
unsupported product types are excluded with a sync count. Inventory counts are
not reserved; pickup-slot capacity is. Merchants must use Square availability
controls appropriately for this pilot.

Catalog pagination completes before an atomic mirror replacement. Manual sync
and `catalog.version.updated` update this separate mirror. Quote and checkout
re-read current Square objects; clients cannot send authoritative prices/taxes.
Square CalculateOrder supplies tax and total. A changed quote requires review
again. Order snapshots use catalog versions; the created payment link's actual
total is verified before returning its URL.

Pickup times are generated from UTC instants and formatted in the configured
timezone, including DST transitions. Pickup requires the greater of prep and
notice, lies within a weekly window and the next seven days, and for mobile
businesses lies within a published eligible stop. The exact pickup address/time
is shown before payment. One selected Square seller location receives these
orders, including orders assigned to mobile stops.

The database serializes reservations per business and counts pending checkouts.
The same idempotency key/capability/request returns the same logical order.
Conflicting requests fail. Leases serialize provider creation/refund/transition
operations. Checkout links are Square API single-use links, not reusable
Dashboard payment links. A browser return never marks an order paid.

An unpaid checkout expires after ten minutes, but capacity remains reserved
until maintenance confirms Square cancelled the unpaid link/order. A provider
timeout keeps the slot conservatively reserved. A late/incorrect payment goes
to review instead of silently fulfilling an oversold or mispriced order.

## Order and refund states

`checkout_pending → placed` requires current Square payment `COMPLETED`, matching
Square order, location, currency and amount. A failed payment attempt can still
be retried at the same single-use checkout until its expiration. Older events
cannot undo payment, fulfillment or refunds. Signed events are triggers to fetch
current provider truth rather than instructions to copy a potentially old status.

Owner workflow: `placed → accepted → preparing → ready → completed`, with
optimistic versions and a formal transition map. These are **SDS operational
states**. Do not promise that pressing them completes the corresponding Square
Dashboard fulfillment: hosted-checkout fulfillment support varies. The tool
links to Sandbox Order Manager and displays the Square order reference.

Owner cancellation is an explicitly confirmed full refund. Square confirmation
controls `refund_pending → refunded` or `refund_failed`. Retrying an ambiguous
pending request reuses its refund key; retrying a terminal failed refund uses a
new key. Partial external refunds or mismatched amounts need operator review in
Square; this phase does not implement partial refunds, disputes or chargebacks.
No loyalty points are issued by checkout initiation or this pilot.

## Account deletion and retention

`delete-account` revokes connected sole-owned businesses before deleting them.
Active orders/pending refunds block disconnect and business deletion. Shared
businesses retain the remaining owner's connection. Database triggers independently
guard deletion races. Disconnect closes ordering and preserves history; it does
not close the merchant's Square account or cancel an Apple/Google subscription.

Settled signed-in customer orders are anonymized on account deletion. Outstanding
pickup recipient information remains while needed for fulfillment/refund, then
maintenance removes recipient/provider-request details and guest access after
30 days. Sole-owned business deletion anonymizes retained orders immediately.
Transient expired quote/state records are deleted after a day. Financial order,
item and audit history is retained for the Sandbox pilot; there is no automatic
financial-history purge. A jurisdiction-specific production retention policy,
legal review and dispute process are production prerequisites.

## Exact staging configuration

Use only Supabase project **lgddhdexvwclfrnzjtly**, Square application
**SDS Local Staging**, and its **Sandbox** settings.

| Setting                  | Value / purpose                                                                                                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OAuth redirect           | `https://lgddhdexvwclfrnzjtly.supabase.co/functions/v1/square-oauth-callback`                                                                                                                     |
| Webhook notification URL | `https://lgddhdexvwclfrnzjtly.supabase.co/functions/v1/square-webhook`                                                                                                                            |
| Scheduled endpoint       | `https://lgddhdexvwclfrnzjtly.supabase.co/functions/v1/square-maintenance`                                                                                                                        |
| Checkout return          | OAuth callback URL with `?checkout=<internal-order-uuid>`; redirects to `sdslocal://order?orderId=<uuid>`                                                                                         |
| OAuth app return         | `sdslocal://business?id=<business-uuid>&section=ordering`                                                                                                                                         |
| API version              | `2026-09-16`                                                                                                                                                                                      |
| Webhook events           | `catalog.version.updated`, `oauth.authorization.revoked`, `order.created`, `order.updated`, `order.fulfillment.updated`, `payment.created`, `payment.updated`, `refund.created`, `refund.updated` |

Required server secrets (verify names without printing values):

- `APP_ENV=staging`, `SQUARE_ENVIRONMENT=sandbox`, `SQUARE_API_VERSION=2026-09-16`.
- `SQUARE_COMMERCE_ENABLED=false` until the isolated test-business activation step.
- `SQUARE_APPLICATION_ID`, `SQUARE_APPLICATION_SECRET` from the Sandbox app.
- `SQUARE_OAUTH_REDIRECT_URL`, `SQUARE_WEBHOOK_URL` exactly as above.
- `SQUARE_WEBHOOK_SIGNATURE_KEY` for that exact webhook subscription.
- `SQUARE_TOKEN_ENCRYPTION_KEY` (base64 AES-256 key), `SQUARE_TOKEN_KEY_VERSION`.
- `SQUARE_MAINTENANCE_SECRET` (independent high-entropy server bearer).
- Optional `SQUARE_TOKEN_PREVIOUS_KEYS` for rotation and `SQUARE_ALLOWED_ORIGIN`
  for the exact Expo web origin. Native requests need no CORS origin.
- Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to functions.

The setup task verified these credentials are installed and the isolated
test-business activation is complete. Do not replace credentials with examples
or request their values in chat. Keep all other businesses outside the pilot.

## Deployment boundary

The scoped credential works through the project Management API. Legacy CLI
project/link/list operations return misleading HTTP 403 responses; do not request
a broader credential or repeat linking attempts. The setup task used the scoped
API to apply the two Square migrations above and deploy the functions below.
For a future authorized deployment, inspect migration history through that
working project-scoped context first. CLI commands below are reference only:

```powershell
pnpm exec supabase migration list --project-ref lgddhdexvwclfrnzjtly
```

Do not blindly run the existing all-pending staging script: this dirty repository
also contains unrelated RevenueCat migrations. Reconcile migration history and
apply only the authorized pending migration(s). Never reset staging.

Deploy the four new functions and the changed deletion function:

```powershell
pnpm exec supabase functions deploy square-commerce --project-ref lgddhdexvwclfrnzjtly
pnpm exec supabase functions deploy square-oauth-callback --project-ref lgddhdexvwclfrnzjtly
pnpm exec supabase functions deploy square-webhook --project-ref lgddhdexvwclfrnzjtly
pnpm exec supabase functions deploy square-maintenance --project-ref lgddhdexvwclfrnzjtly
pnpm exec supabase functions deploy delete-account --project-ref lgddhdexvwclfrnzjtly
```

Store the existing maintenance bearer in Supabase Vault as
`square_maintenance_bearer` using its private Dashboard editor, then run
`supabase/ops/square-staging-maintenance.sql`. The job calls maintenance every
minute. Verify successful HTTP responses and zero unhandled failures before
activating a test business. Do not expose the bearer in a migration or cron text.

For the chosen approved business, explicitly set the database flag to
`{"enabled":true,"business_ids":["<test-business-uuid>"]}` and enable the staging
server flag. Complete the provider checklist below. Publish Preview only once
the backend and Sandbox checkout are genuinely usable and all tests pass:
branch/channel `preview`, EAS environment `preview`, app environment `staging`,
iOS and Android, existing runtime `0.1.0`, message
`Add Square Sandbox pickup ordering`. Record the actual group/platform IDs.

## Local verification

The suite uses isolated fixtures and does not need Square credentials:

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
git diff --check
pnpm exec supabase db reset --local
pnpm exec supabase db lint --local
pnpm --filter @sds/mobile test --root ../.. supabase/functions/_shared
Get-Content -Raw supabase/tests/square_commerce.sql | docker exec -i supabase_db_sds-local psql -U postgres -d postgres -v ON_ERROR_STOP=1
```

The broader local SQL suite needs confirmed local user/business fixtures; it
must never create fabricated hosted-email deliveries. The new SQL test owns and
rolls back its own Auth/database fixtures. Run `square-local-integration.ts` in
the official Deno container with a read-only `supabase` mount and a private env
file containing `LOCAL_SUPABASE_URL=http://host.docker.internal:54321` and the
local `LOCAL_SUPABASE_SERVICE_ROLE_KEY`. Restrict runtime network permission to
that host/port. The test refuses hosted URLs, injects a deterministic Square
transport, and cleans up its own rows. It covers real DB orchestration and
concurrent checkout/capacity; it is not evidence of an actual Square payment.

## Phone and provider checklist (not yet executed)

### Sandbox seller-session prerequisite

Square Sandbox cannot show its normal authorization page without a signed-in
Sandbox seller Dashboard session in the same browser. This is a Sandbox testing
limitation, not a preparation step for ordinary production sellers. Use a separate
non-default test seller with automatic application authorization disabled, as
described in [Square's OAuth walkthrough](https://developer.squareup.com/docs/oauth-api/walkthrough).

Ordering & Square now opens a preparation panel before requesting OAuth state:

1. Choose **Open Sandbox seller dashboard**. This opens the generic
   `https://developer.squareup.com/console/en/sandbox-test-accounts` page in the
   system browser. Sign in, open the non-default seller's Square Dashboard, and
   leave it open. Use the regular browser session, not private browsing.
2. Return to SDS Local and choose **Continue to Square authorization**. Only this
   action requests a fresh, short-lived authorization URL. OAuth opens in the same
   system browser through Expo Linking; checkout retains its separate in-app
   browser behavior. Cancel creates no OAuth state.
3. Return through the app link or switch back manually. The app refreshes owner
   connection state, reports connected/not-granted/incomplete/expired outcomes,
   and offers retry if the server or browser fails. A browser return alone never
   establishes a connection. Checks time out after 25 seconds rather than keeping
   an indefinite spinner; settings drafts remain protected.

At diagnosis on September 20, 2026, the setup task reported only the Default Test
Account existed. Two attempts to create **SDS Local Test Seller** in Square's own
Developer Console (USA, automatic app authorization disabled) failed with
“Something went wrong while trying to create the sandbox test account.” Square's
status page reported website/dashboard maintenance at that time. Provisioning
the required non-default seller was externally unavailable; this is not an SDS
connection-endpoint failure. Do not claim successful OAuth until provisioning
recovers and the actual seller authorization is observed. No credentials or
account-specific console launch links are included in the app.

### Device acceptance

For the settings-persistence fix, start with this focused check:

1. Force-close and reopen the installed Preview app to receive the update.
2. Open Ordering & Square. With the current empty catalog, confirm connected and
   selected-location status plus **no purchasable items** guidance. Both activation
   switches must remain off and cannot be turned on.
3. Change timing/capacity and a weekly window, then save while ordering is off.
   Confirm **Pickup settings saved.** beside Save. Leave and return: values must
   persist and there must be no discard prompt. Change and revert a value; leaving
   must also be clean. Invalid numbers/times must show feedback beside Save.
4. In the connected Sandbox seller Dashboard, add at least one purchasable item
   with a fixed-price USD variation available at the selected location. Return
   and tap **Sync Square catalog**; confirm a positive purchasable count.
5. With a valid weekly window, enable pickup ordering and Ordering open, save,
   leave, return, and verify persisted switches with no discard prompt. Test a
   failed save/offline retry separately: genuine edits must remain unsaved.

No new seller connection, order, charge or refund is needed for this settings test.

1. After an eligible OTA is actually published, reopen the installed Preview
   build and confirm receipt. The known iOS binary is listed above; verify an
   Android Preview installation separately before claiming Android coverage.
2. As owner, open Operations → Ordering & Square. Keep the existing working
   connection. Only for a separate disconnected test: confirm Connect first shows
   the Sandbox preparation panel; Cancel must not open authorization. Complete
   the seller-session prerequisite above, connect, return to the app, select a
   USD location, and synchronize its catalog. Also deny/cancel authorization,
   retry after expiry, and verify browser/opening/network failures are readable.
3. Configure windows/capacity; enable and open ordering. Verify connection health
   and the excluded-item summary. Confirm the editorial SDS menu is unchanged.
4. As a guest, see Order pickup; choose a variation and required modifiers,
   cart quantity, exact fixed/mobile pickup address/time, name and phone.
5. Review Square-calculated tax/total; double-tap checkout to test duplicate
   prevention. Use only Square's documented Sandbox test payment method.
6. Return to Confirming payment; observe server-confirmed Order placed and the
   signed payment webhook. Confirm the same order in Square Sandbox Dashboard.
7. In the owner queue, progress accepted/preparing/ready/completed. Refresh guest
   status. Verify staff cannot access financial or order-management operations.
8. On another test order, request a full refund; observe pending and eventual
   Square-confirmed refunded state. Replay the webhook and reject a bad signature.
9. Abandon checkout; verify maintenance cancels the Square link before freeing
   capacity. Test closing ordering, expired stops, and a full slot.
10. Settle orders and disconnect; ordering disappears and history remains.
    Check light/dark themes, long names, large text, narrow screens, back navigation,
    unsaved settings, browser dismissal, app resume, and offline retry.

## Monitoring, disable and production blockers

Monitor stale/unprocessed inbox entries, lease age/attempts, pending checkouts
past expiry, refund_pending/refund_failed/payment_review orders, connection errors,
last contact/sync time, and cron HTTP failures. Capacity remains reserved during
uncertain provider failures; investigate rather than deleting orders manually.

To disable new ordering, set `SQUARE_COMMERCE_ENABLED=false` and the database
rollout `enabled=false` (or close one business). Keep functions/secrets/maintenance
running so outstanding payments, refunds and expiry can reconcile. Do not drop
tables or revoke merchant access while financial operations remain unsettled.

Before production: independently provision production secrets and OAuth review,
implement an explicit approved production rollout, complete real-device Sandbox
acceptance and seller support procedures, settle tax/inventory/partial refund/
dispute requirements, approve retention/privacy wording and capacity abuse limits,
and determine Square fulfillment synchronization requirements. Any later platform
fee needs disclosure, provider scopes and separate approval. No production work
is activated by this phase.

For API upgrades, review the official changelog, update the code constant and
server version together, rerun fixtures/security/SQL/concurrency tests, then
repeat a real Sandbox order and refund before changing Preview.

Official references: [OAuth](https://developer.squareup.com/docs/oauth-api/overview),
[production OAuth requirements](https://developer.squareup.com/docs/oauth-api/movetoprod),
[Checkout](https://developer.squareup.com/docs/checkout-api),
[Orders](https://developer.squareup.com/docs/orders-api/what-it-does),
[application fees](https://developer.squareup.com/docs/payments-api/take-payments-and-collect-fees),
[webhook verification](https://developer.squareup.com/docs/webhooks/step3validate),
[checkout limitations](https://developer.squareup.com/docs/checkout-api/common-pitfalls),
[API changelog](https://developer.squareup.com/docs/changelog/connect).

## Verification record and changed files

Pickup settings-persistence follow-up, September 20, 2026:

- `pnpm --filter @sds/mobile test src/lib/square-pickup-settings.test.ts src/lib/square-browser.test.ts src/lib/square-commerce-core.test.ts`
  passed all 54 targeted tests. Twenty settings tests cover empty-catalog setup,
  active-location readiness, off-state timing saves, activation/open guards,
  specific validation, stable normalization, revert-to-clean behavior, retained
  drafts during refresh, acknowledged write plus authoritative read-back, safe
  contextual rejection, stale activation and inconsistent save responses.
- `pnpm validate` passed `pnpm format:check`, `pnpm lint`, `pnpm typecheck`,
  `pnpm test` (339 workspace tests including 307 mobile), and `pnpm build`.
  `git diff --check` and package/native/configuration SHA-256 baselines passed.
- Changed files: `apps/mobile/src/lib/square-pickup-settings.ts` and its test,
  `apps/mobile/src/components/square-ordering-panel.tsx`,
  `apps/mobile/src/components/commerce-fields.tsx`, and this runbook. Server
  validation and the connected seller/catalog were not modified. No hosted
  settings writes, catalog creation, orders, charges, refunds or device testing
  were performed by this implementation task.
- Read-back of Preview verified both platform IDs, the exact publication message,
  staging app environment, runtime `0.1.0`, and identical native fingerprints to
  the preceding release. Current update IDs are recorded above.

Sandbox connection-guidance follow-up, September 20, 2026:

- `pnpm --filter @sds/mobile test src/lib/square-browser.test.ts src/lib/square-commerce-core.test.ts`
  passed 34 targeted tests. Coverage includes trusted OAuth/checkout destinations,
  lookalikes/HTTP/credentials/malformed URLs, no state request before Continue,
  browser failure/retry, matching return links, server-confirmed notices and timeouts.
- `pnpm validate` passed every full gate: `pnpm format:check`, `pnpm lint`,
  `pnpm typecheck`, `pnpm test` (319 workspace tests, including 287 mobile), and
  `pnpm build`. `git diff --check` passed. Native/package/configuration baseline
  SHA-256 checks remain unchanged. No migrations, provider scopes, server code,
  native packages, permissions, production settings or RevenueCat changes were
  made for this guidance fix.
- Focused files: `apps/mobile/src/lib/square-browser.ts` and its test,
  `apps/mobile/src/lib/square-commerce.ts`,
  `apps/mobile/src/components/square-ordering-panel.tsx`, and this runbook.
- Real seller OAuth and physical-device testing remain unverified because the
  required non-default seller could not be provisioned in Square's console.
- Both published platform IDs, Preview channel/branch/environment, staging app
  environment, runtime `0.1.0`, exact message and unchanged native fingerprints
  were verified by reading the channel back after publication. See the current
  readiness section for the update IDs.

Local verification on September 20, 2026:

- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`,
  and `git diff --check` passed. The workspace suite contains 290 tests, including
  258 mobile tests; the separate Edge shared-module suite contains 41 tests
  (31 Square, 10 existing account-deletion/RevenueCat checks).
- `pnpm exec supabase db reset --local` applied every migration including the
  new commerce schema. All seven SQL suites passed: Square, secure loyalty,
  notifications, nearby alerts, media cleanup, onboarding and listing billing.
  The nearby-alert suite needed isolated follows because the demo seed already
  follows a mobile business; the test itself was unchanged.
- `pnpm exec supabase db lint --local` completed but reports pre-existing PostGIS
  extension lint findings. `pnpm exec supabase db lint --local --schema public`
  reports only two pre-existing unused-variable warnings in
  `public.process_loyalty_action`; no Square findings.
- Deno checked all four Square entrypoints, the changed delete-account entrypoint,
  and the local integration harness. The local database integration passed OAuth
  replay and token refresh, encrypted persistence, catalog/quote creation,
  simultaneous duplicate checkout, guest isolation, webhook replay, payment,
  fulfillment transitions, pending/completed full refund, competing last-slot
  reservations, expiration and disconnect with a simulated Square transport.
- Baseline SHA-256 checks confirm no task changes to root/mobile package files,
  the lockfile, mobile app config or EAS config. Exported client bundles contain
  no Square application-secret/encryption-key/token-blob fields.
- Staging deployment and isolated activation were verified by the coordinating
  setup task, as recorded above. All seven live probes passed: disconnected
  allowlisted availability, excluded-business rejection, anonymous owner access,
  bad webhook signature, maintenance without bearer, deletion without auth, and
  malformed OAuth callback. The follow-up grant was also applied locally;
  service-role access and the Square SQL regression suite passed.
- Actual Square payment/refund and physical-phone validation have not been
  performed. Production and the RevenueCat rollout were untouched.
- The published Preview channel was read back and verified against both update
  IDs, the exact message, app environment and runtime. EAS fingerprint comparison
  isolated the optional RevenueCat difference described above; all other sources
  match the preceding update. Both RevenueCat public API keys remain absent.

Task-attributable files:

- Mobile flow: `apps/mobile/src/app/order.tsx`;
  `src/components/square-ordering-panel.tsx`, `pickup-order-cta.tsx`,
  `commerce-fields.tsx`; `src/lib/square-commerce.ts`, `square-commerce-core.ts`,
  and its test. Integration edits: `business-workspace.tsx`,
  `public-business-page.tsx`, `app-tabs.tsx`, `business-workspace-config.ts`.
- Backend: the two Square migrations; `supabase/functions/_shared/square-security.ts`,
  `square-client.ts`, `square-domain.ts`, `square-service.ts`, `square-runtime.ts`,
  `square-commerce.test.ts`; four Square function entrypoints;
  `supabase/functions/delete-account/index.ts`; `supabase/config.toml`.
- Verification/operations: `supabase/tests/square_commerce.sql`,
  `supabase/tests/square-local-integration.ts`,
  `supabase/ops/square-staging-maintenance.sql`.
- Documentation/configuration: `.env.example`, `docs/square-commerce.md`,
  `docs/architecture.md`, `docs/environments.md`.

## Customer discovery and ordering journey — September 20, 2026

The customer flow now follows business → menu → item customization → cart →
pickup → contact → review → hosted Square Sandbox checkout → tracking/recovery.
The menu carries the business logo/name/accent, compact product rows and optional
images/descriptions. Modifiers and quantity are edited in a focused modal with a
live estimate. Cart lines can be edited or removed; a persistent bottom action
shows the item count and estimate. Pickup locations auto-select when there is
only one, and times are grouped by local date. Contact accepts common US phone
formats and normalizes to E.164 before the server validates it.

Cart IDs/options/estimates are stored separately for each business for four
hours, using the existing Expo SQLite storage on native and localStorage on web.
Switching businesses keeps both carts, so nothing needs to be discarded.
Malformed/expired storage is rejected and changed catalog items require repair.
Prices displayed in the cart are estimates; the server quote is authoritative.
Guest checkout credentials remain in SecureStore on native and are indexed by
business and order, so another business cannot overwrite pending recovery.
Network uncertainty retains the same idempotency key. Confirmed server rejection
plus an empty resume allows a fresh attempt. Returning from Square never marks
an order paid. Tracking polls the server with bounded backoff and on foreground;
manual refresh remains available. Another order is offered only in terminal
states. No customer card form, loyalty accrual, tips or platform fees were added.

### Capability and availability boundary

`get_pickup_capabilities(uuid[] default null)` is a batched, sparse public read
model returning only `{business_id, supports_pickup_ordering:true}`. Discover
makes one capability read for the list, never one live provider request per card.
The badge and Order ahead filter represent configured capability, independent
of opening hours, slots or transient Square failures. The public business page
uses live availability for Order pickup, closed/check-back, loading and Retry,
with saved order tracking taking priority. Guests are supported.

Migration `20260920000800_public_pickup_capabilities.sql` checks active status,
Sandbox pilot allowlist, connected selected location, synchronized purchasable
variations and enabled owner settings. It excludes a caller's blocked businesses.
It pins an empty search path, explicitly grants EXECUTE to anon/authenticated and
the service role, and grants no private table reads. The additional
`platform_settings.square_commerce.public_environment` must be development or
staging; missing/production values fail closed. Client discovery is likewise
restricted to development/staging. No merchant/location IDs, tokens, raw settings,
provider payloads or orders are returned by this projection.

### Staging STORAGE_ERROR diagnosis and verification

After deploying availability's `open | closed | unavailable` classification,
the live request failed with sanitized `STORAGE_ERROR`. A read-only privilege
probe confirmed that `service_role` lacked SELECT on
`public.business_location_stops`; every other required availability table and
rate-limit function privilege was present. Availability reads published stops
before slot generation even for fixed-location businesses. RLS bypass does not
supply a missing table privilege. Migration
`20260920000900_square_pickup_stops_service_grant.sql` adds only that SELECT grant;
client permissions and RLS remain unchanged. The rolled-back regression executes
the actual projected read as service_role and confirms private Square tables
remain inaccessible to anon/authenticated.

The coordinating setup task applied both migrations through the authenticated
staging Dashboard. Hosted history uses application-time versions with repository
basenames, rather than filename versions:

- `20260920190026` / `20260920000800_public_pickup_capabilities`.
- `20260920201226` / `20260920000900_square_pickup_stops_service_grant`.

The deployed `square-commerce` source includes the shared `square-service.ts`
availability classification. No other function needed an update for this pass.
A scoped CLI deployment received Functions API 403; the authenticated Dashboard
was used for the same scoped function deployment. No broader credential access
was requested.

Verified staging project `lgddhdexvwclfrnzjtly`, Bayou & Bloom Cafe only:

- Open availability/catalog: HTTP 200, available=true, status=open, 128 slots,
  four purchasable products.
- Temporarily closed: HTTP 200, available=false, status=closed; anonymous public
  capability still returned true.
- Restored is_open=true: live open response again, 128 slots/four products.
- Non-allowlisted business: HTTP 503, DISABLED.
- Six other active demo businesses had no public capability row.
- No order, payment, refund, charge or hosted email was created by these probes.

### Verification scope and phone checklist

Focused tests cover capability security/presentation, filter combinations,
cart customization/editing, native/web storage contracts, expiry/malformed data,
price/catalog changes, grouped pickup times, US phone normalization, checkout
recovery isolation and tracking states. Static renders exercise real components
at 375px in light/dark themes and 1.4x text; a long cart-action overflow found in
that check was fixed. Buttons measured at least 48px. These are limited web
layout checks, not native-device captures or physical-device testing. The new
stop-grant SQL regression passed on staging; local Docker became unavailable
after the interrupted session, so that additional SQL test was not rerun locally.
The earlier public capability SQL regression passed locally and on staging.

Physical Preview checklist (still required):

1. Restart Preview to receive the update; verify Bayou's Order ahead badge/filter
   and its Order pickup button while signed out and signed in.
2. Browse four Square products; add/edit quantities and available modifiers,
   remove an item, leave/reopen the business and verify the saved cart. Check
   narrow screen, larger text, dark mode, keyboard and back/swipe behavior.
3. Choose a pickup time; go back and confirm selections persist. Enter a normal
   US phone, review server tax/total, and verify expired quotes refresh cleanly.
4. Continue only to Square Sandbox using Sandbox test payment details. Cancel
   once, background/reopen, recover the same order, and verify repeated taps do
   not create another checkout. Real payment must never be attempted.
5. After an intentional Sandbox payment, confirm that only server verification
   advances tracking. Exercise owner accepted → preparing → ready → completed,
   then verify the customer can start a new order. Check network retry and a
   closed/no-slot state, restoring the pilot open afterward.

Production, RevenueCat rollout, packages, native configuration and runtime remain
unchanged. Publication does not claim physical iOS or Android verification.

Files for this customer-flow pass:

- Discovery: `apps/mobile/src/app/explore.tsx`,
  `src/components/business-card.tsx`, `src/components/pickup-order-cta.tsx`,
  `src/lib/discovery-core.ts`, `src/lib/pickup-discovery.ts` and its test.
- Ordering: `apps/mobile/src/app/order.tsx`, `src/hooks/use-pickup-order.ts`,
  `src/components/pickup/pickup-menu.tsx`, `pickup-item.tsx`,
  `pickup-checkout-steps.tsx`, `pickup-status.tsx`, `pickup-render.test.tsx`,
  and the optional accessibility label in `src/components/app-button.tsx`.
- Recovery/persistence: `src/lib/square-commerce.ts`, `square-commerce-core.ts`,
  `pickup-order-flow.ts` and its test, `pickup-cart-core.ts`,
  `pickup-cart-storage.ts`, `pickup-cart-storage.native.ts`,
  `pickup-order-access.test.ts`.
- Server/security: `supabase/functions/_shared/square-service.ts`,
  `square-commerce.test.ts`, migrations `20260920000800` / `20260920000900`,
  `supabase/tests/public_pickup_capabilities.sql`,
  `supabase/tests/square_pickup_stops_service_grant.sql`, and this runbook.

Live native/no-Origin availability was independently rechecked as HTTP 200/open,
four products and 128 slots. The LAN static web preview intentionally receives
HTTP 403 from Square commerce's configured origin restriction; that boundary was
preserved. Real staging discovery/filter rendering and the business Retry state
were checked in the browser. Checkout layout checks use static real-component
renders, not a claimed live browser payment journey.

### Customer-flow release verification

Published and read back on Preview with exact message
`Expose pickup ordering to customers`:

- Group: `19e0d269-e704-4f20-8717-ac25c1344482`.
- iOS: `01a0c07e-651f-7854-aa18-ca040602e2de`.
- Android: `01a0c07e-651f-70aa-869c-cc3ac6f9de17`.
- Branch/channel/EAS environment: preview; app environment: staging; runtime: 0.1.0.
- Both EAS native fingerprints exactly match the preceding Preview update.
  SHA-256 checks also confirm root/mobile package files, lockfile, app config
  and EAS config are unchanged. RevenueCat keys remain absent.

Final `pnpm validate` passed format:check, lint, typecheck, test and build.
There are 380 passing workspace tests (348 mobile, 32 shared), plus 45 passing
Edge tests. Deno checked the changed Square entrypoint successfully.
`git diff --check` passed. The additional staged service-role grant regression
passed against the hosted staging database; public capability SQL passed locally
and on staging. Documentation was formatted after recording the release IDs.
The first export was canceled before upload to fix a stale-modifier editor edge
case; a channel read-back confirmed that no partial update was published.
Only the final verified update above was published. Temporary browser and static
preview-server sessions were closed, and no test business/order/payment fixtures
were left in staging.

### Phone-reported Order ahead navigation fix

The installed Preview exposed two navigation defects. `/order` was registered as
a hidden `NativeTabs.Trigger`; Expo Router 57 explicitly makes hidden native tabs
non-navigable. Its production navigator falls back to the first visible tab when
the focused route is hidden. Separately, the guest route policy omitted `/order`
and immediately replaced that route with `/explore`. The former `Href` cast also
concealed stale generated route declarations that did not include ordering.

Ordering now lives in a root Stack above a pathless `(tabs)` group. Existing tab
routes moved mechanically into that group, preserving their public URLs. The
order route remains at `src/app/order.tsx`; `/order` is allowed for guests without
allowing private routes or arbitrary nested order paths. Generated route types
were refreshed with the installed Expo router-server generator, and navigation
uses a checked `{ pathname: '/order', params }` object rather than a cast.

Discover's former passive Order ahead feature chip is now an actual sibling
button outside the business-card Pressable. It opens the exact business directly.
The public business CTA and saved-order action use the same
`PickupNavigationButton`: immediate pressed/opening feedback, a synchronous
duplicate-tap guard, and a 2.5-second recovery message if navigation does not
blur the source screen. Focus/blur cleans up the timer and permits returning to
the business and ordering again. Closed/error states retain explicit refresh
actions; unsupported and production-gated businesses do not expose ordering.

The touch-path audit checked the public ScrollView, gesture blocker, edge-only
swipe handler, pointer-events-disabled underlay, modal visibility, splash
cleanup, native tab spacing and the actual AppButton native callback. No other
Order-specific overlay or intercepting nested Pressable was found. The Discover
Order ahead filter remains a filter; card and public-page actions navigate.

Changed implementation files: `src/app/_layout.tsx`, `src/app/(tabs)/_layout.tsx`,
the mechanically relocated tab routes (with import fixes in account/businesses),
`src/components/root-navigator.tsx`, `app-tabs.tsx`, `app-button.tsx`,
`business-card.tsx`, `pickup-order-cta.tsx`, `pickup-navigation-button.tsx`, and
`src/lib/navigation-policy.ts`, all under `apps/mobile`.

`src/components/pickup-navigation.test.tsx` renders the actual components with
mocked React Native host primitives, captures and fires their native `onPress`
callbacks, and checks precise business/order destinations and URL encoding,
duplicate activation, sibling press targets, guest/signed-in guards, root Stack
registration, missing IDs, timeout/error recovery and unavailable states. Existing
UI fixture tests received router mocks. These are component callback and routing
checks, not physical-device touch-dispatch tests.

Full `pnpm validate` passed formatting, lint, types, 397 workspace tests
(365 mobile and 32 shared), and builds. The static export includes `/order` and
all previous public URLs. `git diff --check` passed. SHA-256 checks confirm the
root/mobile package manifests, lockfile, mobile app config and EAS config still
match the pre-commerce native baseline. No backend, cart, checkout, tracking,
native package, runtime or RevenueCat rollout change was required.

Physical Preview retest remains required after receiving this update:

1. Signed out, tap Bayou & Bloom's Discover Order ahead button. Confirm its pickup
   menu opens; back returns to Discover. Tap twice quickly and confirm one screen.
2. Open Bayou's business page and tap Order pickup. Confirm the same business's
   menu opens. Back/swipe back, reopen, and repeat while signed in.
3. Check a saved order, accessibility activation, narrow/large-text layout and
   Android hardware back. Confirm unsupported businesses lack the action and a
   closed/error public CTA offers refresh rather than a dead order button.

No physical iOS or Android tap test was performed by the implementation agent.

Published and independently read back with message `Fix Order ahead navigation`:

- Group: `33dd4529-af98-41b5-8a9b-0e49dcfd02f5`.
- iOS: `01a0c091-f846-70ac-a213-93ec40f2733e`.
- Android: `01a0c091-f846-73fa-aba5-7a798d39b340`.
- Branch/channel/EAS environment: preview; app environment: staging; runtime: 0.1.0.
- Both platform native fingerprints exactly match prior group
  `19e0d269-e704-4f20-8717-ac25c1344482`. RevenueCat keys remain absent.
- Verification metadata: `.codex-tmp/pickup-nav-ota-verification.json`;
  validation output: `.codex-tmp/pickup-nav-validation.log`.

## Business pickup workspace

The pilot payment succeeded on the installed Preview app. The follow-up makes
fulfillment discoverable and presents both customer and merchant order information
as a compact receipt with merchant identity, pickup facts and a connected timeline.
It does not change the successful payment, its fulfillment state or its snapshots.

### Navigation and data model

- `PickupWorkspaceProvider` loads one authenticated `operator_businesses` summary
  containing eligible businesses, logos and aggregate counts. The Edge route uses
  the verified session identity, ignoring any user ID in the request body.
- Business mode shows a visible native **Orders** tab only for an active owner or
  staff member with an enabled and synchronized pickup business. The
  inbox is `(tabs)/pickup-orders.tsx`; `/pickup-order` is a pushable root Stack
  screen. Neither ordering screen is registered as a hidden native tab.
- One business opens directly. Multiple businesses get a compact named selector
  with logos and counts. Selection is remembered locally per user and validated
  against the current server result. Authentication, mode changes, foregrounding,
  settings saves and a 30-second foreground refresh recheck eligibility. If access
  or ordering is removed while the inbox is open, it redirects to Manage with an
  explanation. Order details clear on account/mode changes and server denial.
- Queue views are Active, Ready and History, with 25-order pages, aggregate counts,
  deduplicated append and one synchronous load-more guard. Active orders are sorted
  by pickup time; History uses newest creation time. Queue reads batch item rows,
  business identity and counts; they make no per-order Square calls.
- Inbox and detail polling is bounded, non-overlapping and active only while the
  screen is focused and the app foregrounded. History refreshes on focus/manual
  refresh rather than discarding pagination on a timer. Transient refresh errors
  retain prior results with a timestamp and Retry. Authorization failures clear them.
- Owner setup/catalog/disconnect and schedule controls remain in **Ordering &
  Square**, with secondary inbox links there and in the business hub. The old
  operational queue at the bottom of setup has been removed.

### Permission and concurrency boundary

| Operation                                           | Active owner               | Active staff         | Customer / guest / inactive / other business |
| --------------------------------------------------- | -------------------------- | -------------------- | -------------------------------------------- |
| Operator summary, own-business queue and detail     | Yes                        | Yes                  | No                                           |
| Placed → accepted → preparing → ready → completed   | Yes                        | Yes                  | No                                           |
| Full refund/cancellation                            | Yes, explicit confirmation | No                   | No                                           |
| OAuth, catalog sync, pickup settings and disconnect | Yes                        | No                   | No                                           |
| Customer status                                     | Own order/token only       | Own order/token only | Own order/token only                         |

Membership checks happen server-side for every operational read and mutation.
The client cannot elevate itself by displaying a button. Existing private-table
RLS, grants, lease IDs, versions, transition validation and financial idempotency
remain in force. A 409 refreshes the authoritative order and describes a changed
status before another action. Refund and payment-review states cannot advance
through fulfillment. The client synchronously rejects duplicate mutations.
Only whitelisted receipt fields and `{status, at}` events reach presentation;
tokens, raw provider requests and actor IDs are not exposed.

Migration `20260920001000_pickup_order_workspace.sql` adds queue/history indexes,
service-only aggregate/summary functions, service reads for public logo metadata
and a minimal public `get_pickup_status` RPC. Existing capability/allowlist/block
checks remain authoritative. Public status contains no customer or connection
secrets. The former `get_pickup_capabilities` contract remains available.

### Public pickup matrix

| Authoritative state                             | Discover                          | Public business page                        |
| ----------------------------------------------- | --------------------------------- | ------------------------------------------- |
| Unsupported, disabled or production-gated       | Hidden                            | Hidden                                      |
| Enabled but owner paused online ordering        | Subdued Pickup paused label       | Neutral paused message; no order button     |
| Accepting with available slots, storefront open | Order ahead                       | Order pickup and next slot                  |
| Storefront closed, future valid slot available  | Check times through Order ahead   | Schedule pickup and next slot               |
| No valid slots                                  | List status is capability-only    | No pickup times; hours context and refresh  |
| Provider check failed                           | No live provider requests in list | Warning and Retry; never reported as closed |
| Checking                                        | No premature enabled action       | Checking options, no order action           |

`pickupModulePresentation` is the shared pure resolver. Discover batches saved
configuration status; it does not pretend to know live capacity or call Square
for each card. The public page checks actual availability. Physical opening hours
use the business timezone and remain separate from online ordering controls.
Server checkout still revalidates all slots, prices and capacity.

### Timezone correction and protected pilot

The Sandbox location snapshot returned UTC, and the original location-selection
code copied it into ordering settings despite the business being America/Chicago.
New selections use the validated business timezone. The location snapshot retains
Square's original timezone for traceability. The narrow staging correction script
changes only Bayou & Bloom's ordering-settings timezone after checking the exact
expected protected order and current settings. It does not rewrite existing orders.

Protected order `1459be91-d194-400f-9ddb-c15b9f776d09` belongs to business
`11111111-1111-4111-8111-111111111111`; its baseline is `placed`, version `3`,
pickup instant `2026-09-21T09:45:00Z`, snapshot timezone `UTC`, updated at
`2026-09-20T20:49:01.415748+00:00`. The UI formats that same instant in the known
business timezone (4:45 AM Chicago). It does not reinterpret it as a new local
9:45 AM appointment. Future slots follow corrected Chicago settings. UTC remains
explicit only for legacy data with no known business-local timezone.

### Square limitations

SDS owns operational pickup progression. Square remains authoritative for payment
and refund outcomes. Hosted payment links do not guarantee that an SDS completion
will update a corresponding Square fulfillment: Square documents checkout order
types and fulfillment limitations in its
[Checkout pitfalls](https://developer.squareup.com/docs/checkout-api/common-pitfalls)
and [Orders fulfillments](https://developer.squareup.com/docs/orders-api/fulfillments).
The detail screen provides the real Square dashboard URL/reference when available;
staff may need a separate Square action for Square's own fulfillment record.
No unsupported Square mutation is fabricated. The provider's
[Location timezone](https://developer.squareup.com/reference/square/objects/Location)
is an IANA identifier; Sandbox defaults must not replace the merchant's local clock.

### Verification and release checklist

Automated coverage includes owner/staff/inactive/cross-business boundaries,
owner-only financial/configuration actions, session-derived summaries, successful
leased fulfillment against mocks, stale versions, invalid transitions, sanitized
receipt projection, duplicate taps, exact root detail routing, native-tab visibility,
disabled-access redirects, queue sorting/pagination, business selection, timezone/DST
and overnight hours, and the public availability matrix. SQL fixtures create their
own transaction-scoped businesses/orders and roll back; they must never transition,
refund, cancel, recreate or delete the protected pilot order.

Static real-component browser renders at a 375-pixel viewport (360-pixel content
after the scrollbar), light/dark, normal and 1.4× text cover customer menu/editor,
cart, scheduler, review, tracking, business order cards, receipt/timeline/actions
and loading/empty/error states. Public accepting/scheduled/paused/closed/provider
error states are included. Measured renders have no horizontal overflow and no
interactive targets below 48 pixels. Host primitives, image loading and native
symbols are mocked, so these are supplemental layout checks, not native icon,
touch, keyboard or accessibility certification.

Docker Desktop's daemon is unavailable on this machine because of a stale Windows
socket. No local SQL reset or standalone Deno check can run in this phase. Use the
Edge Vitest suite, hosted rollback-only SQL test, Dashboard function bundling and
read-only live staging probes as the documented substitute. Do not download or add
tooling or mutate the pilot order to work around that limitation.

Before OTA: verify the additive migration/SQL fixtures and deployed square-commerce
function; read operator summary, queue and existing order detail; check unauthenticated
denials and public status; confirm the protected order is unchanged. Run full
`pnpm validate`, Edge tests and native/config hash checks. Preview runtime remains
`0.1.0`; no packages, native settings, RevenueCat rollout or Production changes are
part of this phase. Publish both platforms with **Add business pickup order workspace**
only after staging verification passes, then read back IDs, environment and native
fingerprints. Release evidence is recorded below once verified.

Rollback: republish preceding Preview group `33dd4529-af98-41b5-8a9b-0e49dcfd02f5`
to Preview using the existing runtime. The additive migration and corrected
business timezone can remain; reverting UTC settings would recreate the timezone
bug. If the function needs rollback, deploy the preceding reviewed square-commerce
source while retaining private-table grants and customer security controls. Never
reset the database or alter the protected order as part of rollback.

Physical acceptance, still required from the user:

1. Force-close/reopen Preview online, then switch to Business mode and confirm
   Orders is visible for an eligible owner/staff member, absent in Customer mode.
2. Open the preserved pilot from Orders and inspect identity, date/time, contact,
   receipt and timeline without changing its state. Back returns to the inbox.
3. Use separate authorized disposable orders to verify owner/staff fulfillment,
   stale concurrent-worker refresh, completion and owner-only refund confirmation.
4. Verify single/multiple eligible businesses, remembered selection, revoked staff
   access and disabled ordering while the inbox is open. Confirm Manage explains
   loss of access and refresh errors offer Retry.
5. Inspect Discover/public pickup accepting, paused, closed-with-future-slots,
   no-slots and offline/provider-failure states. Turned-off pickup should disappear.
6. Walk through menu, modifiers, cart, pickup time, contact, review, Square return
   and saved-order recovery using authorized Sandbox testing only. Check that the
   current pilot remains unchanged unless you explicitly choose to fulfill it.
7. Repeat narrow/large-text, light/dark, keyboard, safe-area, VoiceOver/TalkBack,
   back/swipe-back and Android hardware-back checks on physical Preview builds.

Local release verification passed `pnpm validate` (format, lint, types, 429
workspace tests including 397 mobile and 32 shared, and builds). The supplemental
root Vitest run passed 697 tests across 49 files including Edge suites.
`git diff --check` passed; all five protected native/package/config SHA-256 hashes
match the pre-commerce baseline. EAS Preview environment preflight confirms
staging project `lgddhdexvwclfrnzjtly` and absent RevenueCat API keys. Logs and
machine-readable evidence are `.codex-tmp/order-workspace-validation.log`,
`order-workspace-tests.log`, `order-workspace-native-check.json` and
`order-workspace-validation-evidence.json`. Temporary browser fixtures and their
static server were closed. Verified backend and publication evidence follows.

Hosted staging verification on 20 September 2026:

- Migration history exists as version `20260920213052`, name
  `20260920001000_pickup_order_workspace`, following the existing Dashboard
  application-timestamp convention. No duplicate history entry was added.
- Deployed only `square-commerce` through the authenticated staging Dashboard.
  Before deploying, both edited source files were read back from the editor and
  compared exactly with SHA-256 values from the tested local files:
  service `1da7378bc3b1e229206764426183ed17d11866c8195560b69d7b667b6811bfd6`;
  domain `771e55d929615bdef41348cc619bec907eaeac08e80e2215343a85622d2ca2cd`.
  The Dashboard completed deployment and cleared both modified-file indicators.
- The current hosted rollback SQL fixture passed, including NULL-safe public
  paused/accepting assertions. A live service-role query returned one eligible
  business, one active/placed order and one receipt item. The protected pilot's
  status, version, pickup instant, UTC snapshot and updated timestamp still match
  the documented baseline. Anonymous-role public status returned `accepting`.
  Final service-role reads returned 13 order events, zero ready logos (the real
  monogram fallback is expected for this pilot), and zero leftover test businesses.
- Live Edge probes at `2026-09-20T21:53:21Z` returned `401 SIGN_IN` for
  operator summary, queue and detail; availability returned HTTP 200/open with
  224 Chicago-time slots. These probes did not call order mutations or payment
  actions. Evidence: `.codex-tmp/order-workspace-public-probe.json`.
- No signed-in app operator JWT was available to this task, so authenticated Edge
  queue/detail HTTP calls were not claimed. SQL service-role reads, mocked Edge
  membership/lease checks and the deployed-source hash checks cover those layers
  independently. The installed Preview owner/staff journey remains a physical
  acceptance check, along with the existing Docker/Deno limitation above.
  Complete safe evidence is `.codex-tmp/order-workspace-hosted-verification.json`.

Published and independently read back with message **Add business pickup order workspace**:

| Field                              | Verified value                         |
| ---------------------------------- | -------------------------------------- |
| Branch / channel / EAS environment | `preview` / `preview` / `preview`      |
| App environment / runtime          | `staging` / `0.1.0`                    |
| Update group                       | `90156e7d-1be8-4812-9fcc-c3023ea45c43` |
| iOS update                         | `01a0c0d2-fbf9-7ee7-ba10-be0fe6470c1f` |
| Android update                     | `01a0c0d2-fbf9-78bf-863e-565ecd81c946` |

Both platforms share the update group and match the preceding Preview native
fingerprints. No new build or native package/configuration change was required.
Production was untouched. The app remains on the Sandbox pilot; RevenueCat stays
unactivated. Verification metadata: `.codex-tmp/order-workspace-ota-verification.json`.
Temporary Dashboard/browser tabs were closed after verification.

### Customer pickup menu and checkout polish (September 20, 2026)

The customer `/order` route now uses a bounded screen layout: fixed compact navigation, independently scrolling content, and a safe-area footer. The menu is a virtualized list, without a parent vertical ScrollView. Real merchant color/logo/cover identifies the business; missing product photos produce compact text-and-price cards rather than invented imagery. The actual four-item Sandbox catalog is covered by full-screen render fixtures. Search appears only beyond eight products; multiple categories use the existing gesture-aware horizontal row.

Plain items add one directly; inline 48-point minus/plus controls update the same business-scoped cart and remove at zero. Item-body taps deliberately inspect an item. Items with options open the existing native page sheet: required single selections are radios, optional/multiple choices are checkboxes, per-group limits are visible, and quantity plus Add/Update estimate stay in the footer. Customized lines keep exact-index editing and distinct modifier combinations. A synchronous cart reference handles consecutive taps; failed storage writes retain the previous cart. Cart edits never call quote, checkout, payment, or order creation.

Availability refreshes on focus, foreground, pull-to-refresh, and once a minute while browsing. Removed catalog items remain visibly unavailable for repair/removal; a failed availability request disables further checkout while preserving the cart. The customer menu reuses the public pickup-state resolver and business-local hours, including closed businesses with future pickup slots. Route identity changes remount the flow to prevent cross-business state leakage.

Pickup selection shows a location, truthful earliest slot, timezone once, date tabs, eight time choices, and Show later times. A later selected slot remains visible on return. Repeated clock times across a daylight-saving fallback include their timezone to distinguish the actual instants. Review groups Pickup, Contact, and Order summary, formats US phone numbers, provides Edit links to each relevant step, and uses an explicit secure-payment footer. Server-authoritative quoting, hosted checkout, idempotency, and payment reconciliation are unchanged.

Verification includes pure cart/modifier/scheduling tests, rendered control callback checks, and complete 320×568 and 375×812 React Native Web layouts in light/dark mode with 1.4× text and a simulated 34-point bottom inset. Native image rendering, actual page-sheet gestures, hardware keyboard behavior, VoiceOver/TalkBack, and physical-phone safe areas are not proven by these fixtures. No Square API/SQL mutations, hosted emails, new orders, or actions on protected order `1459be91-d194-400f-9ddb-c15b9f776d09` were performed for this UI phase.

Phone acceptance after loading the new Preview OTA:

1. Open Bayou Bites → Order pickup. Confirm merchant identity and the four real menu items, then tap Add on a plain item: no sheet should open. Tap plus/minus repeatedly and remove at zero; reopen the business and confirm its cart persists separately from another business.
2. Inspect an item by tapping its name/body. On a catalog item with modifiers, check required options, multi-select limits, updated estimate, edit/save, and separate customized lines. A removed/unavailable item must not be addable.
3. Open cart, adjust quantities, edit/remove, and return to the same menu position/category. Verify a simulated network loss or paused ordering keeps the cart and blocks checkout until refreshed.
4. Choose pickup date/time; verify earliest time, local timezone, Show later times, selected state, and the sticky selected-time CTA. Revisit from review and confirm the selected time remains.
5. Enter contact information with the keyboard open; verify the action remains reachable. Review the formatted phone, item totals, tax, pickup address, and Edit links. Check normal/large text, light/dark, narrow phones, rotation, screen reader order, and horizontal category/date gestures.
6. Any new Sandbox payment test must be separately intentional. The secure-payment button opens hosted Square checkout; returning alone never establishes paid status. Do not modify or use the protected existing order for this checklist.

Validation for this polish phase:

- `pnpm validate` — passed formatting, lint, typecheck, 445 workspace tests (413 mobile + 32 shared), and web/mobile web builds. One pre-existing `react-hooks/exhaustive-deps` warning remains in the business order-detail route; no lint errors.
- `node node_modules/vitest/vitest.mjs run --config apps/mobile/vitest.config.mts` — 713 tests passed across 50 files.
- Browser inspection — 30 full-screen static fixtures: five funnel screens, light/dark themes, normal/1.4× text at 375×812, plus both themes at 320×568 with 1.4× text. Zero horizontal control overflow, zero measured targets under 48 points, all sticky footers visible. Native images/keyboard/gestures and actual-phone testing remain on the acceptance checklist above.
- SHA-256 comparison — mobile/root package manifests, lockfile, Expo app config, and EAS config all unchanged from the protected baseline.
- Preview environment gate — confirmed staging project `lgddhdexvwclfrnzjtly`, with RevenueCat native keys absent. Production and the protected existing order were untouched.

Published and verified by reading the Preview channel back:

- Message: `Polish customer pickup menu and cart controls`
- EAS environment/channel/branch: `preview`; app environment: `staging`; runtime: `0.1.0`
- Group: `15b28a11-d750-44ed-ad96-b40cf201ff59`
- iOS update: `01a0c104-26ae-71cc-8f4a-c4cc0f7488af`
- Android update: `01a0c104-26ae-70d8-802b-fe74111d708d`
- Both platform native fingerprints match the preceding verified release.
- Previous group (rollback reference): `90156e7d-1be8-4812-9fcc-c3023ea45c43` — `Add business pickup order workspace`.
- Local verification records: `.codex-tmp/customer-menu-ota-verification.json`, `.codex-tmp/customer-menu-visual-verification.json`, `.codex-tmp/customer-menu-validate.log`, and `.codex-tmp/customer-menu-vitest.log`.

This is a JavaScript/UI-only Preview update. No migration, Edge Function deployment, production change, native dependency/configuration change, hosted email, or payment/order mutation was required.

### Customer order status and history (September 20, 2026)

Customer navigation now includes **Orders** in Preview customer mode, for guests and signed-in customers. Current orders include unfinished checkout, payment-review and refund-attention states; History contains completed, refunded, expired and failed checkout records. Cards retain merchant logo/color, order number, status, item count, pickup/order date and the server total. Selecting a card opens the existing protected order detail. Lists refresh on focus/foreground, poll current orders while focused, page in 25-order batches per source, and retain loaded results on transient failure. Authentication changes remount the list/detail state so a previous account’s results do not remain on screen.

The detail screen now has a real merchant-color identity field, concise current status, five compact progress segments, optional expanded order activity, pickup facts with Directions/Call actions, receipt, and a quiet refresh control. The header has an Orders shortcut. No full future timeline occupies the default screen. Existing server-confirmed status, pending-checkout recovery and terminal-order behavior remain intact.

`square-commerce` adds the read-only `customer_orders` action. Account queries require the runtime-verified user and filter by `square_orders.customer_id`; body-supplied user IDs are ignored. Device queries require each order ID’s matching opaque guest token hash. Missing, revoked and mismatched proofs reveal no order data. The action uses the existing public order projection, excludes recipient/provider/secret records, and never calls Square reconciliation, creates payments, or changes order state. No direct table grants/RLS changes or migration were needed. Only the staging `square-commerce` function was redeployed. CLI access was unavailable, so the existing authenticated staging dashboard deployed the exact source; reloaded source SHA-256 matched `db7f918f68b6ded469cb4327bb68e2726135911824af3e061165f6ba8836c2a8` (LF, trimmed).

Guest recovery keeps a bounded index of 50 recent order IDs in existing secure storage, with proofs in the existing per-order records. Signed-in checkouts are excluded from the guest index; account-specific recovery is unavailable after sign-out/account change. The old Preview did not keep an enumerable guest-order index: its last saved guest order can be recovered, but older guest orders cannot be retroactively discovered on native devices. Signed-in historical purchases come from the server and do not depend on that local index. Guest history remains subject to existing guest-token anonymization/retention (terminal orders older than 30 days can lose guest access). No tokens are placed in route parameters or rendered in cards.

Live staging checks: anonymous account history returned 401 `SIGN_IN`; an empty device list and an unknown order/token proof returned 200 with zero orders. Neither check used or mutated the protected order `1459be91-d194-400f-9ddb-c15b9f776d09`. No test order, payment, refund, email, or production action was performed. Cross-account filtering, guest-token checks, paging, projection privacy and absence of Square/mutation calls are covered by deterministic service tests. Authenticated live account-history success and physical-device behavior remain phone acceptance checks.

Phone acceptance:

1. Reload the Preview app and open **Orders** from customer navigation. Check Current and History, pull-to-refresh, a populated list, a genuinely empty list, and retry after disconnecting/reconnecting.
2. Signed in, confirm your previous account orders appear. Open an order, use Orders to return, sign out/switch accounts, and confirm the previous account list/detail does not persist. Guest orders should be labelled as device-local and survive restarting this device.
3. Open the redesigned detail: verify merchant identity, current progress, View/Hide activity, pickup address/time, Directions/Call, receipt, and refreshing. Pending checkout must never be represented as paid merely from returning to the app.
4. Check narrow screens, large text, both themes, native tab labels, VoiceOver/TalkBack order, safe-area padding, and scrolling through receipts/history. Do not use the protected existing order for mutations or payment tests.

Published and verified: `Redesign customer order status and add order history`.
Group `26b34278-cf6b-42e0-b8da-5dbe4ea39011`; iOS
`01a0c129-0d73-7926-bbdb-8e0b19153525`; Android
`01a0c129-0d73-7369-adfc-426771607a00`. Preview branch/channel/environment,
staging app environment, runtime `0.1.0`, unchanged native fingerprints.
`pnpm validate` passed (454 workspace tests); the broader mobile/shared-function
suite passed 728 tests. Twenty-four light/dark, normal/large-text fixtures at
320 and 393 points had no horizontal control overflow or targets below 48 points.
See `.codex-tmp/customer-history-ota-verification.json` and validation logs.

## Order alerts and pickup confirmation (staging Preview, September 20)

Order status changes create customer and active business-staff inbox alerts. Signed-in users can enable order push alerts in Account, the active order screen, or business ordering settings. Guests can track their order but do not receive account-based push notifications. The existing one-minute Square maintenance schedule calls the dispatcher with an orders-only scope; current status, membership access, preferences, expiry and deduplication are checked before dispatch.

Paid orders marked Ready expose a five-minute pickup QR. Staff use **Staff Scan → Scan pickup QR**, review the order, and confirm handoff. This transaction completes the order and credits an existing eligible rewards membership with configured points on the item subtotal or one visit. Retrying confirmation cannot issue a second award. A copied pickup code supports manual entry when a camera is unavailable. Orders without a rewards membership still complete normally.

Migrations `20260920001200_pickup_order_notifications` and `20260920001300_pickup_confirmation` are applied to staging. The commerce, notification-dispatch and maintenance functions are deployed. The first scheduled dispatch succeeded at 2026-09-21 00:45 UTC (no queued alerts). SQL fixtures were rolled back; no real payments or test emails were sent. Root tests: 740 passed; `pnpm validate` passed with one existing hook dependency warning. Browser component checks covered QR rendering, receipt review and safe confirmation retry; physical camera and push delivery still require a device check.

Preview OTA group `a161f0b3-7956-4f6e-b014-642c60222b41` is verified on iOS and Android, staging environment, runtime 0.1.0, with unchanged native fingerprints. The preceding picker/settings/automatic-timezone update was group `1e18fcc1-192a-4628-86c9-4b4a7cc2db76`.

Checkout reward redemption and post-pickup refund reward adjustment are separate outstanding work; this release only earns rewards at confirmed handoff.

## Sandbox catalog expansion

The authenticated Bayou & Bloom Cafe Sandbox catalog now contains 16 test items across Coffee & Drinks, Breakfast, Lunch & Bowls, Sides & Soups, and Bakery & Treats. Items include drinks, breakfast, lunch, sides, soup, and bakery examples at different prices. Cold Brew has Regular 12 oz ($4.50) and Large 16 oz ($5.50) variations. Generated product images are attached to Cold Brew, Pressed Sandwich, and Seasonal Grain Bowl. The catalog changes were made in the Sandbox Default Test Account only; production was not touched. Square's modifier editor is currently empty in Sandbox, so no modifier set was created. The app catalog sync still needs to be run from the authenticated business settings screen and verified in the customer menu.

## Checkout rewards and business order detail (September 20)

Pickup checkout now checks the signed-in customer's active rewards membership when creating the server quote. A ready reward can apply a configured free-item, buy-one-get-one, or percentage discount to an eligible Square variation. The quote carries the resulting discount into Square's calculated order, and the reservation RPC locks the membership and records one redemption with the order before payment-link creation. Replays are idempotent and a changed balance, menu, or reward configuration forces a fresh quote. Guests continue through checkout without a rewards redemption.

Business order detail now uses an operator-focused header with the order number, pickup due time, customer handoff guidance, fulfillment timeline, and a clearly separated payment/Square section. The customer-facing receipt and progress language no longer appear as the primary business workflow.

Migration `20260920001400_checkout_rewards` is applied to staging and `square-commerce` is deployed with the reward-aware quote and checkout flow. The app code is ready for the next Preview OTA. Refund reversal of an already-consumed checkout reward remains a follow-up before enabling post-payment refunds for those orders.

### Ordering feedback, scanner, and business setup polish (September 20)

Customer order status now includes the business's configured preparation time and a short next-step explanation, so a newly placed order immediately explains what the business will do next and when the customer should expect movement. The status response reads the current Square ordering settings and exposes the estimate through the protected order projection.

The business order detail is operator-first, with customer handoff context, a fulfillment timeline, and a separated payment record. Staff Scan now presents pickup handoff and rewards scanning as two clearly labeled workflows, keeps the action choice and optional purchase total together, and moves manual entry and activity into quieter secondary controls. Listing plan navigation uses the explicit tab route so the View action opens reliably.

New business onboarding now offers an optional "Set up Square next" choice on the final review step. Choosing it opens the newly created private workspace directly to Ordering & Square; skipping it leaves the owner free to configure ordering later. Drafts remember the choice without storing any credentials. Draft business workspaces also show a dismissible completion reminder with the current percentage and each remaining publishing step, with direct links into the right editor.

The staging `square-commerce` function was redeployed after the preparation-time projection change. Preview OTA group `1f7ae34b-beac-4e21-975e-7f7fb619e1cf` is published for iOS (`01a0c197-05b8-77d5-b492-00862d6e04da`) and Android (`01a0c197-05b8-7315-9d30-7853ec5507e6`), runtime 0.1.0 on the staging Preview channel. No production data, payment, email, or protected order was changed.

### Pickup scanner UI polish (September 20, 2026)

The pickup confirmation modal now uses a safe-area header, clear Close action, business context card, bounded camera frame with QR target guidance, and a grouped manual-code fallback. Preview OTA group `ed734442-4c35-47b1-b6da-ffaa0ae06a94` is published for iOS `01a0c19b-e4d9-7470-8f26-2ddae76bdc05` and Android `01a0c19b-e4d9-7fc8-91b1-abd8beb9e9bb`.

### Order status and push-alert polish (September 20, 2026)

The customer order status card now uses a compact status hierarchy, a step badge, an estimated-prep callout, a clear next-step block, and current/next labels beneath the progress segments. Order alerts use an `ORDER UPDATE` label, a status pill, and contextual next-step guidance. The full alert detail keeps order updates visually distinct and uses `Open order` with the correct customer/business mode.

The order-alert preference now requests device notification permission and registers the current Expo push token when a user turns order pushes on. Customers and active business owners/staff remain separate recipients from the status-change trigger; the orders-only dispatcher sends high-priority Expo notifications on the `orders` channel, and receipt processing disables stale device tokens. Foreground delivery still shows a banner and updates the Alerts inbox; background delivery opens the safe order route when tapped. The settings copy explicitly explains both customer and business-team coverage.

The staff pickup-handoff modal now paints its SafeAreaView and scroll surface with the active theme background, fixing the light-theme white-screen/text contrast failure shown in the QR scanner screenshot. The QR frame, manual fallback, order review, and confirmation behavior are unchanged.

Root `pnpm typecheck` and `pnpm test` pass (424 mobile tests; 8 workspace typecheck targets). Preview OTA group `4be57e26-a2f8-4131-8f30-70f35c943ede` is published for iOS `01a0c1a5-8ebf-70a1-8d57-ea44d2aacf5a` and Android `01a0c1a5-8ebf-7dc8-8d16-957bd60be9b4`, runtime 0.1.0, staging Preview channel. Native fingerprints and backend migrations are unchanged.

The final copy-only follow-up is Preview OTA group `95d6792b-87fc-417c-8907-aab2fd23d70b`, iOS `01a0c1a8-5276-7da2-b341-452217e1d1d8`, Android `01a0c1a8-5276-77a7-bcbb-f039c5b634d6`.
