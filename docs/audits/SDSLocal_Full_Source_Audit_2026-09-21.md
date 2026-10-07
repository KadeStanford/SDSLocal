# SDSLocal — Full-source audit and release plan

SDSLOCAL • MOBILE / WEB / SUPABASE

## Full-source audit
and release plan


21 September 2026

Logic, security, unfinished features, interaction design, and App Store / Google Play readiness. Android receives additional attention because most development testing has been on iOS.

### Recommendation

Do not submit this snapshot as a finished paid-listing and live-ordering product. First fix the authorization and billing-state defects, stabilize native navigation, and prove a release build on Android. A narrower discovery/rewards release is possible after the common release gates are closed; live commerce should remain disabled until its separate completion milestone.

| Archive access | Findings | Reproduction checks |
| --- | --- | --- |
| 493 / 493 files readable | 32 prioritized findings | 16 isolated checks reproduced |
| 471 text files + 22 images | 9 High · 22 Medium · 1 Low | Actual source; mocked external services |

### Read first

F07: loyalty preview authorization. F01–F03: billing identity and entitlement lifecycle. F20: non-navigable hidden native routes. F13/F18: live-commerce and payment-lifecycle gaps. F24–F29: deletion, permissions, Android configuration and release verification.

Priority labels combine security, correctness and release impact. Nine High findings does not mean nine critical security vulnerabilities. No critical remote takeover or completed unauthorized payment was demonstrated.

### Source snapshot

Archive: SDSLocal-main(1).zip
Commit recorded in ZIP comment: 99711716ceebf4f62bc9c4ba73ecc25994ccc07e

SHA-256: eb1604a6d123e750842568caabc2467de6129d80aa1ee8af766f2d6ff1b25729

This report supersedes the earlier 12-file review. The original uploaded archive was not modified. This is an evidence-backed source review, not a live penetration test or a guarantee of store approval.

01 / COVERAGE

## Scope and evidence boundaries


The ZIP passed its integrity check. Every file was extracted, read and hashed; all 22 binary image assets decoded. There were no inaccessible entries, Git LFS pointers, submodule references or unsafe archive paths. Complete access is established for this supplied snapshot—not for uncommitted work, Git history or separately deployed services.

| Area | Files / scope | Review performed |
| --- | --- | --- |
| Mobile | 216 files | Routes, providers, storage, billing, scanning, discovery, commerce, config and UI structure |
| Web | 83 files | Public/business/event routes, auth/onboarding surfaces, commerce integration and release links |
| Supabase | 67 migrations; 14 edge entry points | Migration sequence, effective policy/function index, authorization and lifecycle paths |
| Shared / operations | Packages, scripts, 19 docs, CI, lockfile | Cross-layer contracts, feature gates, constraints and existing test coverage |
| Existing tests | 40 TS/TSX test files; 13 SQL test files | Inventoried and inspected as evidence; project test suites were not executed |

### Checks executed

All 471 text files were available for whole-tree searches. A TypeScript parser processed 293 JS/TS-family files with zero syntax diagnostics; the local-import scan found zero unresolved static relative/@ imports. A common-secret-pattern scan found no matches in this snapshot. These limited checks do not prove type safety, dependency compatibility, absence of secrets or security.

The SQL index follows statement order across migrations and records 110 latest public function definitions and 76 policy definitions. It is a static index, not PostgreSQL execution. Critical paths received manual source tracing and 16 dependency-isolated reproductions. No claim is made that every source line was manually reviewed.

### Not executed or observable here

Dependency downloads were blocked by network resolution. Available Node was 22.16.0 and TypeScript 5.8.3; the project requests Node 24, pnpm 11.19.0 and TypeScript ~6.0.3. No project pnpm validate, native archive/AAB, device session, live migration, provider transaction or store-console review was run.

Production RLS state, deployed secrets, scheduler activity, live domain associations, account type, store product configuration, SDK privacy manifests and actual dependency advisories remain release checks. A checked-in configuration is not evidence that a service has been deployed correctly.

02 / SYSTEM UNDERSTANDING

## Architecture and controls worth keeping


SDSLocal combines an Expo/React Native customer-and-business app, a Next.js web surface, shared TypeScript packages, and Supabase Auth/Postgres/Storage/Edge Functions. There are two distinct money flows: store subscriptions for business listings, and Square/Stripe pickup commerce. Their identities, lifecycles and rollout gates should remain separate.

| Boundary | What is implemented | What to preserve |
| --- | --- | --- |
| Authentication | Supabase sessions; native Apple/Google sign-in; deletion workflow | Provider nonce checks, explicit auth checks, shared-ownership deletion logic |
| Loyalty | Signed short-lived QR tokens; staff mutation RPCs; replay/idempotency controls | Server authorization and transactional ledger decisions—not client-only rewards |
| Commerce | Quotes, reservations, guest status tokens, handoff, refunds in test mode | Hashed guest tokens, account matching, locks/leases, canonical payment validation |
| Media | Native optimization, staged uploads, metadata finalizers and cleanup | Variant limits, server-side quota enforcement, immutable object paths |
| Safety | Reports, business blocking and moderation tools | Role separation and preserving moderation suspensions during billing recovery |
| Engineering | Reusable UI/tests; CI; EAS profiles; SQL regression scripts | Incremental fixes with regression tests, rather than a broad rewrite |

### Important limits on the findings

The wrong-item reward quote is rejected by the SQL commit guard: F15 is not proof of a successful unauthorized discount. Notification UPDATE broadening remains restricted to the caller’s own rows. The loyalty preview leak requires a valid short-lived QR. The OAuth link issue is conditional and needs native verification. These distinctions should survive any handoff to a coding agent.

Supporting source: supabase/functions/_shared/loyalty-token.ts; supabase/functions/loyalty-transact/index.ts; supabase/functions/stripe-webhook/index.ts:12–56; supabase/migrations/20260920001400_checkout_rewards.sql:28–81; supabase/functions/delete-account/index.ts; apps/mobile/src/components/account-data-panel.tsx.

### Trust boundary to make explicit

Treat every mobile/web input as untrusted. A service-role edge function must authorize the caller for the actual target before reading private data or publishing media. Store/provider results must be verified and reconciled before changing business access or order payment state. React state is presentation, not authorization.

03 / TRIAGE REGISTER

## Finding index 1–16


| ID | Priority | Finding |
| --- | --- | --- |
| F01 | High | Account switching can rebind billing to the previous user |
| F02 | High | Subscription pause and grace-period events remove access too early |
| F03 | High | Old billing events can overwrite newer entitlement state |
| F04 | Medium | A successful purchase can be reported as “nothing was charged” |
| F05 | Medium | Restore can contradict the subscription it just loaded |
| F06 | Medium | Android subscription management can silently do nothing |
| F07 | High | Loyalty preview omits staff authorization when business ID is absent |
| F08 | Medium | SecureStore errors downgrade auth tokens to plaintext storage |
| F09 | Medium | Image finalization trusts headers and publishes before authorization |
| F10 | Medium | Staging uploads have no demonstrated aggregate quota or expiry |
| F11 | Medium | A later migration broadens notification writes beyond read/dismiss |
| F12 | Medium | Legacy token callbacks are not bound to a pending sign-in intent |
| F13 | High | Live pickup commerce is intentionally not implemented |
| F14 | Medium | Stripe dispatch unnecessarily requires Square configuration |
| F15 | Medium | Reward quotes offer discounts that checkout correctly rejects |
| F16 | Medium | “Free” rewards are clamped to a one-cent charge |

Every finding below includes the observed behavior, concrete remediation, acceptance tests and repository-relative source references. “Confirmed” describes the stated source behavior; native/runtime verification remains distinct.

03 / TRIAGE REGISTER

## Finding index 17–32


| ID | Priority | Finding |
| --- | --- | --- |
| F17 | Medium | Reward summaries silently truncate long transaction ledgers |
| F18 | High | Out-of-app Stripe refunds and disputes are not synchronized |
| F19 | Medium | Stripe tax behavior is a hardcoded zero rather than a merchant policy |
| F20 | High | Important routes are registered as non-navigable native tabs |
| F21 | Medium | Native event links and website association need completion |
| F22 | Medium | Public URL validation is undone when the config value is assigned |
| F23 | Medium | Scheduled events can become public while their galleries remain hidden |
| F24 | Medium | Apple token revocation and external deletion access are unfinished |
| F25 | High | Permissions exceed the simplest supported launch scope |
| F26 | Medium | Android Maps lacks demonstrated release-key configuration |
| F27 | Medium | Legal and support access is conditional and too tied to the paywall |
| F28 | Medium | Multi-to-single listing downgrade has no completed capacity workflow |
| F29 | High | CI validates web export, not native release or database behavior |
| F30 | Medium | Discovery becomes incomplete and expensive as data grows |
| F31 | Medium | Large screens concentrate unrelated state and make regressions costly |
| F32 | Low | Shipping assets still use template branding |

