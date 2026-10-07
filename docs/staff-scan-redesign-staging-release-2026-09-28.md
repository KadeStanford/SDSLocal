# Staff Scan refinement — staging

## Changes

Staff Scan uses the shared themed primary/secondary/tertiary buttons for scanning, manual code review, confirmation, recovery and success. Submission communicates loading and blocks confirmation/cancellation while busy. Manual code entry has an accessible name. Selected reward actions use the shared neutral selected surface and readable theme accent. Purchase entry is smaller; disclosure copy can wrap; activity totals use two columns; confirmation rows can wrap long values.

The existing camera overlay, permission flow, QR capture, scanner reducer, transaction requests, idempotency/recovery behavior and offline wording remain intact. Pickup handoff retains its existing panel. Previous reviews, RSVP, Account, alerts, Home, rewards, calendar, workspace and branding changes remain included. Concurrent subscription source is preserved in the recorded stable bundle snapshot.

## Verification

- Mobile TypeScript passes.
- 114 checks across scanner domain, merchant UI and pickup navigation pass.
- Both iOS and Android bundles export successfully from stable source; publication rechecks the same hashes.
- Preview environment resolves to staging project `lgddhdexvwclfrnzjtly`; Stripe key fingerprint matches the established test key.
- Source guard now also requires the shared scanner presentation.

## Published OTA

- Preview group: `ff9b5ecf-025d-451e-87bd-76bd79cd1b21`.
- Source: `165af7197d74f7a41c94df212d9440f394fd0f43`.
- Android: `01a0eac8-08d7-7ec4-9511-689f8b80e4b7`.
- iOS: `01a0eac8-08d7-72fa-80cc-96639a54dc98`.
- Fresh channel readback confirms exact IDs, Preview branch/environment, staging app configuration and runtime `0.1.0`. Resolved native configuration and fingerprints match the preceding customer-fixes OTA.

## Acceptance

Phone review remains pending for both themes, enlarged text, manual entry/keyboard, camera permission/flash, confirmed award/redemption, uncertain-result recovery and pickup handoff. Automated checks do not establish native geometry, camera behavior or a live financial transaction. The app-wide redesign objective remains active.
