# Customer fixes and workspace redesign — staging

## Scope

- RSVP: reproduced `structure of query does not match function result type` from the deployed `set_event_rsvp_group`. Explicit TEXT cast fixes the varchar result while preserving capacity, waitlist, reminder and authorization rules.
- Owner reviews: the user reports every business inbox fails. Public review REST queries and summary RPC pass; the original Edge request failure has not been isolated because the Management token cannot read API keys. The inbox now reads `get_business_reviews`, independent of payment-provider setup, with an explicit active-owner check and published-review-only projection. Reply mutations retain the existing authorized Edge endpoint.
- Personal attended-event and service-request histories remain accessible from Account in both app modes and protected for guests.
- Home: one compact result/filter row after search; existing highlight/category/location/sort choices move into Filters. Shared branding, feed and swipe underlay retained.
- Rewards: compact merchant identity, small merchant-color accent, neutral balance/progress panel, app primary code action, arrow back pill. Eligibility remains server-reported.
- Public events: compact date/merchant summaries; full media, description, RSVP group controls, reminders, directions and reporting appear in one selected-event sheet. RSVP saves reject duplicate taps, clear busy state on thrown errors and ignore stale scope responses.
- Business hub: compact identity before operations, denser themed tool groups, Operations initially visible, smaller attention/performance panels. Profile/contact/location show saved details with focused editing sheets. Mobile stops have searchable upcoming/draft/past lists and one selected detail or draft form; blank coordinates no longer become zero accidentally.
- Back pills at the top of reward/calendar event details, business reviews, attended history, workspace sections and the selected stop/event/photo views preserve callers' navigation and dirty-draft guards.

## Staging backend evidence

Project: `lgddhdexvwclfrnzjtly` only.

- `20260929000100_fix_rsvp_result_type` deployed; create/cancel result contract passed against the live function inside a rolled-back transaction.
- Review function deployed under migration history name `20260929000200_owner_review_inbox`. Local source was initially `20260929000300_owner_review_inbox.sql`; clean database verification subsequently moved it to `20260929000350_owner_review_inbox.sql` because version `20260929000300` also belongs to the business creation subscription gate. Automatic approval review rejected rewriting the history name; the deployed entry remains unchanged. Reapplying this CREATE OR REPLACE migration is idempotent.
- All confirmed account active-owner business review reads pass. Anonymous/non-owner denial, published-only output and function grants pass. A separate read under `authenticated` database role passes. No email or persistent test fixtures; no credentials printed or saved.
- Live public order review and event review projections and review summary return HTTP 200.

## Verification and deployment

- Mobile TypeScript passed.
- 123 tests across 11 files passed, covering shared merchant components, Calendar, navigation protection/history, Home, business configuration, order stages, request drafts, rotating rewards codes, alert audiences and concurrent listing-plan changes.
- A compile-only plural-label correction accommodates the concurrent plans' literal three-listing limit; their new features are preserved and checked as part of the combined bundle.
- Both native bundles exported from a stable source snapshot and rechecked before publication. Concurrent listing-plan edits caused two guards to stop earlier attempts; rebuilt after the other task finished. The combined snapshot preserves its feature catalog/comparison changes; its new subscription products remain disabled.
- Preview publication group: `12af814b-b65d-481b-9a73-585604966b06`.
- Source commit: `acdc9d77670f26391e88f0551e7b51d451b7db83`; combined uncommitted subscription source hashes are recorded in the local release snapshot.
- Android update: `01a0eabe-db2e-7d7a-b4f0-293f98fad0e4`.
- iOS update: `01a0eabe-db2e-74dc-b3ea-48e3b1bde39f`.
- Fresh channel readback confirms channel/branch/environment `preview`, app environment `staging`, runtime `0.1.0`, exact published update IDs, and native config/fingerprints identical to the previous public-page OTA.
- Live owner-review REST endpoint resolves and denies anonymous execution with HTTP 401 / `42501`; authenticated-role database read passes. Square-commerce gateway JWT setting remains false and was not changed.

## Remaining acceptance

Actual phone verification remains necessary for business inbox loading/replies, RSVP success/cancel/waitlist, attended-history navigation, modal scrolling/back behavior, large text, narrow screens, light/dark colors, and offline retry. Database checks establish endpoint behavior; they are not proof of visual or end-to-end phone acceptance. Original app-wide redesign/audit scope remains active.