Every finding below includes the observed behavior, concrete remediation, acceptance tests and repository-relative source references. “Confirmed” describes the stated source behavior; native/runtime verification remains distinct.

04 / DETAILED FINDINGS

## Findings F01–F02


### F01  Account switching can rebind billing to the previous user

HIGH  |  Confirmed control-flow defect  |  Both platforms; paid listings

**Observed.** A canceled initialization still runs RevenueCat configure/logIn after its awaited refresh, before checking cancellation. In the reproduction, account B finished first, then the late account-A task changed the SDK identity and summary back to A. This is a cross-account billing-state error, not proof that server authorization can be bypassed. Sign-out also resets UI without explicitly resetting the SDK identity.

**Improve.** Serialize SDK identity transitions. Increment an account generation on every auth change; reject stale continuations before SDK calls and state writes. Disable checkout until SDK identity, backend summary, and current session all agree. Define and test the appropriate SDK sign-out/anonymous-user policy rather than only clearing React state.

**Acceptance.** Delay A’s RPC; switch to B; finish B, then A. B must remain the SDK customer and displayed account. Repeat with sign-out, rapid A/B/A switching, and purchase buttons pressed during transition.

apps/mobile/src/providers/listing-billing-provider.tsx:92–162

apps/mobile/src/providers/listing-billing-provider.tsx:166–174

Executed evidence: R12. See reproduction register and companion harness.

### F02  Subscription pause and grace-period events remove access too early

HIGH  |  Confirmed parser / entitlement mismatch  |  Android pause; both platforms for grace periods

**Observed.** The parser turns SUBSCRIPTION_PAUSED into paused immediately. The database active-entitlement predicate excludes paused, even if the paid period has not ended. For BILLING_ISSUE it retains expiration_at_ms but ignores a later grace_period_expiration_at_ms. The source checks reproduced both transformations. RevenueCat documents pause as a scheduled event and supplies a separate grace deadline. [S05]

**Improve.** Model effective access separately from renewal intent. Preserve paid-through access for scheduled pauses; honor verified grace deadlines; expire only on the effective lifecycle transition. Reconcile against canonical provider entitlement state when an event is incomplete.

**Acceptance.** With seven paid days remaining, scheduling a pause must not hide a business. An expired paid period with three grace days must remain accessible until grace ends. Test eventual expiry, recovery, and duplicate delivery.

supabase/functions/_shared/revenuecat-webhook.ts:48–91

supabase/migrations/20260920000100_business_listing_billing.sql:146–161

Executed evidence: R04, R05. See reproduction register and companion harness.

04 / DETAILED FINDINGS

## Findings F03–F04


### F03  Old billing events can overwrite newer entitlement state

HIGH  |  Confirmed source-level state-ordering gap  |  Backend; paid listings

**Observed.** Event IDs are deduplicated, but distinct events unconditionally overwrite the same billing-account entitlement row. There is no persisted ordering guard or canonical reconciliation in this path. A late old expiration can replace a newer active renewal and suspend listings. Transfer-shaped events also do not fit the parser’s required app_user_id and entitlement fields. The database sequence was not executed here.

**Improve.** Keep the event log, but reconcile a customer’s current entitlement under a per-account lock before applying access changes. Handle transfer source and destination identities explicitly. Record processing outcomes, support replay, and add a periodic reconciliation job; do not rely solely on arrival order or a naive timestamp comparison.

**Acceptance.** Apply renewal, then a distinct older expiration, in both orders; final state must match the provider. Repeat with refund, restore/transfer, duplicate IDs, deleted users, and outage recovery.

supabase/migrations/20260920000100_business_listing_billing.sql:360–383

supabase/migrations/20260920000100_business_listing_billing.sql:426–470

supabase/functions/_shared/revenuecat-webhook.ts:67–115

Documentation cross-check: S05. See primary sources.

### F04  A successful purchase can be reported as “nothing was charged”

MEDIUM  |  Confirmed control-flow defect  |  Both platforms; purchase recovery

**Observed.** The purchase catch covers both the store transaction and subsequent backend synchronization. When the store succeeds but synchronization throws, the app returns failure and says nothing was charged. The reproduction reaches that exact branch. This can prompt a retry, confuse support, and undermine trust; it does not establish that the store will actually charge twice.

**Improve.** Separate checkout outcome from entitlement synchronization. Once the store reports success, retain a pending-confirmation state and never describe it as uncharged. Provide retry-sync, restore, and support actions without initiating another purchase automatically.

**Acceptance.** Mock successful purchase followed by timeout, offline transition, RPC error, and app restart. Show “Purchase completed; confirming access” until the server resolves it. Only a verified canceled/failed store transaction may use no-charge language.

apps/mobile/src/providers/listing-billing-provider.tsx:175–229

Executed evidence: R11. See reproduction register and companion harness.

04 / DETAILED FINDINGS

## Findings F05–F06


### F05  Restore can contradict the subscription it just loaded

MEDIUM  |  Confirmed control-flow defect  |  Both platforms; restore purchases

**Observed.** After eight unsuccessful polling attempts, restore performs a fallback refresh. That refresh can load an active plan, yet the function still returns false and displays “No active listing plan” because its decision uses the earlier polling result. The isolated check reproduced an active summary with a failure notice.

**Improve.** Return the refreshed summary and derive both the result and notice from the final authoritative state. Distinguish no purchase, synchronization still pending, account mismatch, and network failure. Preserve a transaction correlation ID for support, without logging tokens.

**Acceptance.** Have the first eight reads return no entitlement and the ninth return active. Restore must report success. Separately verify true no-purchase and network-error cases produce different messages.

apps/mobile/src/providers/listing-billing-provider.tsx:70–80

apps/mobile/src/providers/listing-billing-provider.tsx:233–256

Executed evidence: R10. See reproduction register and companion harness.

### F06  Android subscription management can silently do nothing

MEDIUM  |  Confirmed platform-specific defect  |  Android; paid listings

**Observed.** If RevenueCat returns no managementURL, manage opens Apple’s subscription page only on iOS. On Android it resolves without opening anything or reporting a problem. The check confirms a zero-action result. This is especially easy to miss when testing only iOS.

**Improve.** Use a supported Google Play subscription-management destination when no provider URL is returned; include package/product context when available. Handle browser-opening failures and expose a useful fallback instruction rather than a silent success.

**Acceptance.** On a Play-distributed build test active, expired, transferred, and missing-managementURL subscriptions. Each manage action must open the appropriate destination or display a clear recoverable error.

apps/mobile/src/providers/listing-billing-provider.tsx:258–268

Executed evidence: R13. See reproduction register and companion harness.

04 / DETAILED FINDINGS

## Findings F07–F08


### F07  Loyalty preview omits staff authorization when business ID is absent

HIGH  |  Confirmed authorization defect  |  Authenticated API callers; customer privacy

**Observed.** The endpoint checks business membership only when expectedBusinessId is supplied. A different authenticated user with a currently valid customer QR can omit it and request preview. The actual handler returned the synthetic customer’s name and rewards information without querying business_members. The QR must be valid and short-lived; this is not unrestricted customer enumeration. SQL mutation functions still enforce staff access.

**Improve.** After token verification, authorize the caller against claims.businessId before reading customer details. Treat expectedBusinessId only as a consistency check. Return minimal preview fields, add per-actor throttles, and keep audit events free of reusable QR/token contents.

**Acceptance.** Run an actor matrix: unrelated customer, staff at another business, inactive staff, manager, owner, and token owner. Omission or invalid formatting of expectedBusinessId must never weaken the permission decision.

supabase/functions/loyalty-transact/index.ts:263–305

supabase/functions/loyalty-transact/index.ts:396–480

supabase/migrations/20260915000100_initial_schema.sql:676–682

Executed evidence: R07. See reproduction register and companion harness.

### F08  SecureStore errors downgrade auth tokens to plaintext storage

MEDIUM  |  Confirmed credential-storage weakness  |  Native iOS and Android; local-device threat

**Observed.** The native auth adapter catches SecureStore write failures and persists the session through its legacy localStorage adapter. Native localStorage is supplied by expo-sqlite. The check wrote a synthetic refresh token to that adapter after a vault failure. This increases exposure to local storage compromise or backups; no remote account takeover was demonstrated.

**Improve.** Do not silently downgrade long-lived credentials. Use a memory-only session on secure-storage failure or a reviewed encrypted-storage design. Migrate legacy values only after secure persistence succeeds, remove plaintext remnants, and surface a recoverable sign-in/storage error without logging credentials.

**Acceptance.** Force secure read/write/delete failures and oversize payloads. Search the native sandbox and relevant backups for synthetic refresh tokens. Sign-out and account deletion must clear both current and legacy keys reliably.

