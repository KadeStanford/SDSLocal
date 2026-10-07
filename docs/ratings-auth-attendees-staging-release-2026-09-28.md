# Combined ratings, authentication and attendees — staging

## Included changes

- Home cards and public-business identity/review section display the actual published-review star average and count. Known empty ratings say No reviews yet; failed Home reads have a Retry action. Public business identity and the review section share one summary read.
- Authentication prioritizes one bounded form, uses top back pills for recovery and Account subpages, and puts browsing/business setup below authentication. Mode/persistence/navigation pause while busy; validation and provider flows remain.
- Event attendee roster has name search, expected/checked-in/waitlisted/all filters, concise rows and one whole-group check-in detail sheet. Server-confirmed updates precede refresh. Export remains secondary and neutralizes formula-like names.
- Prior Account, alerts, Calendar, Home, business workspace, rewards, public-event RSVP, order and Staff Scan changes remain included. Parish Pass branding and native configuration are retained.
- Concurrent completed subscription integration is preserved in the stable source snapshot: Account subscription access, shared business-creation plan gate, pricing/disclosures/restore/cancellation/store package handling. Its backend creation-gate migration, store connections and sandbox purchases are outside this UI deployment. A staging readback confirms `get_my_listing_billing().billingEnabled = false`; this OTA does not enable billing.

## Verification

- Mobile TypeScript passes.
- 153 tests across 11 files pass, covering shared controls, ratings parsing/batching/display, attendee filters/counts/CSV safety, Home and navigation/auth intents, listing billing identity/core/packages, plan screen and creation gate.
- Staging public aggregate migration is deployed. Anonymous REST returns only active business aggregates; hidden/private/oversized-request regressions pass.
- The requested 21 clearly labeled reviews are persisted. Three published businesses each have 4.7 stars and 3 reviews. Draft businesses have owner inbox fixtures without public aggregates. No provider payments, emails or new customer identities were created.
- Export preflight confirms Preview environment, staging project `lgddhdexvwclfrnzjtly`, established Stripe test-key fingerprint, current source contracts and runtime policy.

## Published Preview update

- Group: `fe8cfe38-c15c-4198-bcde-e566f684ac8c`.
- Source commit: `9e10ae57a96e6a28b7b9ee7c620c3adf86310632`; stable export snapshot also records the preserved concurrent mobile subscription changes.
- Android: `01a0eae6-ce75-78c1-a0c3-b080907fdf24`.
- iOS: `01a0eae6-ce75-7303-b230-eda4eff94231`.
- Fresh channel readback matches both published IDs, Preview branch/environment, staging app configuration and runtime `0.1.0`. Resolved native configuration and platform fingerprints match the previous verified Preview release.

## Device acceptance

Phone checks remain outstanding for Home/business ratings, review inbox/replies, RSVP, attendee check-in/export/detail, authentication keyboard/provider/back-pill layout, enlarged text, both themes and narrow screens. Automated contract checks and native export do not establish device visual or integration acceptance. The full app-wide redesign goal remains active.
