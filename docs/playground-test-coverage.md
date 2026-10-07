# Automated coverage and remaining checks

Run from the repository root. The September 29 staging pass completed 699 mobile tests, 478 shared/package tests, 30 rollback-only SQL scripts, and customer API checks for 112 newly seeded ordering/service businesses. Exact JSON results are under `.codex-tmp/playground`.

| System | Automated evidence | Remaining integration/device boundary |
| --- | --- | --- |
| Authentication and account access | Auth routing, session/account reset, OTP components, deletion endpoint, authenticated fixture password logins | Native Apple/Google dialogs, real email delivery, biometric/device persistence |
| Discovery, location and mobile businesses | Discovery ranking/history/carousels, location permissions/core, pickup discovery; 384 published fixture stops | Physical GPS, background location, weather-provider outages |
| Business management and subscriptions | Creation gates, plan providers, entitlements, assignments, event ordering, staff invite UI, owner/staff authorization | Real store purchase/restore and device store account switching |
| Branding and media | HSV/hex conversion, form render/layout, theme/contrast tests, storage preflight and media cleanup; stored image object audit | Native dragging/VoiceOver and original camera/photo-library permissions |
| Events, attendance and reviews | RSVP result contracts, attended-event grants, attendee UI, review summaries/inbox/replies and ownership rules; live attended-event API reads | Native calendar export and physical attendee check-in scan |
| Pickup ordering | Cart/options/pricing/scheduling/recovery/idempotency tests; database order workspace, timezone, provider separation and confirmation lifecycle; 72 live menus/quotes | Full native PaymentSheet, wallet payment, and physical pickup handoff |
| Stripe and Square | Shared provider, signature/state-machine and settlement tests; SQL lifecycle/refunds; real Stripe test account readiness | End-to-end external refund/webhook delivery under processor outages; no live-money tests |
| Rewards | Explicit item eligibility, extras/base-price discount, BOGO, stale claims, cart persistence and server loyalty/concurrency regressions | Real camera scans between two devices |
| Appointments | Booking-slot/conflict/payment-state regression and mobile controls; live service catalogs/slots for all 40 new service businesses | Native date/time picker behavior and paid booking processor interaction |
| Custom intake and service requests | Schema validation, required fields, revisions, labelled answer snapshots, retry/idempotency and owner-only save regressions; live form reads | User testing for complex forms and native keyboard/accessibility |
| Notifications and nearby alerts | Audience/preferences, notification SQL, pickup delivery states, nearby-alert regressions | Push credentials, locked-device delivery and deep links from OS notifications |
| Safety and security boundaries | Customer safety/blocking, role checks, database grants/RLS, webhook authentication, idempotency and payment isolation tests | Independent penetration test, abuse/load testing, full cross-device session exercise |
| UI/navigation/accessibility | Navigation policy, route/workspace/component tests; 180 new-control layout checks in both themes and larger text | Screen-reader traversal and all supported physical screen sizes |

This is a coverage inventory, not a claim of complete end-to-end coverage for every feature. Tests exercise modeled cases; manual and external-provider gaps remain explicit. The API pass validates quotes without submitting payment or emailing fabricated recipients.

## Repeatable commands

```powershell
node_modules/.bin/vitest.cmd run supabase/functions/_shared packages
Push-Location apps/mobile
../../node_modules/.bin/vitest.cmd run --maxWorkers=3
Pop-Location
node scripts/staging-playground/test-database.cjs
node scripts/staging-playground/test-customer-api.cjs
```

The staging runners enforce the configured staging project and billing lock. SQL scripts must include rollback and must not include commit or external HTTP calls. The API runner requires the ignored local fixture manifest and credentials; it creates quotes but does not create payments. Use local Supabase/Inbucket for email tests. Never send hosted email to the `.test` fixture addresses.

The SQL pass repaired stale test assumptions: billing fixtures now use isolated users and the current timestamp envelope; review-summary tests include event reviews; disabled ordering still allows authorized historical-order access; public capability checks restrict themselves to their own fixture IDs. These changes improve the tests without weakening production authorization.