apps/mobile/src/lib/auth-storage.ts:116–180

apps/mobile/src/lib/sqlite-storage.native.ts:1–1

Executed evidence: R03. See reproduction register and companion harness.

04 / DETAILED FINDINGS

## Findings F09–F10


### F09  Image finalization trusts headers and publishes before authorization

MEDIUM  |  Confirmed validation / operation-order weakness  |  Media uploads; authenticated abuse

**Observed.** The dimension helper accepts a 30-byte WebP-like header with no image payload. Finalization uploads variants to the public business-media bucket before the SQL RPC checks business ownership and quota. SQL rejection and cleanup protect database association, but the public write happens first and cleanup can fail. This is not evidence of image-decoder code execution.

**Improve.** Authorize the actor, target, and reserved quota before downloading or publishing. Decode with a maintained image processor, enforce pixel and memory limits, strip metadata, and re-encode server-side. Retain the final SQL permission check for race safety and queue failed cleanup durably.

**Acceptance.** Reject the header-only fixture, truncated files, excessive dimensions, and incorrect role/target ownership before any permanent write. Simulate each storage/RPC failure and prove no untracked public object remains.

supabase/functions/finalize-business-image/index.ts:72–101

supabase/functions/finalize-business-image/index.ts:152–247

Executed evidence: R06. See reproduction register and companion harness.

### F10  Staging uploads have no demonstrated aggregate quota or expiry

MEDIUM  |  Confirmed source-level resource-control gap  |  Storage cost and operational abuse

**Observed.** The staging bucket allows authenticated users to insert under their own user prefix, with a 15 MiB per-object ceiling. No per-account aggregate staging quota or abandoned-upload TTL sweep was found in the supplied tree. Existing media cleanup deals with tracked assets and deletion jobs; that is not equivalent to cleaning arbitrary abandoned staging objects. Hosting-level controls may exist outside this snapshot.

**Improve.** Issue short-lived upload intents after business authorization; reserve a bounded byte budget and object count. Expire abandoned staging uploads, verify storage API error fields, and alert on unusual upload volume. Separate staging, published, and pending-delete byte totals.

**Acceptance.** Upload repeatedly without finalizing and verify the account cap. Advance past TTL and confirm cleanup. Test interrupted uploads, malicious target IDs, quota races, and cleanup retries; publish a measurable retention rule.

supabase/migrations/20260915000100_initial_schema.sql:876–908

supabase/functions/finalize-business-image/index.ts:238–247

04 / DETAILED FINDINGS

## Findings F11–F12


### F11  A later migration broadens notification writes beyond read/dismiss

MEDIUM  |  Confirmed migration permission regression  |  Authenticated users’ own notification rows

**Observed.** An earlier migration grants update only on read_at and dismissed_at. A later migration grants table-level UPDATE on notification_deliveries, reopening all updateable columns. Row-level security still limits users to their own rows; this is not cross-account access. It nevertheless allows client changes to server-owned delivery fields and defeats the intended column boundary.

**Improve.** Add a forward migration that revokes broad UPDATE and grants only the intended columns. Prefer RPCs for any other client action. Test effective privileges after the entire migration chain, not just immediately after the restrictive migration.

**Acceptance.** As a customer, changing read_at/dismissed_at must succeed; changing payload, URL, status, attempt count, audience, or recipient must fail. Use has_column_privilege plus real authenticated SQL/PostgREST tests after a clean reset and upgrade.

supabase/migrations/20260916002300_notification_inbox.sql:1–22

supabase/migrations/20260918000200_grant_postgrest_api_access.sql:42–49

### F12  Legacy token callbacks are not bound to a pending sign-in intent

MEDIUM  |  Conditional security risk; device verification required  |  Deep-link authentication

**Observed.** The callback screen accepts access_token and refresh_token from a URL and calls setSession. It does not itself verify a pending authorization intent or callback origin. Once this route is reachable, an attacker-controlled link carrying that attacker’s valid tokens could switch a victim into the attacker’s account. The present hidden-route problem complicates reachability; no device exploit was executed.

**Improve.** Prefer the existing PKCE code exchange and remove legacy implicit-token acceptance unless it is required. Bind callbacks to a short-lived pending intent and expected redirect shape. Validate provider/host/path, consume once, and prevent unsolicited links from replacing an existing session silently.

**Acceptance.** Open unsolicited, replayed, malformed, wrong-provider and wrong-origin links while signed out and signed in. They must not replace a session. Verify legitimate email confirmation, recovery, Google, and Apple flows independently.

apps/mobile/src/app/(tabs)/auth/callback.tsx:19–85

apps/mobile/src/lib/mobile-oauth.ts:20–52

04 / DETAILED FINDINGS

## Findings F13–F14


### F13  Live pickup commerce is intentionally not implemented

HIGH  |  Explicit feature gate, not a vulnerability  |  Square and Stripe production release

**Observed.** Both provider configuration factories reject APP_ENV=production. Square requires sandbox; Stripe requires a test secret. Client pickup discovery is also environment-gated. The check confirms both server guards. There is meaningful test-mode commerce code, but live ordering cannot be represented as available in this snapshot.

**Improve.** Choose a discovery/rewards-first launch with every ordering promise and entry point consistently hidden, or complete a separate live-commerce milestone. Preserve environment isolation and add audited live credentials, tax behavior, refunds, reconciliation, merchant onboarding and support before enabling it. Do not fix this merely by deleting the guards.

**Acceptance.** For a limited launch, production UI, deep links, APIs and store screenshots must not promise ordering. For a commerce launch, run an end-to-end provider-certified/sandbox suite and controlled live smoke tests with approved credentials.

supabase/functions/_shared/square-security.ts:133–170

supabase/functions/_shared/square-security.ts:192–223

apps/mobile/src/lib/square-commerce.ts:17–25

Executed evidence: R15. See reproduction register and companion harness.

### F14  Stripe dispatch unnecessarily requires Square configuration

MEDIUM  |  Confirmed provider-isolation defect  |  Stripe-only deployments and staging

**Observed.** The shared commerce handler constructs the Square runtime before choosing a provider. A valid Stripe configuration therefore still fails when Square’s sandbox configuration is incomplete. The reproduction validates the Stripe config first, then receives “Square Sandbox setup is pending” from the commerce handler.

**Improve.** Create a provider-neutral request/auth/database context. Determine and authorize the selected provider, then lazily initialize only its service. Keep provider-specific settings and maintenance dependencies separate.

**Acceptance.** With complete Stripe settings and no Square secrets, every supported Stripe operation should reach its Stripe handler. Repeat inversely for Square. Invalid provider requests must fail without touching either provider’s credentials or network.

supabase/functions/_shared/square-runtime.ts:1–24

supabase/functions/_shared/square-runtime.ts:117–142

Executed evidence: R14. See reproduction register and companion harness.

04 / DETAILED FINDINGS

## Findings F15–F16


### F15  Reward quotes offer discounts that checkout correctly rejects

MEDIUM  |  Confirmed quote/commit inconsistency  |  Pickup reward redemption

**Observed.** A reward configured for one variation falls back to another cart item when the configured item is absent. The reproduction configures coffee but quotes a discount on an entrée. Importantly, square_redeem_checkout_reward compares the selected variation to the configured one and raises REWARD_CHANGED. The final SQL guard prevents a completed wrong-item redemption; customers instead see an offer that cannot be checked out.

**Improve.** Use the same eligibility rules for quoting and reservation. If a configured variation is absent, return an explicit ineligible result with the required item. Decide whether an unbound “any item” reward is supported and represent that policy explicitly, rather than relying on null/fallback behavior.

**Acceptance.** For configured-item, any-item, percent and BOGO rewards, quote and commit must agree. Test missing items, modifiers, changed programs, stale prices and concurrent redemptions. Keep the existing transactional validation.

supabase/functions/_shared/pickup-operations.ts:201–311

supabase/migrations/20260920001400_checkout_rewards.sql:28–81

Executed evidence: R08. See reproduction register and companion harness.

### F16  “Free” rewards are clamped to a one-cent charge

MEDIUM  |  Confirmed checkout edge-case defect  |  Pickup totals; especially Stripe card payments

**Observed.** The reward discount is capped at subtotal minus one minor unit. A fully covered USD cart therefore still costs $0.01. The source reproduction reaches that result. This contradicts a free reward and falls below Stripe’s documented USD card-payment minimum of $0.50 for a nonzero charge, subject to its currency/payment-method rules. [S06]

**Improve.** Design zero-total redemption as a first-class order path, with atomic reward consumption and no fake card charge. For positive totals below a provider minimum, show a clear rule before checkout or apply an explicitly approved merchant policy. Never silently reduce an advertised discount just to create a payment.

