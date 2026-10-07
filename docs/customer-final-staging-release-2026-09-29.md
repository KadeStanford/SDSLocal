# Approved customer and business redesign — staging OTA

Published 2026-09-29T20:41:33.515Z after the user's explicit final approval.

Channel/branch/environment: preview. App environment: staging. Runtime: 0.1.0.

Update group: a7f5f559-57b5-48b6-8c5a-9ff350dff0f4

- android: 01a0eee6-ba4b-7395-b8b8-a7c079363aae
- ios: 01a0eee6-ba4b-7666-8827-99550191f9da

[Expo update](https://expo.dev/accounts/kadestanford/projects/sds-local/updates/a7f5f559-57b5-48b6-8c5a-9ff350dff0f4)

## Included

All pending mobile redesigns: customer Home/Discover, menu/cart/pickup/contact/checkout, customer orders and status, Account, sign-in/sign-up/email code, Rewards/Following/reward detail, and business follow-ups for branding/back placement, action sheet, Operations header and Staff Scan business chooser. Prior approved business, subscription, alerts and scanner designs remain included. Adaptive discovery adds time/location/season-aware collections, recent-exposure rotation, category carousels and position indicators.

## Verification

- 682 mobile tests and 32 shared business-logic tests pass; mobile TypeScript passes.
- Fresh iOS/Android exports passed staging backend, test-payment and unchanged native configuration checks. Source hashes stayed stable during final export and were rechecked before publication.
- Bundle contents checked for approved customer/reward/discovery features. Active preview channel readback verified both new update IDs, group, runtime and staging environment.
- Screenshots approved by the user are component renders with fixtures; physical-device acceptance remains for the phone review.
- Existing Rewards/Explore state-effect lint findings are recorded in the design review; this is not a claim of repository-wide clean lint.

## Known scope limits

Live weather is not connected; weather-aware planning is prepared and demonstrated with fixtures. Newly seeded staging retail businesses still lack uploaded photos due to the existing backend upload issue and use image fallbacks. OTA does not deploy backend functions, database migrations or the web app. These limitations are documented in docs/adaptive-discovery-2026-09-29.md.

Source HEAD: 79af5590270e826aae8e4219ec6e670fe57dadb5, including the approved shared working-tree changes. Exact mobile/package source hashes are recorded in .codex-tmp/customer-final-source.json.
