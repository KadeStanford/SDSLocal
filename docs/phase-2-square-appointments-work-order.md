# Phase 2 work order: service appointments with Square Sandbox payments

Do not begin this phase until Phase 1 Square pickup commerce has been deployed to staging,
verified with a real Square Sandbox payment/refund/webhook cycle, and published to the Preview
channel. This document is the handoff prompt for the same implementation task after that gate.

## Repository and environment

- Repository: `F:\BusinessApp`
- Product: SDS Local, a mobile-first local-business discovery and commerce platform
- Expo SDK 57 / Expo Router mobile app for iOS and Android
- Next.js public web app
- Supabase Auth, Postgres, Storage, Realtime, and Edge Functions
- Staging Supabase project: `lgddhdexvwclfrnzjtly`
- EAS environment/channel/branch: `preview`
- App environment: `staging`
- Existing Preview runtime: `0.1.0`
- Existing Square application: `SDS Local Staging`, Sandbox only

Read `AGENTS.md` and `docs/metro-lan-only.md` before touching Metro. Also read the current
versions of `docs/square-commerce.md`, `docs/mobile-ui-style-guide.md`, architecture/environment
documentation, the Phase 1 migration and Square functions, the mobile Square owner/customer
flows, account deletion, and all relevant tests. Treat the current repository and deployed
staging state as authoritative. Preserve the dirty working tree and unrelated user work.

## Objective

Implement a mobile-first appointment-booking system for service businesses. Customers must be
able to discover a service, choose a real available time, book as a guest or signed-in user, and
either pay in person or pay a configured deposit/full amount through the business's connected
Square Sandbox account. Owners must be able to configure availability and manage today's work
entirely in the app. Do not require owners to use a computer.

This is a scheduling engine owned by SDS Local. Do **not** add a Square Appointments dependency or
request Square booking/team/customer scopes. Reuse Phase 1 Square Orders, hosted Checkout/Payment
Links, payment reconciliation, refunds, encrypted OAuth tokens, merchant/location selection,
webhook inbox, guest capabilities, idempotency, and maintenance patterns.

Use Square only for payment of real-world services. RevenueCat remains exclusively for digital
business-listing subscriptions. All provider activity must remain Square Sandbox/test-only; no
real charges, live credentials, production resources, platform fees, or production OTA.

## Current baseline to preserve

Phase 1 provides:

- owner-only Square OAuth and merchant/location selection;
- AES-256-GCM provider-token storage and refresh;
- a separate synchronized Square catalog mirror;
- server-authoritative quotes and hosted checkout;
- signed/deduplicated order, payment, refund, catalog, and OAuth webhooks;
- idempotent guest checkout and opaque guest status capabilities;
- full-refund reconciliation and a formal pickup order state machine;
- `square-commerce`, `square-oauth-callback`, `square-webhook`, and
  `square-maintenance` Edge Functions;
- private RLS-protected `square_*` tables;
- mobile customer order flow and direct owner `Ordering & Square` tool.

Extend these boundaries. Do not create a second provider connection, webhook inbox, OAuth flow,
token store, payment client, or generic owner dashboard. Do not overwrite Phase 1 pickup behavior.

## Customer flow

1. An eligible public business page shows a prominent `Book appointment` action.
2. The customer chooses a bookable service before being asked for contact information.
3. The customer optionally chooses an eligible staff member or selects `No preference`.
4. The app displays only server-generated availability in the business timezone.
5. The customer chooses a date/time and sees duration, location, price, deposit/payment policy,
   cancellation terms, and any preparation instructions.
6. The customer enters the minimum recipient/contact information required to perform the service.
7. The app shows one concise review screen.
8. For pay-in-person or no-payment bookings, the server atomically creates the appointment.
9. For deposits/full prepayment, the server atomically holds the slot and creates a Square-hosted
   Sandbox checkout using trusted service/payment data.
10. Returning from the browser shows `Confirming payment` until a verified webhook or authoritative
    reconciliation confirms payment. Browser return alone is never success.
11. The customer can reopen appointment status using their account or an unguessable guest
    capability. The deep link contains no contact, payment, or provider credentials.
12. Cancellation/rescheduling options reflect the business policy and authoritative appointment
    state. Refund completion is never implied before Square confirms it.

Support guest booking. Do not require account creation, fabricate email addresses, or add a new
Supabase transactional-email workflow. Existing push/in-app mechanisms may be used narrowly;
payment receipts remain Square's responsibility.

## Owner and staff flow

Add a direct `Appointments` tool to the existing business workspace's Operations group. Do not put
another overview or landing page in front of it.

Owners can configure:

- whether appointment booking is enabled/open;
- services that are bookable, using an explicit mapping to existing SDS offerings and/or a
  provider catalog variation without overwriting editorial menu/service content;