**Acceptance.** Test total 0, 1, 49, 50 and 51 USD cents, multi-quantity carts, rounding, refunds and provider retries. A free reward must remain genuinely free and must not produce a payment API failure.

supabase/functions/_shared/pickup-operations.ts:289–311

supabase/functions/_shared/stripe-service.ts:562–599

Executed evidence: R16. See reproduction register and companion harness.

04 / DETAILED FINDINGS

## Findings F17–F18


### F17  Reward summaries silently truncate long transaction ledgers

MEDIUM  |  Confirmed aggregation design defect  |  Established loyalty customers; rewards previews

**Observed.** Two edge paths fetch ledger rows through PostgREST without pagination and sum the result in JavaScript. The local API configuration caps responses at 1,000 rows. In the mocked cap test, 1,001 transactions produce 1,000 available stamps instead of 990. SQL redemption computes the full ledger, so previews can disagree with commits; this is not proof of overspending.

**Improve.** Move balance calculation to an authorized SQL aggregate/RPC or maintained transactional balance with a reconciliation ledger. Do not fetch an unbounded financial/reward ledger to calculate one number. Use the same source of truth for customer display, staff preview and checkout eligibility.

**Acceptance.** Test 999, 1,000, 1,001 and 10,000 rows including reversals, redemptions and points. Compare every UI/API balance with the complete SQL aggregate and test concurrent actions.

supabase/functions/loyalty-transact/index.ts:93–129

supabase/functions/_shared/pickup-operations.ts:224–248

supabase/config.toml:1–10

Executed evidence: R09. See reproduction register and companion harness.

### F18  Out-of-app Stripe refunds and disputes are not synchronized

HIGH  |  Confirmed production feature gap  |  Commerce lifecycle and merchant operations

**Observed.** The Stripe webhook processes only checkout completed/expired and payment succeeded. The periodic selection covers checkout_pending and refund_pending, not settled orders. A refund or dispute initiated outside this app has no demonstrated handler that updates a completed order. In-app refund code exists; this finding concerns changes initiated through Stripe or banking channels.

**Improve.** Implement refund and dispute lifecycle handling with canonical provider retrieval, idempotency and connected-account verification. Track payment/refund/dispute state separately from kitchen/handoff state. Reconcile settled orders for a bounded period and define partial-refund and reward-restoration rules.

**Acceptance.** Create dashboard full/partial refunds and dispute lifecycle events for placed, ready and collected orders. The customer and merchant views must converge without reopening fulfilled orders or restoring a reward twice.

supabase/functions/stripe-webhook/index.ts:30–58

supabase/functions/_shared/stripe-service.ts:874–934

04 / DETAILED FINDINGS

## Findings F19–F20


### F19  Stripe tax behavior is a hardcoded zero rather than a merchant policy

MEDIUM  |  Confirmed commerce completeness gap  |  Live merchant pricing and receipts

**Observed.** Stripe quotes persist and return tax: 0. The source does not establish a complete tax-included or calculated-tax contract for live merchants. Zero tax can be correct for some sales, but it is not a general policy. This audit does not determine any merchant’s tax obligations.

**Improve.** Before live commerce, decide whether catalog prices include tax and where tax is calculated, displayed, reconciled and refunded. Make that contract explicit in merchant onboarding and checkout. Validate supported jurisdictions with qualified tax advice rather than inferring zero tax from the code.

**Acceptance.** Use merchant-approved taxable, exempt, tax-inclusive, discounted and partially refunded fixtures. Quote, checkout, provider receipt and accounting export totals must agree down to the minor unit.

supabase/functions/_shared/stripe-service.ts:568–600

supabase/functions/_shared/stripe-service.ts:741–810

### F20  Important routes are registered as non-navigable native tabs

HIGH  |  SDK-contract mismatch; native test required  |  iOS and Android links, invitations and notifications

**Observed.** Notification, business details, staff invitation, listing plans and auth callback routes are registered with NativeTabs.Trigger hidden. Expo documents that a hidden trigger cannot be navigated to. Push notifications still generate /notification URLs, and staff-invite redirects to /business. Some account flows already embed content as a workaround, so not every business screen is affected. [S04]

**Improve.** Move details, invitations, auth callbacks and notification destinations into a root Stack or nested stacks beneath stable visible tabs. Keep tabs for top-level destinations only. Wait for auth/mode hydration before mounting a mode-specific navigator, and persist drafts across deliberate mode changes.

**Acceptance.** In release builds open each route via cold start, warm deep link, push tap, back navigation and signed-out continuation. Test customer/business mode changes without losing drafts or landing on a hidden route.

apps/mobile/src/components/app-tabs.tsx:146–153

apps/mobile/src/components/root-navigator.tsx:1–22

supabase/migrations/20260916001800_notifications.sql:302–313

apps/mobile/src/app/(tabs)/staff-invite.tsx:60–68

Documentation cross-check: S04. See primary sources.

04 / DETAILED FINDINGS

## Findings F21–F22


### F21  Native event links and website association need completion

MEDIUM  |  Confirmed route gap; deployment configuration unverified  |  Universal Links / Android App Links

**Observed.** Android intent filters advertise /events links, but the mobile route tree has no matching event-slug route or native-intent rewrite. The web app does have the public event route. No Apple/Android association files are included in this repository; they may be hosted elsewhere, so their absence here is not proof that the live domain is broken.

**Improve.** Create an explicit public-link resolver with a stable event identifier or slug lookup, login continuation and browser fallback. Provision the domain association files on the actual public host, using release bundle/package IDs and Play App Signing fingerprints. Keep test and production hosts separate.

**Acceptance.** Run the existing staging-link verifier and native cold/warm-start tests for business, event and staff invite links. Test deleted/unpublished events, denied association, trailing slashes and guest access.

apps/mobile/app.config.ts:53–76

apps/web/src/app/events/[businessSlug]/[eventSlug]/page.tsx:1–35

### F22  Public URL validation is undone when the config value is assigned

MEDIUM  |  Confirmed configuration defect  |  Public sharing and associated domains

**Observed.** Configuration validates a host with fallback from share URL to site URL, but then assigns the original share URL to extra.siteUrl. A rejected localhost share URL can therefore win over the valid fallback. Empty strings have a similar nullish-coalescing issue. Bracketed IPv6 loopback also passes the current host filter.

**Improve.** Parse and normalize each candidate once; choose a validated HTTPS URL object and derive every host and URL field from it. Explicitly reject loopback/private development origins for preview/production. Fail the release configuration instead of emitting partially valid linking settings.

**Acceptance.** Table-test undefined, empty, localhost, IPv4/IPv6 loopback, malformed URLs, HTTP and valid HTTPS hosts. The selected URL and associated domains must always agree.

apps/mobile/app.config.ts:1–20

apps/mobile/app.config.ts:177–185

Executed evidence: R01, R02. See reproduction register and companion harness.

04 / DETAILED FINDINGS

## Findings F23–F24


### F23  Scheduled events can become public while their galleries remain hidden

MEDIUM  |  Confirmed RLS predicate mismatch  |  Public events and image galleries

**Observed.** The events read policy allows is_published or a publish_at timestamp that has passed. The event_photos read policy requires is_published. A scheduled event can therefore be visible while its gallery rows remain unreadable to customers. The event schema explicitly separates immediate publication from scheduled publication. This was established from effective policies, not a live database run.

**Improve.** Use one shared publication predicate for events and every dependent public resource, while preserving active-business, archive and moderation constraints. Avoid a separate scheduler merely to compensate for inconsistent read rules unless state materialization is an intentional design.

**Acceptance.** As anonymous customer and unrelated authenticated user, check event and gallery access before, at and after publish_at. Archived or moderated events must remain hidden. Owners should retain appropriate editing access.

supabase/migrations/20260915001600_scheduled_events_and_discovery.sql:1–35

supabase/migrations/20260916001900_event_media_and_recurring_reminders.sql:38–55

### F24  Apple token revocation and external deletion access are unfinished

MEDIUM  |  Confirmed source gap; external website unverified  |  Account deletion and store submission

**Observed.** In-app account deletion is implemented, including shared-ownership handling, cleanup jobs and a subscription warning. However, Apple sign-in does not retain/exchange the authorization code for a revocable provider token, and deletion has no Apple revocation step. Apple requires revocation for Sign in with Apple accounts. Google additionally requires a web-accessible deletion-request resource; deployment of that resource was not established. [S07, S08]

**Improve.** Add a secure server-side Apple token exchange/revocation lifecycle and retryable deletion orchestration. Provide a public deletion-request page identifying the app/developer, authentication steps, retained data and retention reasons. Keep deletion available without forcing subscription cancellation first.

**Acceptance.** Delete email, Google and Apple accounts; simulate provider/storage failure and shared business ownership. Verify revocation and retry behavior, accessible web requests, immediate deletion choice and clear billing consequences.

