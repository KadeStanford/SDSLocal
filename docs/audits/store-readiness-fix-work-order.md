# Parish Pass store-readiness developer work order

Prepared September 30, 2026, America/Chicago, from the [approval-readiness audit](F:/BusinessApp/docs/audits/store-approval-readiness-2026-09-30.md). This is an implementation plan for the assigned developer agent. Creating this plan does not start implementation or change external systems.

## Objective and scope

Fix the 25 audit findings while preserving the full product. Keep Essentials, Growth and Pro; three-business coverage; customer discovery; reviews/events/requests; rewards and staff scanning; pickup ordering; appointment booking and deposits; the existing Square/Stripe pickup integrations and Square appointment payments; and background nearby alerts. Implement the promised functionality and its policy requirements. Removing unused permissions or obsolete development copy is cleanup, with existing user workflows preserved.

The final outcome is a functional production candidate with truthful offers, enforced access, complete privacy/safety/deletion behavior, documented native acceptance, accurate store materials and Google's testing eligibility. Store approval itself depends on review; a developer cannot guarantee it.

## Instructions for the assigned agent

1. Read root and applicable nested `AGENTS.md`, the audit, its four evidence companions, and relevant feature documentation. Recheck current implementation: the audit describes a dirty working-tree snapshot, not a committed release. Preserve existing work; inspect changes before editing. Use additive migrations rather than rewriting applied migrations.
2. Before mobile code changes, read the exact [Expo SDK 57 documentation](https://docs.expo.dev/versions/v57.0.0/). Before web changes, read the applicable installed Next.js guides required by `apps/web/AGENTS.md`. Recheck the audit's current official policy/vendor references when implementing their requirements.
3. Follow [the Metro LAN guard](F:/BusinessApp/docs/metro-lan-only.md): use `scripts/start-local.ps1`, active LAN IPv4, verified manifest URLs and Compose Watch. Never advertise a loopback address to a phone.
4. Use local Supabase/Inbucket and disposable local fixtures first. Preserve the documented staging merchant allowlists. Production support needs explicit environment isolation; changing the app's environment to staging is not production support.
5. Keep a finding ledger with **open / implemented / locally verified / externally verified / blocked**, file references, test results and outstanding inputs. A unit test does not close a native or hosted verification gap. Record partial progress accurately and continue independent work when an external input is missing.
6. Keep secrets server-side and out of source, public app variables, logs and handoff messages. Prepare deployment, provider and store changes as concrete reviewable steps. Existing production/staging deployments, OTA publication, store mutations, release submission, real purchases, destructive hosted deletion and real notification/email delivery need the appropriate explicit execution authorization. This planning request does not authorize those actions.
7. For an authorized staging email delivery test, use only `kade20413+<unique-test-alias>@gmail.com`. Never use a fabricated hosted recipient or a substitute mailbox. Stripe payment testing uses sandbox/test keys and simulated payment methods, following [Stripe's testing rules](https://docs.stripe.com/testing).

## Work packages and acceptance criteria

Execute W01 and W02 first. W03–W07 can then be developed in a practical sequence by the assigned agent; their shared schema/configuration decisions must remain consistent. W08 verifies their combined result. Prepare W09 materials during implementation, but finalize them against W08's exact candidate. W10 starts as soon as the closed-test prerequisites and a working candidate are satisfied.

### W01 — Enforce paid tiers and complete subscription lifecycle

**Findings:** F05, F07. **Ownership:** subscription catalog/business logic, subscription SQL/RPCs, RevenueCat webhook/helpers, mobile billing provider/paywall and all feature entry points that require entitlements.

Start with [the feature catalog](F:/BusinessApp/packages/business-logic/src/business-subscriptions.ts), [the catalog migration](F:/BusinessApp/supabase/migrations/20260929000200_feature_subscription_catalog.sql), [the billing provider](F:/BusinessApp/apps/mobile/src/providers/listing-billing-provider.tsx) and [subscription setup notes](F:/BusinessApp/docs/business-subscription-store-setup.md).

- Write the complete operation-to-feature matrix from the existing catalog. Preserve each tier's three-business limit and established legacy allowances. Include owner tools, staff operations, follower sends, loyalty operations, pickup configuration/transactions and booking configuration/transactions; discovery/read access and existing transaction obligations need deliberate treatment when an entitlement expires.
- Make the server authoritative. Enforce capability and membership checks at every relevant edge-function action, RPC and direct-table write boundary. A UI gate alone is insufficient. Use the same effective-entitlement calculation for UI visibility/disabled states and server decisions.
- Define upgrade/downgrade timing, paid-period access after cancellation, grace, account hold/retry, pause/resume, expiration, refund/revocation and business-slot rules. Apply feature restrictions at the appropriate effective time without stranding active orders, appointments, support or cancellation access.
- Preserve localized storefront pricing, free customer access, restore/manage links, pending confirmation and identity/account-switch safeguards. Validate store products and RevenueCat mappings in each environment; establish production webhook configuration, including Apple's currently empty Production Server URL.
- Google currently has three active US monthly plans, 7-day grace, automatic 53-day account hold, pause and resubscribe enabled, and RTDN configured. Validate delivery and resulting entitlements rather than assuming configuration proves delivery. Existing parser support for grace/scheduled pause should be extended only where evidence shows a gap.

**Done when:** direct API attempts cannot bypass tier/slot/membership restrictions; every valid tier delivers its promised features; lifecycle and identity cases pass meaningful regression tests and later native/store sandbox acceptance. Keep production activation off until its configuration and behavior are verified.

### W02 — Finish production pickup and appointment commerce

**Findings:** F06, F21. **Ownership:** mobile commerce adapters/checkout/booking/merchant setup; Supabase commerce/security/routing/provider helpers and functions; order/appointment schemas, jobs, webhooks and callback hosting.

Start with [Square commerce](F:/BusinessApp/docs/square-commerce.md), [Stripe commerce](F:/BusinessApp/docs/stripe-commerce.md), [the appointment work order](F:/BusinessApp/docs/phase-2-square-appointments-work-order.md), [Square security](F:/BusinessApp/supabase/functions/_shared/square-security.ts), [pickup client](F:/BusinessApp/apps/mobile/src/lib/square-commerce.ts) and [appointment client](F:/BusinessApp/apps/mobile/src/lib/appointment-commerce.ts).

Those earlier phase documents describe the sandbox pilot and its architecture. This work order plans production support for those existing integrations. Preserve the platform-owned scheduling engine and Square appointment payment integration; adding a Square Appointments dependency or a new booking processor is outside these fixes. Preserve their safety boundaries while implementing isolated production support.

- Replace the blanket production rejection with properly isolated development, staging and production configuration. Validate provider hosts, key types, event environments, callbacks and connection identities. Keep sandbox credentials and merchant connections out of production. Retain encrypted tokens, tenant checks, signature verification, idempotency and recovery.
- Complete production merchant connection/onboarding, verification/readiness, location/menu/service/resource synchronization and reconnect/disconnect behavior for the existing providers. Preserve the current direct-charge/fee model unless the product owner explicitly changes it.
- Finish pickups: server quotes and stock/slot revalidation, options/rewards, checkout, authentication/return, pending/failed/cancelled payments, paid confirmation, staff fulfillment, item/full refunds, disputes and reconciliation.
- Finish appointments: services/resources/staff/availability, concurrent slot protection, contact/guest access, deposits, paid confirmation, reschedule/cancel, refunds and reconciliation. Preserve guest proof isolation and access to existing transactions.
- Pro entitlements control the appropriate merchant capabilities through W01. Customer payments for physical goods/real-world services remain separate from owner digital subscriptions.

**Done when:** the full provider sandbox matrix passes, retries/duplicate callbacks cannot duplicate charges or bookings, cross-business/customer access is rejected, and the production candidate has verified live configuration/readiness. Later genuine transactions require separate authorization and processor-compliant use; do not test Stripe live mode using real payment details.

### W03 — Complete UGC acceptance, blocking and moderation

**Findings:** F10–F12, F19. **Ownership:** auth/onboarding and UGC write paths; customer safety/reports/reviews; upload finalization; business/content SQL; web admin moderation; community/merchant policies.

- Implement versioned terms/community-policy acceptance before first UGC submission for password, OTP, Apple, Google and existing-user paths. Record acceptance and enforce it server-side for all relevant content writes/uploads. Account deletion and ordinary discovery remain accessible.
- Add privacy-preserving report-user/block-user controls, retaining existing business blocking. Define and enforce effects for public reviews/replies, requests and new interactions/notifications while preserving necessary transaction/support records.
- Cover business listings and edits, photos, offerings, events, updates, reviews and replies with appropriate preventive filtering or a prepublication review queue. Existing file validation and initial business approval do not cover subsequent objectionable content. Provide moderator removal/sanction/appeal tools and update public/cached views after action.
- Define merchant prohibited/regulated categories, enforcement rules and promotion terms. Derive age/target-audience answers from accessible content. Use safe synthetic fixtures for negative tests; never upload illegal material.
- Document a real moderation/support owner, response targets, escalation and audit records. The agent can build tooling and draft procedures; an operating human team must be identified before readiness is claimed.

**Done when:** unaccepted accounts cannot submit via direct APIs; individual blocking works across relevant surfaces; all content types have effective prevention/report/removal coverage; safe fixtures demonstrate removal and isolation; operations and age/content policies match actual behavior.

### W04 — Finish Apple revocation and complete account erasure

**Findings:** F13–F15. **Ownership:** native OAuth/linking, secure server auth token handling, deletion endpoint/migrations/jobs, processor erasure, device storage cleanup and account-data UI.

Start with [mobile OAuth](F:/BusinessApp/apps/mobile/src/lib/mobile-oauth.ts), [deletion function](F:/BusinessApp/supabase/functions/delete-account/index.ts), [account-data UI](F:/BusinessApp/apps/mobile/src/components/account-data-panel.tsx) and [deletion SQL](F:/BusinessApp/supabase/migrations/20260919000200_account_deletion.sql).

- Implement a secure Apple authorization-code exchange, encrypted server token storage, revoke-on-deletion and credential-revocation handling. Validate identity/audience/account binding. Follow Apple's TN3194 legacy-token guidance while fulfilling deletion for existing users; provide manual revocation guidance where required.
- Build a record-by-record deletion matrix: auth/profile, sole/shared business ownership, memberships, uploads, reviews/free text, requests/events/rewards, notifications, analytics, deletion jobs, commerce records, provider identities and device keys. Define delete/anonymize/legitimate retention, purpose, deadline and responsible job/process for each.
- Verify existing order/appointment anonymization and shared-owner transfer rather than indiscriminately deleting legal transaction/shared-business records. Implement any missing processor erasure process, including RevenueCat where applicable. Store subscription cancellation remains a separate, accessible action.
- Clear applicable analytics identifiers, guest/order/appointment proofs and other local keys on deletion. Resolve dependencies safely for active transactions. Define retry/completion/expiry and monitoring for media, processor and revocation jobs.
- Handle `cleanupPending` in the UI: distinguish removed account access from pending erasure and give accurate completion/support guidance. Ensure the external email request process leads to the same documented outcome.

**Done when:** disposable local fixtures for each ownership/role/transaction case produce the documented database/storage/device result, retries recover from failure, and user messaging is accurate. Hosted destructive/Apple-linked/provider acceptance requires expressly scoped disposable-account authorization; never test by deleting a real user.

### W05 — Reconcile privacy, support and actual data disclosures

**Findings:** F08, F09. **Ownership:** guest/customer account navigation, public policy/help pages, analytics/consent controls, SDK inventory and store disclosure drafts.

- Add reachable privacy, terms, support and deletion-help links for signed-out customers, customers, owners and staff. Keep them independent of subscription purchase.
- Inventory actual app and enabled SDK collection: auth/contact identifiers, public/private UGC, order/booking details, purchases, push tokens, analytics visitor UUID/events, location/map processing, updates/error/network data and provider records.
- Record purpose, off-device destination, identity linkage, sharing/service-provider relationship, optionality, retention, erasure and any required consent/withdrawal. Inspect configured SDK behavior and privacy reports; neither a permission nor a vendor's optional manifest field alone proves collection.
- Update the policy with actual analytics identifier/retention and erasure specifics. Draft Apple App Privacy and Google Data safety answers, including the designated external deletion resource, against the final behavior. Reconcile any new moderation service with this inventory.

**Done when:** every role can reach working policy/support pages; policy, consent, privacy manifests and proposed store answers agree with observed data behavior and W04's retention matrix. Final store answers require the final candidate and production evidence.

### W06 — Correct permissions and retain compliant nearby alerts

**Findings:** F16–F18. **Ownership:** Expo native plugins/configuration, photo/scanner flows, nearby-alert provider/task implementation, permission messaging and declaration/video drafts.

- Preserve photo uploads through the system picker and camera reward/pickup scanning. Remove unnecessary broad photo access and unused contacts/calendar/biometric/motion/reminder/overlay capabilities after checking actual consumers and platform fallback needs. Do not break a working feature to make the manifest smaller.
- Correct Parish Pass purpose strings to describe actual selection, scanning and location use. Verify merged manifest/plist output, not only configuration input. Determine whether any location FGS declaration is genuinely required by the implemented background task; remove unused service configuration only if alerts remain correct.
- Retain background nearby alerts. Validate disclosure/consent, minimum scope, enable/deny/disable/revoke behavior, geofence limits, reboot/app-closed behavior, timing, follow/block changes and deletion cleanup. Preserve usable manual/foreground discovery when permission is denied.
- Prepare a truthful core-benefit explanation, prominent listing description, Google location/FGS declarations where applicable and a real device demonstration video. Implement policy-compliant behavior; do not invent a use case. Reviewer acceptance remains an external gate. If the use case is rejected, report that decision for product direction rather than silently reducing scope.

**Done when:** fresh native artifacts contain only justified permissions, all existing upload/scan/alert workflows work on supported OS versions, denied/limited/revoked cases pass, and declaration evidence accurately demonstrates the retained feature. These changes require new native builds.

### W07 — Harden release configuration, links, updates and production copy

**Findings:** F20, F21, F25. **Ownership:** Expo/EAS config, environment validation, Supabase initialization, share/deep-link/auth return handling, association hosting and development-only copy.

- Validate required public production configuration at build/release time; eliminate production fallback to local placeholders. Keep development/staging/production backends, provider keys and update channels isolated.
- Align the native marketing version with the intended Apple draft, currently 1.0. Preserve package/bundle IDs. Establish native compatibility using a supported fingerprint policy or a rigorously verified runtime/version policy; record binary/source/runtime/channel/update mapping and rollback procedures.
- Verify business, event, staff-invite, OAuth and payment return paths, including AASA/assetlinks and cold/warm launch. Staff-invite acceptance can mutate on load: use specifically authorized fixtures. Preserve guest intent/session resume and reject unsafe hosts/redirects.
- Correct unconditional local-inbox recovery guidance and residual production diagnostic/old-brand copy without changing valid recovery behavior.

**Done when:** invalid production config fails release validation; the candidate targets intended services; links resolve and resume correctly; incompatible native updates are excluded; offline launch/rollback and production copy checks pass. Prepare any hosting/update changes for authorized execution.

### W08 — Execute native and integration acceptance and fix demonstrated defects

**Finding:** F22; verifies every preceding work package. **Ownership:** release-candidate QA, regression repairs, dependency/native compatibility investigation and the coverage ledger.

- Use [the complete surface inventory](F:/BusinessApp/docs/audits/store-readiness-2026-09-30/coverage-inventory.md): 30 route files, two layouts, 145 embedded call sites and OS/SDK surfaces. Record role/workflow cases, not merely file traversal.
- Test signed out/customer/owner/staff, onboarding/linking/recovery, paid tiers/lifecycle, provider setup, commerce/rewards, content/safety/deletion, notifications/location and all links. Include loading, empty, error, permission denied, checkout failure/pending, session expiry, account switching, slow/offline and interrupted/restarted states.
- Test iPhone and Android release builds, supported iPads/small phones, keyboard/back/focus, VoiceOver/TalkBack, large text, contrast, light/dark and reduced motion. Capture reproducible defects and fix them without removing scope.
- Investigate the audit's raw RELRO observations with authoritative NDK tools, generated-APK zip alignment and an actual 16 KB environment. Play's Supports 16 KB signal and passing ELF LOAD alignment are positives, but do not settle runtime behavior. Change dependencies/native tooling only where the investigation justifies it.
- Verify final SDK/target, signatures, required-reason/privacy manifests and capabilities. The inspected AAB used API 36 and Billing Library 8.3.0; preserve current compliance and plan the documented future upgrade deadlines.

**Done when:** the exact candidate passes the complete native matrix and relevant SQL/provider integration checks, with remaining externally blocked cases plainly identified. No source preview or mocked test is accepted as native proof.

### W09 — Complete reviewer access and store-readiness materials

**Findings:** F01, F02, F04, F23, F24. **Ownership:** release metadata/assets, safe review fixture scripts, store/declaration drafts and account/region/signing evidence.

- Prepare customer, owner and staff fixtures with stable review access, approved/draft businesses, tier examples, non-sensitive content and usable QR/manual examples. Document mode switching and gated workflows. Prove a fresh installation follows the notes without private-network, expiring-invite or inaccessible OTP dependencies.
- Capture real final-candidate iPhone/iPad/Android screenshots and each Apple's subscription review screenshot. Existing promotional plan images do not replace review screenshots. Ensure both store descriptions and individual product benefits match W01/W02's finished behavior and localized prices.
- Prepare complete privacy, age/content rights, target-audience, access, permission and deletion declarations. Maintain full-feature descriptions, including the retained nearby-alert behavior. Attach the first Apple group/products with the matching app version when submission is authorized.
- Recheck intended app/product territories, correct EU trader classification, Android identity/package/signing registration and current agreements/account verification. Apple's agreements/bank/tax/DSA statuses were Active during the audit; resolve actual gaps rather than reopening settled setup unnecessarily. Human business/legal identity answers must reflect real facts.
- Produce a concrete console checklist identifying exact fields/assets/settings and verification evidence. Prepare build/upload/submission steps; executing the store changes is a separate authorized action.

**Done when:** final materials accurately describe the exact tested candidate, review access works across roles, required fields/assets are ready, and outstanding account/region facts are resolved or explicitly blocked. Do not call the app submission-ready while any required native/form/build gate remains open.

### W10 — Run the genuine Google closed test and production-access process

**Finding:** F03. **Ownership:** tester coordination, test release evidence, defect handling and production-access application materials.

- Start once required app setup is complete and a coherent working candidate is available. Recruit at least 12 real testers and keep at least 12 opted in continuously for 14 days; internal-track availability and fabricated accounts do not satisfy the gate.
- Provide a test script covering customer/owner/staff, all tiers, orders/bookings, permission-denied cases, safety and recovery. Obtain scoped authorization for any sandbox transactions, deletion fixtures, actual delivery or hosted operations used by testers.
- Record opt-in continuity, engagement, findings and fixes; keep testing meaningful throughout the period. Updates and tester turnover must be handled against the console's actual eligibility criteria.
- Prepare truthful production-access responses and retain evidence. Obtain the console's eligibility and production-access decision; calendar completion alone is not approval.

**Done when:** required continuous participation is evidenced, tester defects are fixed/verified, production access is granted and the final candidate still satisfies W08/W09. No release is submitted or published solely because the 14 days elapsed.

## Validation and progress reporting

The audit baseline was mobile type checking plus 1,052 mobile and 261 shared/helper tests passing. Use focused regression tests for each meaningful change; run the relevant broader checks once integrated. Avoid dependency reinstalls or archived test discovery as a workaround for an unrelated harness problem.

Known working baseline commands from the repository root:

```powershell
node node_modules/typescript/bin/tsc --noEmit -p apps/mobile/tsconfig.json
```

From `F:\BusinessApp\apps\mobile`:

```powershell
node ../../node_modules/vitest/vitest.mjs run
```

From the repository root:

```powershell
node node_modules/vitest/vitest.mjs run packages/ supabase/functions/_shared/ --exclude '.codex-tmp/**'
```

Add meaningful SQL/RLS, tenancy, entitlement, erasure, webhook and provider tests as required. During the audit Docker was unavailable, adb was absent and no native session was accessible. Resolve test-environment availability or report the exact blocked checks; continue source fixes and independent tests.

Each completed package should report: finding IDs, concrete behavior changed, affected files/migrations, tests actually executed, fixture/environment scope, native build requirements, external configuration steps, and remaining gates. Keep related changes reviewable and adapt to concurrent user work.

## External inputs and final completion gate

The developer needs usable native devices/build access; local or explicitly authorized isolated backend fixtures; verified production provider/RevenueCat configuration; factual audience/territory/trader/retention decisions; a moderation/support operator; and 12 genuine closed testers. Prepare code, scripts, drafts and evidence before requesting an action that depends on one of these inputs. Never infer a passed check from unavailable access.

All 25 findings are assigned above. Completion requires the complete feature set to work, applicable acceptance criteria to be demonstrated, accurate final store configuration, and resolved required verification gates. An unverified concern can be closed by evidence showing no defect; it does not automatically justify speculative code changes. Submit/publish only after the user's separate release direction.

## Copy-ready task for the developer agent

> Implement the full-scope Parish Pass store-readiness fixes in `F:\BusinessApp` using `docs/audits/store-readiness-fix-work-order.md` and its linked audit/evidence. Preserve all three subscription tiers and the complete existing feature set. Start with W01 server-authoritative entitlement enforcement and W02 production commerce, then execute the remaining packages and acceptance criteria. Read all applicable project instructions first and preserve the dirty working tree. Maintain a finding ledger, make meaningful regression tests, and report actual evidence and external blockers. Prepare hosted/provider/store/release actions for review without executing actions outside the authorized scope. Do not mark native, production, deletion or payment checks passed unless they were actually executed safely. Deliver reviewable fixes and a complete remaining release checklist; do not silently reduce product scope.
