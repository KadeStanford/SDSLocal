# Business tools and staging playground

The user approved the appointment setup, service-request inbox, intake form builder and brand color picker previews. The color controls preserve optional exact hex entry while adding palettes, saturation/brightness, hue, and a live preview. Appointment configuration is organized into services, availability, rules and team controls. Business owners can define required custom intake questions; customers complete them when submitting a request, and submitted answers retain their original labels.

## Data scope

160 additional fictional businesses across 20 categories in Hammond and nearby Northshore communities. This includes restaurants, coffee shops, bakeries, mobile vendors, salons, home services, pet grooming, boutiques, clothing, gifts, florists, music and arts venues. Representative stock photography and generated brand marks are testing assets, not representations of actual companies or actual advertised events. Mobile stops use recognizable locations with fictional schedules.

80 confirmed fixture accounts provide customer, staff and owner roles. Their seeded histories include attendance, event reviews, orders, pickup reviews, follows, rewards, appointments and service requests. Passwords are stored only in the ignored local login handoff. No signup emails are sent to fixture addresses. Fixture notification deliveries are suppressed before each seed transaction commits.

72 restaurant/mobile menus connect to actual Stripe **test** connected accounts with card-payment capability verified. Existing Square sandbox fixtures remain available. Historical orders are database fixtures, not historical processor payments. Service fixtures support pay-in-person appointments and category-specific intake forms. Payout settlement and live-money payments are outside this seed.

54 fixture owners have sandbox Pro entitlements, with at most three assigned listings each. There are also 16 staff/customer accounts and ten customer-only accounts. Existing user-owned businesses and global billing rollout settings are preserved.

## Verification

Final database audit: 181 published businesses overall, including the 160 new fixtures; 800 business photo records; 1,280 catalog items; 960 events; 384 published mobile stops; 200 appointment services; 280 appointments; 280 service requests; 40 configured intake forms; 160 loyalty programs; 1,120 memberships; 5,880 loyalty transactions; 2,240 RSVPs; 1,120 event reviews; 1,512 historical orders; 504 order reviews; and 1,120 follows. All 160 new businesses have billing assignments. The audit found 6,080 ready media variants with matching storage objects and downloaded all 160 cover images successfully. An initial image-download pass failed transiently; the complete second pass succeeded.

Six handoff accounts were verified after final role assignment: three customer-only accounts, two Pro owners, and one staff/customer account. Each has seeded activity. The local private guide is `.codex-tmp/playground/test-logins.html`; it is excluded from Git along with all passwords. Both temporary fixture helper functions were deleted and their absence was verified.

- 699 mobile tests and 478 shared/package tests passed.
- All 30 database regression scripts passed, using rollback-only transactions.
- Mobile TypeScript passed. Scoped lint has no errors; three existing hook-dependency warnings remain.
- 180 component-render layout checks cover narrow/normal/wide widths, both themes and larger text. These are component fixtures; native controls/icons are approximated, not phone screenshots.
- Customer API checks passed for all 72 ordering businesses and all 40 service businesses. One initial quote returned INVALID_SLOT; a retry with a later pickup time passed. This checks availability and quote creation, not a completed native payment.
- Five sample account logins loaded attended events, order history and follows. The older attended-event permission fix remains covered by its database regression.

The test inventory and outstanding device/provider checks are listed in [the coverage matrix](./playground-test-coverage.md). Passing these checks is not a guarantee that every security or logic flaw has been found.

## Reproducibility and evidence

`scripts/staging-playground/build.cjs` and `templates.cjs` preserve the core deterministic fixture generator and catalog. It writes private SQL/credentials under `.codex-tmp/playground`; applying requires `--apply` and staging guards. It does not provision payments, upload media, or replace the deployment steps. Do not rerun it merely to refresh images: uploaded assets, subscription assignment and activated forms are separate phases.

`scripts/staging-playground/test-database.cjs` runs all rollback-only SQL regressions. `test-customer-api.cjs` checks the current local manifest against staging. Both use `staging.cjs`, which enforces the known staging project, billing lock and matching mobile backend. Credentials are loaded from ignored environment files.

Deployment artifacts, exact source/bundle hashes, private fixture credentials, media import progress, provider readiness, and test JSON reports remain in `.codex-tmp`. Temporary media/payment setup functions are removed after seeding.


## Approved OTA published

Published 2026-09-30T00:16:50.239Z after user approval. Expo preview channel and environment; staging backend; runtime 0.1.0.

[Expo update](https://expo.dev/accounts/kadestanford/projects/sds-local/updates/7c7fb914-f7cb-42ad-8541-f25e0f945ea9)

- android: 01a0efab-d23f-7d5d-9677-7375b981ed65
- ios: 01a0efab-d23f-733b-ba24-6200937a67e1

Fresh iOS/Android exports verified unchanged native configuration, staging backend and test payment settings. Source hashes stayed stable during export and were rechecked before publication. Active channel readback verified both published IDs. Exact source and bundle hashes are stored in .codex-tmp/business-tools-source.json and business-tools-bundle-verification.json.