apps/mobile/src/lib/mobile-oauth.ts:56–77

supabase/functions/delete-account/index.ts:148–235

apps/mobile/src/components/account-data-panel.tsx:54–66

Documentation cross-check: S07, S08. See primary sources.

04 / DETAILED FINDINGS

## Findings F25–F26


### F25  Permissions exceed the simplest supported launch scope

HIGH  |  Store-review risk, not a predicted rejection  |  Especially Google Play; also Apple privacy review

**Observed.** Configuration enables background location on both platforms for optional nearby alerts, includes Contacts, and configures photo-library access. The repository does have nearby-alert opt-in logic; this is not a claim of covert tracking. However, optional convenience alerts may not justify background access as core functionality, and occasional business image uploads favor a system picker over broad photo access. [S09, S10]

**Improve.** For the first release, remove unused Contacts and obsolete biometric prompts. Prefer foreground/manual nearby discovery and system photo picking. Retain background access only with a defensible core use case, prominent disclosure, explicit consent, policy forms and device tests. Inspect the merged native manifests, not just app.config.

**Acceptance.** Install cleanly and exercise each permission flow: allow, deny, limited photos, approximate location, deny permanently and settings revocation. Core discovery must remain usable. Match all collected data and permissions to store disclosures.

apps/mobile/app.config.ts:96–141

Documentation cross-check: S09, S10. See primary sources.

### F26  Android Maps lacks demonstrated release-key configuration

MEDIUM  |  Configuration omission; installed-build verification required  |  Android map screens

**Observed.** The inspected Android config contains no Google Maps API key configuration, despite use of Expo Maps. There are no checked-in native Android files supplying an override. An external build mechanism could still inject it. Expo documents the Android key and signing restrictions, so this is a release configuration gate rather than a confirmed blank map on a device. [S11]

**Improve.** Add a release-appropriate Maps key through the supported Expo config path and restrict it to the app package and correct signing certificates. Distinguish local/debug, preview and Play App Signing certificates; rebuild after native configuration changes.

**Acceptance.** Test a Play-distributed build, not only Expo Go or a debug APK. Verify map tiles, markers, location denial, key restrictions and unavailable Google Play services behavior on representative Android hardware.

apps/mobile/app.config.ts:53–76

apps/mobile/app.config.ts:96–112

Documentation cross-check: S11. See primary sources.

04 / DETAILED FINDINGS

## Findings F27–F28


### F27  Legal and support access is conditional and too tied to the paywall

MEDIUM  |  Store-readiness / UX gap  |  Guests, customers and merchant subscribers

**Observed.** Terms/privacy URLs are optional environment values on listing-plans. Missing values produce a developer-facing “must be configured” notice rather than blocking a production build. The Account privacy/safety section focuses on blocked businesses; ordinary users need a durable privacy/support destination even without opening merchant billing. Public pages may exist elsewhere but were not verified.

**Improve.** Add a shared About, Privacy, Terms, Support and Delete account area available to guests and signed-in users. Validate production legal/support URLs during build and deployment. Fill store metadata from the same controlled configuration; do not ship placeholder instructions.

**Acceptance.** From a fresh guest install and each role, open policy/support pages without buying a plan. Verify URLs are public HTTPS, app-specific, readable on mobile, and still accessible when billing or authentication is unavailable.

apps/mobile/src/app/(tabs)/listing-plans.tsx:40–49

apps/mobile/src/app/(tabs)/listing-plans.tsx:239–268

apps/mobile/src/app/(tabs)/account.tsx:881–890

Documentation cross-check: S01. See primary sources.

### F28  Multi-to-single listing downgrade has no completed capacity workflow

MEDIUM  |  Explicitly documented unfinished feature  |  Merchant subscriptions with multiple listings

**Observed.** The documentation itself says a multi-listing downgrade needs a way for the owner to choose which listing remains active. The client permits plan changes, while backend entitlement changes update the limit without a complete documented over-capacity selection workflow for existing assignments. New-assignment checks are not a replacement for resolving already assigned listings.

**Improve.** Add an effective-date downgrade flow: choose retained listing, preview consequences, persist the choice, and apply it atomically when the new entitlement becomes effective. Keep draft data and provide a recoverable default when the owner does not respond. Never remove listings merely because a deferred change was scheduled.

**Acceptance.** With several active listings, schedule downgrade, cancel it, change retained choice, allow renewal and simulate missed events. Exactly the allowed listings remain public at the effective date; unrelated moderation decisions are preserved.

docs/business-listing-subscriptions.md:63–74

docs/business-listing-subscriptions.md:135–144

apps/mobile/src/providers/listing-billing-provider.tsx:184–209

supabase/migrations/20260920000100_business_listing_billing.sql:426–470

04 / DETAILED FINDINGS

## Findings F29–F30


### F29  CI validates web export, not native release or database behavior

HIGH  |  Validation coverage gap, not proof of a broken build  |  Android/iOS publishing and backend releases

**Observed.** CI already runs formatting, lint, typecheck, tests and build. However, mobile build is expo export --platform web, and the workflow does not build an AAB/iOS archive or execute the SQL regression suite. EAS production profiles exist, but a profile is not evidence of a successful native build. This environment could not install dependencies, so project test/typecheck results remain unknown.

**Improve.** Keep existing checks and add clean migration/SQL tests, edge-function checks, dependency/advisory scanning, Android release and iOS archive gates. Validate resolved config and actual generated manifests. Run release-device smoke tests against isolated staging and retain artifacts and logs.

**Acceptance.** A release candidate must have successful frozen-lockfile installation, pnpm validate, SQL authorization/regression tests, signed native artifacts and device results for the same commit. Verify target API, SDK versions, permissions, signing, native libraries and privacy manifests.

apps/mobile/package.json:75–87

.github/workflows/ci.yml:1–54

eas.json:1–25

Documentation cross-check: S02, S03, S12. See primary sources.

### F30  Discovery becomes incomplete and expensive as data grows

MEDIUM  |  Confirmed query limits; performance risk unmeasured  |  Customer discovery and Android responsiveness

**Observed.** Discovery loads active businesses in name order without pagination, then filters on the client. With the configured 1,000-row API ceiling, later businesses become undiscoverable through that fetched list. Active/upcoming stops have a separate global 100-row limit. Business cards are rendered through map in a ScrollView, so larger lists also create avoidable rendering work. No device performance benchmark was run.

**Improve.** Perform search, category, distance and availability filtering server-side with indexed queries and cursor pagination. Fetch stops for the relevant business/page or use a summarized availability view. Render cards with a virtualized list, preserve stable keys, and let secondary-data failures degrade independently.

**Acceptance.** Seed more than 1,000 businesses and 100 relevant stops. Search must find records outside the first alphabetic page. Measure cold load, scrolling, memory and stale-request behavior on a lower-memory Android device.

apps/mobile/src/app/(tabs)/explore.tsx:88–184

apps/mobile/src/app/(tabs)/explore.tsx:650–677

supabase/config.toml:1–10

04 / DETAILED FINDINGS

## Findings F31–F32


### F31  Large screens concentrate unrelated state and make regressions costly

MEDIUM  |  Maintainability / interaction-design concern  |  Business workspace, rewards and account flows

**Observed.** The business workspace is 5,638 lines, rewards screen 2,765, and public business page 2,013. These modules mix substantial rendering, form state and operations. Size alone does not prove a bug or poor appearance, but it makes permission, loading and error-state changes difficult to isolate. Existing reusable components and tests provide a base for incremental improvement.

**Improve.** Split by user task and ownership of state: business profile, media, staff, events, rewards and commerce. Put side effects in focused hooks/services; use explicit state machines for checkout, subscription synchronization and scanning. Extract incrementally under existing tests rather than rewriting the app.

**Acceptance.** Each feature section should be testable without mounting unrelated commerce or account flows. Verify draft persistence, independent loading/error states, keyboard handling, large text and accessibility labels after each extraction.

apps/mobile/src/components/business-workspace.tsx:1–90

apps/mobile/src/app/(tabs)/rewards.tsx:1–75

### F32  Shipping assets still use template branding

LOW  |  Confirmed asset / presentation gap  |  Store listing, installation and first launch

**Observed.** The supplied assets include Expo/React template graphics, and app config still points to the Expo icon bundle and template Android/splash assets. This is visible in the decoded asset contact sheet, not inferred from file names alone. It undermines product identity; template art by itself is not a guaranteed store rejection.

**Improve.** Replace the configured icon, adaptive foreground/background, monochrome icon and splash with a consistent SDSLocal identity. Remove unused template/demo art after confirming imports. Produce truthful store screenshots from the actual release build, including Android rather than reusing iOS-only captures.

