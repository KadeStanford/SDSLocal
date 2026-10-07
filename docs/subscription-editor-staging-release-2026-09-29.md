# Subscription and business editor styling — staging release

Published 2026-09-29T16:32:17.124Z to channel/branch/environment `preview` (app environment `staging`), runtime `0.1.0`.

- Update group: `629397cb-28d5-45d9-9554-6767bd735d71`.
- android: `01a0ee02-82e4-774a-871b-162457af74ac`.
- ios: `01a0ee02-82e4-7fe1-9401-55dc65268308`.
- Source HEAD: `79af5590270e826aae8e4219ec6e670fe57dadb5`, including shared working-tree changes.
- Active-channel readback verified both update IDs, group, runtime, and staging environment.

[Expo update](https://expo.dev/accounts/kadestanford/projects/sds-local/updates/629397cb-28d5-45d9-9554-6767bd735d71).

## Changes

- Redesigned business subscriptions using the existing light/dark brand palette: branded introduction, prominent store prices, selected-plan checks, feature dividers, and a green checkout action. Checkout and billing disclosures scroll directly after the plan choices instead of covering the plan list.
- Reworked weekly hours into day headers with aligned status switches and labeled opening/closing controls that wrap on narrow screens. Time controls announce the day and field to assistive technology; editing is disabled while saving.
- Removed duplicate titles from business overview/edit sections and nested sheets: profile, contact, location, hours, events, updates, rewards, photos, staff, publishing, QR/sharing, and appointment setup. Counts, actions, descriptions, and distinct subsection titles remain.

## Verification

- 106 focused regression tests passed across seven test files; mobile TypeScript passed.
- Subscription, Hours panel, and saved-details component lint passed. Broader edited-file lint still finds pre-existing event Date.now purity and appointment ref errors, plus existing unused-variable warnings; full lint is not clean.
- Rendered the actual components with fixture data in both themes at 390px and 320px, including 150% text. No horizontal page overflow. This is browser-rendered React Native layout verification; native device and native picker acceptance remain to be checked.
- Both native bundles exported successfully with stable mobile/package source hashes, rechecked before publication. Bundle inspection confirms both redesigns and staging configuration.
- EAS preview environment, staging Supabase target, Stripe test-key fingerprint, and project preview source/configuration checks passed. Native configuration fields match the previous Preview update.

Built from the shared working tree, preserving its pre-existing subscription and business-creation work. This task changed UI files only; it did not apply backend migrations, send email, or exercise real purchases. No native dependency or runtime change.
