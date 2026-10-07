# Approved business operations OTA — September 30, 2026

This release corrects the omission of approved business-operation prototypes from the previous Discover/search/forms OTA. Authorization: the user requested all staged work, approved the Menu setup preview, then explicitly confirmed “yes i meant all of that.”

## Included in the app

- Appointments and Requests bottom navigation tabs for accounts owning service businesses, alongside Manage, Staff Scan and eligible pickup Orders. Business selection appears only when more than one eligible business exists. Account remains accessible in the header when the five business destinations are visible.
- Appointment agenda rows grouped by local business date, retaining the existing booking details, approval, cancellation, refund and setup flows. Requests uses the existing authenticated inbox, form customization and status actions.
- Attention dots on Orders, Appointments and Requests. Dots represent outstanding requests across eligible businesses and clear when the work is handled. The opt-in foreground chime is available in Account → Notifications. Initial data loads, account/scope changes and resolving work are silent. Service activity polls every 15 seconds; pickup counts retain the existing 30-second refresh.
- Shared compact Menu/Services catalog presentation: summary totals, search, category tabs, status tabs, item photos, prices and availability. Menu item editing separates details, connected-ordering options and availability. Existing import, reorder, upload and archive actions remain connected.
- Event listing and details: cover photos, date treatment, business-timezone formatting, publication status, guest totals and existing edit/archive/attendee actions.
- Business rewards and rule editor: customer card preview, visit stamps or points, earning and reward sections. Customer wallets and reward details share that card design, using actual balances, progress and ready rewards.
- All previously published Discover search/autocomplete, customer request forms, short codes, order/payment feedback and business page work remain in the bundle.

## Validation

- TypeScript check passed.
- Full mobile suite: 987 tests passed across 76 files.
- ESLint: no errors in changed implementation files; six warnings (unused legacy declarations and effect-dependency/ref warnings).
- 48 rendered app-component layouts checked at 320, 390 and 430 pixels in light/dark themes, with no horizontal page overflow or browser exceptions. Menu search, stock filtering and item selection were exercised.
- Navigation tests cover zero, one and three eligible service businesses with mixed pickup capabilities. Workspace tests cover chooser visibility and initial business scope. Chime tests cover initial loading, account isolation, duplicate refreshes, resolved work and newly arriving work.
- Export checks verify staging Supabase, Stripe test configuration, unchanged native configuration, and stable hashes of all mobile/package source files before and after bundling and before publication.

These checks do not constitute an iPhone native acceptance test. Real device delivery, native badge placement, chime volume and accessibility font scaling still require device verification. No database migration or server-function deployment is introduced by this release.

## Published and verified

- Channel: `preview`; EAS environment: `preview`; app backend: `staging`; runtime: `0.1.0`.
- Update group: `48d30db2-f4c2-4c92-b26b-e53512faa2ac`.
- iOS: `01a0f10a-8d82-78a6-b3ea-24a600565fdb`.
- Android: `01a0f10a-8d82-77c2-936e-29449170f276`.
- Active channel readback verified both IDs, environment, runtime and group at `2026-09-30T06:40:39.888Z`.
- Previous group: `10e1a531-8410-4b0f-9e26-e59d46571481`.
- Both exported bundles passed the feature-marker checks, including actual bottom-tab route names. The chime WAV was included in the asset manifest and uploaded. All 30 changed/new mobile source/test/asset files since the prior export were present in the stable source snapshot.
- Proof files: `.codex-tmp/operations-final-{source,included-source,bundle-verification,verified}.json`; full test results in `.codex-tmp/operations-tests-final.log`; visual results in `.codex-tmp/operations-live-review/verification.json`.

Expo is configured to check on load without delaying startup. Open the preview app to download the OTA, then close and reopen it to apply the downloaded version.