**Acceptance.** Inspect installed launcher icons in light/dark and themed-icon modes, splash crop on different aspect ratios, iPad presentation and store screenshots. No Expo/React demo logo should appear in the user-facing release.

apps/mobile/app.config.ts:28–58

apps/mobile/app.config.ts:146–173

05 / WHAT EXISTS VS. WHAT REMAINS

## Feature completion: customer experience


“Implemented” means meaningful code exists, not that the feature passed device or production testing. “Not demonstrated” means the required deployment/behavior was not established from this snapshot.

| Feature | Source status | Completion work |
| --- | --- | --- |
| Discovery, map, filters | Implemented; scaling and Android-key gaps | Server pagination/search; reliable map configuration; independent secondary-data errors. F26/F30. |
| Events and calendar | Implemented; publication/link mismatch | Unify gallery visibility and event routing. Verify time zone, recurring reminders, cancellation and daylight-saving boundaries. F21/F23. |
| Follow and notifications | Implemented; delivery navigation/grants need work | Repair deep-link destinations and column permissions; test token rotation, opt-out and retries. F11/F20. |
| Rewards / QR scan | Implemented; preview authorization and balance issues | Authorize preview on the token’s business and aggregate full ledger. Test offline queue recovery and replay. F07/F17. |
| Public business web pages | Implemented | Verify deployed public host, association files, SEO metadata and signed-out continuation. F21/F22. |
| Sign-in / account deletion | Implemented; lifecycle gaps remain | Resolve token callback hardening, Apple revocation and external deletion access. F08/F12/F24. |
| Pickup shopping / guest orders | Substantial test-mode implementation | Live mode remains explicitly disabled. Finish totals/rewards and provider lifecycle before advertising it. F13–F19. |
| Reports / blocking | Implemented; operational readiness not established | Exercise reports and blocking end to end; assign moderation ownership and response targets. [S01] |

Evidence areas: apps/mobile/src/app/(tabs); apps/mobile/src/components/public-business-page.tsx; apps/mobile/src/providers/notification-provider.tsx; apps/web/src/app; supabase/functions/loyalty-transact; report/blocking migrations and moderation routes. Exact defect references appear in F01–F32.

05 / WHAT EXISTS VS. WHAT REMAINS

## Feature completion: merchants and operations


| Feature | Source status | Completion work |
| --- | --- | --- |
| Business setup / profile / media | Implemented | Repair media validation/preauthorization; stage quotas/TTL; keep edits as drafts until authorized publication. F09/F10. |
| Business subscription purchase | Implemented; high-impact state defects | Serialize account identity; correct lifecycle events, restore and uncertain-payment notices. F01–F06. |
| Listing capacity / downgrade | Partially complete; docs acknowledge gap | Owner selection and effective-date enforcement. F28. |
| Staff invitations / roles | Implemented; native route gap | Make invitation routes reachable; test revocation, expired invite, other-business staff and owner transfer. F20. |
| Menus, pickup slots and handoff | Implemented in test environments | Validate concurrency, stock/capacity, business time zone, price drift and pickup token expiry on devices. |
| Refunds and disputes | In-app test refund flow; external lifecycle incomplete | Add provider-initiated state changes, partial-refund rules and reconciliation for settled orders. F18. |
| Appointments / deposits | Described as a later phase | Keep out of current marketing unless intentionally added and tested. Do not confuse the Phase 2 work order with shipped behavior. |
| Moderation / maintenance jobs | Code and operational scripts exist; deployment unverified | Prove scheduled execution, failure alerts, retries, least-privilege operator access and a restore procedure. |
| Store packaging and policies | EAS profiles exist; submission evidence missing | Native artifacts, legal/support pages, permissions, privacy answers and review demo setup. F24–F29/F32. |

Planning evidence: docs/business-listing-subscriptions.md:63–74,135–144; docs/phase-2-square-appointments-work-order.md. Implementation evidence: business-workspace.tsx; square-service.ts; stripe-service.ts; square-maintenance and notification-dispatch entry points; eas.json. Older handoff documents should be updated where actual implementation has advanced.

06 / INTERACTION AND MAINTAINABILITY

## Design improvements that reduce failure


This is an interaction/structure review from source, not a visual usability test of a running app. The UI should be judged again on physical Android and iOS devices after native navigation is repaired.

| Area | Recommended design change | Acceptance signal |
| --- | --- | --- |
| Navigation | Stable top-level tabs; stack-based detail/auth/invite routes; explicit customer/business mode | No hidden destination, surprise mode redirect or lost form draft. F20. |
| Merchant workspace | Task-oriented sections: Profile, Events, Rewards, Staff and Orders; shared save/status pattern | A failed menu refresh does not block profile editing; unsaved changes are clear. F31. |
| Billing and orders | Distinct processing, paid/pending confirmation, failed and canceled states | Never claim “not charged” after successful checkout; disable duplicate submissions. F01/F04/F05. |
| Discovery cards | Prioritize name, category, distance, open/next-stop status and one primary action | Server search remains complete; card lists scroll smoothly with realistic data. F30. |
| Scanner | Large camera target; clear business identity; explicit success/duplicate/offline states | TalkBack/VoiceOver announces result; repeated camera detections do not repeat a transaction. |
| Accessibility | Meaningful labels, logical focus, sufficient contrast, large-text layouts and reduced motion | Test screen readers and large text, not only static contrast/unit fixtures. |
| Keyboard / forms | Scroll focused inputs above keyboard; preserve draft on interruptions; inline validation | Long names, pasted text, Android Back and keyboard dismissal do not lose data. |
| Privacy / support | One permanent account/help area for all roles, including guests | Policy, deletion guidance and support remain reachable without billing. F27. |

### What not to do

Do not replace the entire design system or rebuild every screen at once. Extract one business-workspace section at a time, preserve existing tests, and add a cross-platform fixture for each new state. Fix the navigation model and state ownership before styling around their failures.

Code anchors: F01/F04/F05/F20/F27/F30/F31. Existing UI, contrast, navigation and visual-fixture tests are listed in the companion inventory; they are useful foundations, not device-test substitutes.

06 / RELEASE IDENTITY

## Asset review


Decoded images from the uploaded archive. Several are unused template/support assets; the release concern is the subset still referenced by app.config.ts, especially icon, adaptive icon and splash. See F32.

Asset contact sheet: asset_contact_sheet.png (included in companion).

Replace configured template branding before collecting store screenshots. Verify iPad presentation because supportsTablet is enabled, and check Android themed/monochrome launcher icons. This page does not show a rendered SDSLocal application screen.

07 / COST-AWARE IMPROVEMENT PLAN

## Storage, data and operational reliability


The app already specifies useful image limits. Preserve them, then make the same contract authoritative on the server. Do not focus only on shrinking database columns while ignoring orphaned media, unbounded ledgers or repeated client downloads.

| Existing policy / area | Improvement |
| --- | --- |
| Photo variants: 320 / 800 / 1600 px; targets 60 / 150 / 400 KiB | Keep responsive variants and immutable cacheable paths. Validate decode/re-encode on the server; do not treat a small header as a real image. |
| Business storage target: 20 MiB; review threshold: 50 MiB | Measure published + staging + pending-delete bytes separately. Add per-account staging quotas and automatic expiry; test concurrent reservations. |
| Full transaction ledger | Aggregate balances in SQL; keep paginated history for display. Preserve auditability instead of silently dropping old transactions. F17. |
| Discovery and stop data | Index server-side filters and page results. Avoid re-fetching the entire directory and every business’s related state on each focus. F30. |
| Cleanup and scheduler reliability | Persist retryable jobs, inspect SDK error fields, alert on oldest pending job and repeated failures. Verify actual scheduled invocation. |
| Notifications | Track scheduled/sent/receipt-failed separately; rotate invalid tokens and protect server delivery fields. Test opt-out and account switch. |
| Logs and support | Use request, order and event IDs, not access tokens or live QR strings. Add a support export that excludes credentials. |
| Backups and recovery | Document restore and reconciliation order. Test restoring an isolated backup without replaying live notifications or payments. |

Image policy source: packages/image-processing-config/src/index.ts:1–34. Limits are repository targets, not measured monthly cost or guaranteed output sizes. No cloud usage, pricing estimate or live data volume was supplied.

08 / APPLE • POLICY CHECKED 21 SEP 2026

## App Store submission gates


These are release gates, not predictions of rejection. Code findings and store-console requirements must both be closed. The minimum build SDK is separate from the minimum iOS version supported by the app.