- duration, cleanup/buffer time, price, currency, and whether a price is fixed or informational;
- payment policy: pay in person, fixed deposit, percentage deposit, or full prepayment;
- minimum/maximum booking notice and rolling booking horizon;
- weekly business availability plus date-specific closures/overrides;
- staff/resource eligibility and per-service availability;
- appointment capacity for group services where appropriate;
- automatic confirmation versus owner approval for payment-free requests;
- cancellation/rescheduling cutoff and refund policy wording;
- public instructions and internal notes as separate fields.

The operational screen prioritizes today's and upcoming appointments. Each row must clearly show
customer, service, staff/resource, local time, payment state, appointment state, and the one next
appropriate action. Support bounded history/loading, refresh/retry, and explicit states such as:

- requested (only where manual approval is configured);
- payment pending;
- confirmed;
- checked in;
- in service;
- completed;
- cancellation pending;
- cancelled;
- no-show;
- refund pending/failed/refunded.

Only owners may change financial/provider settings or destructive policies. Reuse the existing
business role model for operational staff; staff may view/process appointments only if assigned or
explicitly granted operational access. Do not broaden scanner-only staff access accidentally.

## Scheduling and concurrency rules

Build an authoritative server-side availability engine. Never trust a client-submitted slot,
duration, price, balance, payment status, or refund state.

- Store instants in UTC and retain the business IANA timezone for display and rule evaluation.
- Handle daylight-saving gaps/overlaps deliberately; never create an impossible or duplicate
  local time.
- Combine business hours, service eligibility, staff/resource calendars, buffers, overrides,
  existing appointments, temporary checkout holds, capacity, notice, and horizon.
- Generate availability in bounded windows with indexes suitable for mobile queries.
- Atomically reserve capacity. Simultaneous customers must not double-book the final slot.
- Make retries idempotent and return the same logical hold/appointment for the same request key.
- Expire abandoned payment holds only after Square checkout cancellation/reconciliation makes it
  safe. A late payment must enter review instead of silently double-booking.
- Rescheduling must acquire the new slot before releasing the old one and must be safe under
  concurrent actions.
- Formalize allowed appointment transitions and reject arbitrary client state updates.
- Use optimistic versions/leases where provider or owner operations can race.
- Preserve immutable service, price, policy, location, staff, and customer-facing snapshots for
  historical appointments.

## Database work

Create a new ordered migration; never edit an applied migration. Use existing UUID/timestamp/check,
index, grants, and RLS conventions. Model at least:

1. Booking settings per business.
2. Bookable service definitions/mappings and payment policies.
3. Staff/resources and service eligibility without duplicating the core membership model.
4. Weekly availability rules and date-specific overrides/closures.
5. Appointment holds with expiration, capacity units, and idempotency.
6. Appointments with signed-in/guest access, business/service/staff/location/time snapshots,
   money in integer minor units, Square order/payment/refund IDs, state, payment state, policy
   snapshot, optimistic version, and lifecycle timestamps.
7. Appointment event/audit history.
8. Any narrow notification/reminder state needed for existing push infrastructure.

Sensitive payment/provider tables remain server-only with explicit client privilege revocation.
Expose no token ciphertexts. Customer reads must be limited to their own account appointment or a
server-validated opaque guest capability. Owners/staff may access only appointments for authorized
businesses. Add indexes and constraints that make double-booking prevention enforceable rather
than merely checked in UI code.

## Square payment behavior

- Reuse the existing Square Sandbox connection and selected location.
- Reuse existing Orders/Payments/Refund permissions and webhook events; request no new Square
  scopes unless official documentation proves a hard requirement and the user approves it.
- Create appointment payment orders from server-trusted service/payment policy data.
- Use a distinct internal purpose/type so appointment and pickup order reconciliation cannot be
  confused.
- Support zero-dollar/pay-in-person bookings without creating fake Square payments.
- For deposits, track total service price, deposit paid, remaining balance, currency, and refund
  amounts explicitly.
- Phase 2 does not collect the remaining in-person balance inside SDS Local unless full prepayment
  was selected. Present the balance as operational information, not as a second hidden charge.
- Implement only policy-safe full refund of the amount SDS Local charged. Do not invent partial,
  automatic, punitive, or no-show charges.
- Confirm paid/refunded state only from signed webhooks or an authoritative Square fetch.
- Keep platform/application fees at zero.

## UI and design requirements

Follow `docs/mobile-ui-style-guide.md` and the current shared components/tokens.

- Mobile-first and complete inside the app; no `finish this on the web` requirement.
- One primary action per task area.
- Avoid long form walls, nested bordered cards, redundant accordions, and explanatory paragraphs
  where progressive disclosure or concise helper text works.