| Gate | Current evidence / required action |
| --- | --- |
| Build toolchain [S02] | Uploads require Xcode 26+ and an iOS/iPadOS 26 SDK+ since 28 Apr 2026. Verify the actual archive and build image; the ZIP contains no finished archive. |
| Working review journey [S01] | Provide functioning backend access and demo instructions for customer, business and QR/staff workflows. Repair hidden routes, billing recovery and broken links first. |
| Privacy / SDK declarations [S01, S02] | Publish an in-app and metadata privacy policy. Audit native SDK privacy manifests and required-reason APIs in the built archive; inventory real data collection and sharing. |
| Deletion / Apple sign-in [S07] | In-app deletion exists. Complete Apple token revocation and retryable provider cleanup; retain the existing subscription warning and immediate-deletion option. |
| Subscription readiness | Verify real products, prices, entitlement mapping, restore, manage, grace, pause, refunds and deferred changes. Resolve F01–F06/F28 before selling listing access. |
| UGC and business content [S01] | Reports/blocking code exists. Prove filtering, moderation response, contact information and abusive-content handling as an operating process. |
| Permission scope | Remove unused access and inaccurate purpose strings. Explain retained location/camera/photo use at the moment it is needed. F25. |
| Metadata and presentation [S02] | Complete the current age-rating questionnaire; replace template assets and publish accurate screenshots. Test tablet layouts because supportsTablet is enabled. |

### Payment classification must remain explicit

Review listing subscriptions separately from physical pickup orders. Keep the store-billed digital listing flow distinct from the merchant checkout flow; confirm the policies and any applicable storefront/program exceptions for the exact distribution plan rather than using one payment rule for both. [S01]

Not verified: App Store Connect agreements, tax/banking setup, product approval, signing certificates, review account, entitlement settings, live privacy URLs and the completed archive.

08 / ANDROID • POLICY CHECKED 21 SEP 2026

## Google Play submission gates


| Gate | Current evidence / required action |
| --- | --- |
| Target SDK [S03] | New phone/tablet apps and updates must target Android 16 / API 36+ from 31 Aug 2026. Check the actual AAB; do not infer the final target from a JS dependency version. |
| Native compatibility [S12] | Inspect every shipped native library for 16 KiB page-size support and test the relevant emulator/device configuration. This was not established by web export. |
| Background location [S09] | Enabled in config for optional nearby alerts. Remove for a simpler launch or document a justified core use case, disclosure, consent and the Play declaration/review evidence. |
| Photo / Contacts access [S10] | Prefer system picking for occasional uploads, remove unused Contacts, and inspect the merged manifest for broad permissions introduced by plugins. |
| Data safety / privacy | Reconcile store answers with the actual backend, SDKs, location, photos, account information and deletion behavior. Keep privacy/support URLs reachable from the app. |
| Deletion resource [S08] | Supply a web resource that lets users request deletion without reinstalling the app, with clear app identity and retention handling. It need not be a fully automated public delete API. |
| Android services | Verify Maps key restrictions, Play App Signing identity, Google OAuth client IDs, notification channels and store subscription management on a Play build. F06/F26. |
| New personal account testing [S13] | For personal accounts created after 13 Nov 2023: at least 12 opted-in closed testers for 14 continuous days before applying for production access. Applicability depends on the developer account. |
| Distribution truthfulness | Hide unfinished ordering consistently or finish it. Store screenshots and descriptions must match the submitted release, not development/test-mode capabilities. |

Not verified: Play developer account type, testing history, app-signing certificate, policy declarations, pre-launch report, financial profile, installed release behavior or final AAB metadata.

09 / RELEASE-CANDIDATE ACCEPTANCE

## Android-first device test matrix


Use a Play-distributed internal/closed-test build with production-equivalent signing and isolated staging services. Add an older supported Android version, a current API 36 device/emulator, and a lower-memory physical device. Retain iOS and iPad coverage; do not let Android become the only tested platform.

| Scenario | Required result / evidence |
| --- | --- |
| Install / cold launch | Correct icon/splash; no startup exception; legal/help access without account. Test fresh and upgraded installs. |
| Auth and account switch | Email, Google and supported Apple flow work; stale callbacks and account-A responses cannot replace B. Exercise secure-store failure. |
| App Links and push taps | Business, event, invite and notification routes open from killed/background/foreground states; proper back stack and signed-out continuation. |
| Maps / location | Tiles and markers render with Play signing. Denied/approximate/offline location has a usable fallback. Test disabled Google Play services where relevant. |
| Photos / camera / QR | System picker, limited access, camera denial, HEIC/large images, QR refresh, duplicate detections and expired QR are handled. |
| Subscriptions | Purchase, cancel, pending confirmation, restore, grace, scheduled pause, multi downgrade, account switch and manage all pass store sandbox tests. |
| Notifications / nearby alerts | Permission denial, token rotation, opt-out, app kill, battery saving and time-zone changes do not produce cross-account or duplicate delivery. |
| Commerce (only when enabled) | Quote expiry, minimum/zero total, double tap, app kill during checkout, capacity race, refunds, disputes and pickup handoff converge correctly. |
| Back / keyboard / text size | Predictable Back behavior, accessible focus, keyboard-safe inputs, large text and screen-reader result announcements. |
| Performance and lifecycle | Use >1,000 businesses and long reward ledgers. Record startup, scrolling, memory and resumed state after process death. |
| Deletion | Deletion succeeds with interrupted network and retries; shared businesses retained correctly; notifications and credentials cleared; Apple revocation verified. |

For every row record commit, build ID, OS/device, role, network state, reproduction steps, expected/actual result and evidence. A successful simulator session is useful but does not replace signed-distribution and real-device tests.

09 / REGRESSION SUITE ADDITIONS

## Backend authorization and lifecycle tests


Run these against an isolated Supabase database after every migration, then against an upgrade fixture. Use real authenticated roles/JWT claims. Mocked edge checks cannot validate PostgreSQL grants, RLS execution, locks or transaction rollback.

| Test area | Minimum cases |
| --- | --- |
| Role matrix | Anonymous, customer A/B, owner A/B, active staff, inactive staff, cross-business manager, platform moderator and service role. |
| Loyalty preview / mutations | Missing/wrong business ID; QR for another customer/business; expired/replayed token; denied preview before profile access; award/redemption idempotency. F07. |
| Grant regression | Only read_at/dismissed_at client updates permitted; server-owned notification fields denied after all migrations. F11. |
| Reward accounting | Full-ledger aggregate; points/stamps/reversals; quote/commit eligibility equality; simultaneous redemptions and rollback. F15–F17. |
| Publication policies | Scheduled event plus gallery before/after publish time; archived business/event and moderation states; anonymous vs owner access. F23. |
| Media | Actor/target mismatch, quota race, invalid image, cleanup failure, orphaned staging and interrupted finalization. F09/F10. |
| Billing events | Duplicate event, old event after newer renewal, pause, grace, transfer, refund, missed event, deleted account and over-capacity downgrade. F02/F03/F28. |
| Pickup concurrency | Same quote submitted twice, slot-capacity contention, expired checkout, wrong guest token, cross-account order, revoked staff and duplicate pickup scan. |
| Provider webhooks | Bad signature, wrong account, wrong currency/total, canonical retrieval failure, duplicate and delayed delivery; dashboard refund/dispute. F18. |
| Deletion / cleanup | Sole owner vs shared business, pending billing, provider revoke failure, storage failure, job retry and deletion replay without side effects. |

Preserve existing transactional safeguards. Do not weaken a SQL validation because a client quote is wrong; repair the quote and add an equality test for the two contracts.

10 / ACTION PLAN

## Remediation sequence and release decisions


| Milestone | Work package | Exit condition |
| --- | --- | --- |
| 1. Contain correctness/security defects | F07 preview authorization; F01 account race; F08 secure storage; F11 column grants; F09 preauthorization/validation | Regression cases pass; no private preview without authorization; no stale SDK identity or plaintext downgrade. |
| 2. Make native journeys reliable | F20/F21 navigation; F22 URLs; F06 Android manage; F26 Maps; F23 galleries | Signed iOS/Android cold/warm links, notifications, invitations and maps pass the matrix. |
| 3. Finish paid listing lifecycle | F02/F03 lifecycle reconciliation; F04/F05 messaging/restore; F28 downgrade | Store sandbox lifecycle plus SQL ordering/over-capacity tests pass; operational reconciliation is deployed. |
| 4. Prepare a limited release | F24/F25/F27 deletion/permissions/policies; F29 CI/native gates; F32 branding; moderation operations | Discovery/rewards scope is complete, demoable and accurately represented. No live-commerce promises. |
| 5. Finish commerce separately | F13/F14 provider rollout; F15–F19 reward/totals/refund/tax contracts | Live-provider readiness checklist is approved; sandbox and controlled live smoke evidence retained. |
| 6. Scale and simplify | F10 storage controls; F17/F30 query scaling; F31 incremental screen extraction | Measured device/data performance; bounded storage; independent feature tests and reliable cleanup. |

### How to hand this to a coding agent