- Use business logos for identity and service photography where available.
- Use pills only for compact status/filter choices.
- Minimum 44-point targets, clear busy/disabled states, screen-reader labels, large text, narrow
  screens, light/dark themes, safe areas, and keyboard handling.
- Horizontal controls must not trigger back navigation gestures.
- Preserve unsaved-change protection in configuration flows.
- Show loading, retained-loading, empty, closed, unavailable, disconnected, error, retry,
  payment-pending, refund-pending, and offline states honestly.
- Do not invent scarcity, popularity, availability, discounts, or urgency.

## Account deletion and retention

Extend account deletion deliberately:

- Active/upcoming appointments and pending payments/refunds must prevent destructive deletion or
  require a safe documented resolution.
- Deleting a customer account anonymizes settled records when legally/operationally safe without
  destroying required financial/audit history.
- Sole-owner business deletion preserves/anonymizes necessary transaction history and revokes
  guest access.
- Disconnecting Square disables new paid bookings but preserves and reconciles outstanding work.
- Document staging retention and the production legal-review requirement.

## Required tests

Add unit, SQL, Edge/shared-module, and integration coverage for at least:

- owner/staff/customer/guest authorization and cross-business isolation;
- timezone conversion, DST gap/overlap, weekly rules, overrides, notice, horizon, buffers;
- service/staff/resource eligibility and group capacity;
- simultaneous final-slot booking and idempotent retries;
- hold expiration, late payment, and provider ambiguity;
- server rejection of client-supplied price/duration/slot/payment data;
- signed-in and guest status-token isolation;
- pay-in-person, deposit, percentage rounding, and full-prepayment amounts;
- webhook replay/out-of-order behavior and pickup/appointment event separation;
- cancellation cutoffs, allowed transitions, rescheduling atomicity, no-show, and refund states;
- account deletion/retention guards;
- CTA eligibility, form validation, duplicate-button prevention, confirming-payment UI,
  accessibility, offline/retry, and gesture behavior;
- regression coverage for Phase 1 pickup ordering, rewards, events, onboarding, account deletion,
  listing subscriptions, and staff scanning.

Run and report:

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `git diff --check`
- local Supabase reset and public-schema lint
- every existing SQL suite plus new booking suites
- Edge/shared-module tests
- a real local-database concurrency integration using a simulated Square transport

Do not rewrite unrelated files merely to silence pre-existing warnings.

## Staging deployment and verification gate

Use only staging project `lgddhdexvwclfrnzjtly` and the existing Square Sandbox application.
Inspect the deployed Phase 1 migration/functions before changing anything. Apply only the new
authorized migration, deploy only changed/new functions, and preserve the working maintenance
job. Add a separate booking rollout/allowlist that defaults off.

Verify with disposable staging data and Square Sandbox only:

1. Owner enables one test service and staff/resource schedule.
2. Customer sees real server availability.
3. Two simultaneous customers cannot take the final slot.
4. A pay-in-person booking confirms correctly.
5. A deposit or full-prepayment booking opens Square-hosted Sandbox checkout.
6. Use only Square's documented Sandbox payment method; no real card or charge.
7. The app remains pending until the signed webhook/reconciliation confirms payment.
8. The appointment appears in the owner queue and Square Sandbox Dashboard where applicable.
9. Owner progresses the appointment; customer status follows.
10. Cancellation/refund and replay behavior reconcile correctly.
11. Rescheduling preserves capacity atomically.
12. Disconnect/closed booking states remove the CTA without losing history.

No Preview OTA until the staging backend and real Sandbox flow are usable. If eligible, publish
only to branch/channel/environment `preview`, both platforms, existing compatible runtime, with
message `Add Square Sandbox appointment booking`; re-read EAS to record group and platform IDs.
Never publish production. Do not make native dependency/configuration changes; redesign around
hosted checkout and existing capabilities so the installed Preview build remains OTA-compatible.

The agent cannot claim physical-device testing. Provide a concise phone checklist for the user,
including owner setup, customer guest booking, pay-in-person, Sandbox checkout, return/pending,
confirmed status, owner workflow, cancellation/refund, rescheduling, dark/light, large text,
narrow screens, offline retry, and back-gesture safety.

## Final report

Report implemented flow, schema/RLS/security, scheduling rules, Square reuse/scopes, migrations and
functions deployed, exact automated results, real Sandbox evidence, rollout state, OTA identifiers
if published, changed files, limitations/production blockers, confirmation that production and
RevenueCat were untouched, confirmation of no native changes, and the user-only phone checklist.
Do not claim completion from UI existence, simulated transport alone, browser return, or an OTA
that points at an unusable backend.