Use findings.json as the backlog. Ask for small, independently reviewable changes with tests for one failure mode at a time. Require a forward SQL migration rather than rewriting applied migrations. Keep the original source snapshot and report references fixed, and attach test results to each closed finding.

Do not accept “fixed” based only on code generation, a passing web export or a mock harness that no longer reaches the path. Native issues require device evidence; SQL issues require database execution; provider issues require sandbox integration. The final acceptance column is the completion contract.

11 / ACTUAL SOURCE WITH ISOLATED DEPENDENCIES

## Executed reproductions 1–8


All checks below executed code from the uploaded source, transpiled in memory. React, native SDKs, Supabase responses and Deno interfaces were mocked. “Reproduced” means the described behavior was observed—not that the application passed its test suite.

| Check | Observed result | Status |
| --- | --- | --- |
| R01 | Valid site fallback + localhost share URL emits localhost in extra.siteUrl. | Reproduced |
| R02 | Bracketed IPv6 loopback is emitted as an associated domain. | Reproduced |
| R03 | SecureStore exception writes a synthetic auth token to plaintext adapter. | Reproduced |
| R04 | Scheduled subscription pause is parsed as immediately paused. | Reproduced |
| R05 | Future grace deadline is ignored; expired paid-period end is stored. | Reproduced |
| R06 | 30-byte header with no pixel payload passes WebP dimensions helper. | Reproduced |
| R07 | Nonstaff authenticated caller receives customer preview when business ID is omitted. | Reproduced |
| R08 | Coffee reward quote selects entrée; downstream SQL mismatch guard was separately inspected. | Reproduced |

### Reproduction limits

R06 validates the helper, not a complete storage deployment. R07 uses synthetic actors and a locally signed short-lived token, not a real customer. R09 simulates the configured PostgREST response cap. R08 does not demonstrate a completed wrong-item redemption; the SQL guard rejects it. R15 confirms an intentional feature gate, not an exploit. Native SDK behavior and real database transactions remain untested.

Companion: repro/source-checks.cjs and repro/results.json. Test fixtures contain synthetic values only. Node 22.16.0 / TypeScript 5.8.3 were used here; rerun under the project’s Node 24 environment before adopting the checks into CI.

11 / ACTUAL SOURCE WITH ISOLATED DEPENDENCIES

## Executed reproductions 9–16


All checks below executed code from the uploaded source, transpiled in memory. React, native SDKs, Supabase responses and Deno interfaces were mocked. “Reproduced” means the described behavior was observed—not that the application passed its test suite.

| Check | Observed result | Status |
| --- | --- | --- |
| R09 | Mocked 1,000-row cap yields 1,000 stamps instead of complete-ledger 990. | Reproduced |
| R10 | Restore returns false and a no-plan message while final summary is active. | Reproduced |
| R11 | Successful mocked checkout + RPC exception yields “Nothing was charged”. | Reproduced |
| R12 | Late canceled account-A initialization changes SDK identity after account B. | Reproduced |
| R13 | Android manage opens no URL when managementURL is absent. | Reproduced |
| R14 | Valid Stripe config still receives a Square configuration error from dispatch. | Reproduced |
| R15 | Square and Stripe factories both reject production mode explicitly. | Reproduced |
| R16 | Eligible free coffee reward discounts 299 of 300 cents, leaving a 1-cent total. | Reproduced |

### Reproduction limits

R06 validates the helper, not a complete storage deployment. R07 uses synthetic actors and a locally signed short-lived token, not a real customer. R09 simulates the configured PostgREST response cap. R08 does not demonstrate a completed wrong-item redemption; the SQL guard rejects it. R15 confirms an intentional feature gate, not an exploit. Native SDK behavior and real database transactions remain untested.

Companion: repro/source-checks.cjs and repro/results.json. Test fixtures contain synthetic values only. Node 22.16.0 / TypeScript 5.8.3 were used here; rerun under the project’s Node 24 environment before adopting the checks into CI.

12 / DEVELOPER HANDOFF

## Build verification and unresolved evidence


Run the project’s existing validation first in a network-enabled development/CI environment. The following are repository commands, not claims that they were executed successfully in this audit.

pnpm install --frozen-lockfile

pnpm validate

pnpm db:start

pnpm db:lint

pnpm verify:staging-links

Use Node 24 and the pinned pnpm version. Configure isolated staging URLs before link checks. A database reset is destructive to the selected local database; use pnpm db:reset only on a disposable local environment. Execute all supplied SQL regression files using the repository’s test setup and fail the job on the first SQL error.

### Additional release jobs

Generate and inspect resolved Expo config; validate dependencies with Expo’s supported checks; build an Android release AAB and iOS archive using the appropriate EAS profiles or native toolchains; run policy and artifact checks against those outputs. Add dependency advisories/SBOM and secret scanning over Git history. The limited pattern/parser scan here is not a replacement.

### Known unknowns that must become evidence

| Unknown | Evidence needed |
| --- | --- |
| Installed dependency/build health | Frozen install, pnpm validate logs, native compilation and dependency advisory results |
| Database deployment | Migration status, effective grants/RLS tests, functions deployed and rollback/restore test |
| Provider setup | Store products and identities; RevenueCat webhooks; merchant test/live account configuration |
| Scheduled jobs | Invocation schedule, permissions, failure/lag alerts and replay procedure |
| Web and linking | Public privacy/terms/support/deletion pages, association files and release fingerprints |
| Native privacy/permissions | Merged manifests, SDK privacy manifests, required-reason APIs and device permission behavior |
| Review/account prerequisites | Store agreements, reviewer demo, ratings, Play account testing eligibility and screenshots |

Companion inventory lists every source file with SHA-256. No application source was changed, deployed or sent to third-party scanning services. No real credentials, payment requests or production data were used in the local reproductions.

13 / OFFICIAL DOCUMENTATION

## Primary references 1–7


Checked 21 September 2026. References support external SDK/policy statements; code findings are tied to the uploaded archive and the exact file/line references printed with each finding. Requirements can change before submission.

#### S01  Apple — App Review Guidelines

Completeness, review access, privacy, user-generated content and payment-policy review.

https://developer.apple.com/app-store/review/guidelines/

#### S02  Apple — Upcoming Requirements

Xcode/iOS SDK upload requirements, updated age rating questions and required-reason APIs.

https://developer.apple.com/news/upcoming-requirements/

#### S03  Google Play — Target API level requirements

API 36 requirement for new phone/tablet apps and updates from 31 Aug 2026.

https://support.google.com/googleplay/android-developer/answer/11926878

#### S04  Expo — Native tabs

Hidden trigger navigation restriction and changing tab visibility; SDK 54–57 examples.

https://docs.expo.dev/router/advanced/native-tabs/

#### S05  RevenueCat — Event Types and Fields

Scheduled pause semantics, grace expiration field and transfer event shape.

https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields

#### S06  Stripe — Supported currencies

Minimum nonzero charge rules, including the USD card-payment example.

https://docs.stripe.com/currencies

#### S07  Apple — Offering account deletion in your app

Apple token revocation, subscription warning and account deletion expectations.

https://developer.apple.com/support/offering-account-deletion-in-your-app/

13 / OFFICIAL DOCUMENTATION

## Primary references 8–13


Checked 21 September 2026. References support external SDK/policy statements; code findings are tied to the uploaded archive and the exact file/line references printed with each finding. Requirements can change before submission.

#### S08  Google Play — Account deletion requirements

In-app and external web request access; retained data disclosures.

https://support.google.com/googleplay/android-developer/answer/13327111

#### S09  Google Play — Background location permissions

Core use case, disclosure, consent and review requirements.

https://support.google.com/googleplay/android-developer/answer/9799150

#### S10  Google Play — Restricted permissions and minimum-scope alternatives

Photo/video permission scope and system-picker alternatives.

https://support.google.com/googleplay/android-developer/answer/16935362

#### S11  Expo SDK 57 — Maps

Android Maps API key and package/signing-certificate configuration.

https://docs.expo.dev/versions/v57.0.0/sdk/maps/

#### S12  Android — Support 16 KB page sizes

Native-library compatibility and testing guidance.

https://developer.android.com/guide/practices/page-sizes

#### S13  Google Play — Testing requirements for new personal accounts

Conditional 12-tester/14-day closed-test requirement.

https://support.google.com/googleplay/android-developer/answer/14151465

### Evidence package

The companion includes the full file manifest, structured findings, source excerpts, static scan outputs, SQL index, reproduction harness/results, Markdown report and asset contact sheet. It does not contain an altered or incomplete replacement for the application source; retain the original ZIP as the canonical snapshot.

Close findings only after the relevant acceptance tests pass in the proper environment. Full archive access makes this review materially broader than the earlier partial report, but no static audit can establish production behavior, third-party setup or store approval by itself.
