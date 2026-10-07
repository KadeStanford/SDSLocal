# Approved business redesign — published

Published September 29, 2026 at 2026-09-29T18:19:55.587Z after explicit user approval. Channel/branch/environment preview (staging), runtime 0.1.0.

Group: a5c92824-183a-4bae-9ad2-fcb5a19c8d39

- android: 01a0ee65-0f43-7f44-911a-61041545bfcb
- ios: 01a0ee65-0f43-7757-8a4a-a3c289752289

Active channel readback matched both platforms. Fresh native exports passed staging backend, Stripe test-key and native configuration checks, with stable mobile/package source hashes through export and publish. 193 focused regression tests passed. No customer redesign performed; current customer component screenshots generated with fixture data for review. Native device acceptance remains for the user.

Includes approved Manage, overview, Orders, Alerts, Staff Scan workflow separation, both scanner layouts, and appointment eligibility. Original app colors retained; prior shared work preserved.

## Prior review history

## Dispatch refinement — selected September 29

The user selected Dispatch. Implemented evergreen masthead, Parish Pass mark, featured business action card, operation tiles, consistent filters, scanner surfaces and alert cards while retaining original app theme colors. No dependency added. No OTA published for this revision; awaiting screenshot review.

Validation: 193 focused regression tests passed; component renders for Manage, Staff Scan, Orders (empty), Alerts and services overview in both themes. All fit 390px and 320px, including simulated 150% text. Screenshot artifacts: `.codex-tmp/dispatch-proof/*-review.png`. These use fixture data, browser font substitution and approximate native symbols; they exclude native navigation and camera. Device verification remains before release.

# Business workspace branding and appointment access — staging release

## Release status

**Not published.** The user requires test screenshots before any OTA. The latest light/dark component renders are in `.codex-tmp/business-tab-proof-v2/*-review.png`; publication is held for review. These use fixture data with native icons approximated in a browser, and do not represent installed-device acceptance. The earlier export predates the revision and must not be published; export and verify current source again after review.

The user rejected the second revision's neutral palette. **The original Parish Pass light/dark colors are restored.** The v2 screenshots are rejected references and no longer represent the current palette. React Native Paper was evaluated, briefly added, then removed at the user's request before any component adoption. No Paper dependency remains. Further element styling is awaiting a clearer visual reference; publication remains held. Browser previews use a system sans-serif fallback; physical-device font/layout verification remains outstanding.

## Changes

- Manage, Staff Scan, Orders, Alerts, and business overview use the actual Parish Pass wordmark. The light and dark palettes come from the existing app theme.
- Manage uses grouped business rows, workspace counts, search, underline filters, and a green Add action. Business overview retains its tools inside separated groups.
- Staff Scan separates pickup handoff and rewards with action icons, dividers, and a neutral business context. Existing scan confirmation, offline restrictions, permissions, and reward calculations remain unchanged.
- Orders uses a flat business context, underline queue tabs, and a centered empty state. Filters, polling, business switching, and order actions are retained.
- Alerts uses quieter borders, colored status labels, branded filters, and clearer title/date hierarchy. Open, dismiss, audience, and read filters remain intact.
- Appointments is offered only to service-business owners. Non-service businesses reached through a stale link show an explanation and a return action. Staff retain the existing owner-only explanation.

## Services fixture

The confirmed `kade20413@gmail.com` staging account was added as an active owner of the existing **Cypress & Co Home Care** fixture (`22222222-2222-4222-8222-222222222222`, slug `demo-cypress-care`). This reuses the configured test business instead of creating a duplicate with an unconnected payment account. Existing ownership remains intact.

Verified: two bookable services, seven availability windows, an enabled staging rollout, a connected Square Sandbox location, and a public booking capability. The fixture has pay-in-person and Sandbox deposit services. No account/password changes, emails, real purchases, new bookings, refunds, provider credentials, or rollout expansions were performed.

To test: refresh Manage, open Cypress & Co Home Care, expand Operations, and choose Appointments. Its public preview exposes booking while its existing Sandbox connection and rollout remain enabled.

## Validation

- 193 focused regression tests passed across eight files, including appointment eligibility, owner/staff navigation, scanner state, pickup workspace, alert behavior, button presentation, and light/dark theme isolation.
- Mobile TypeScript, focused lint for the new/modified presentation components and screens, formatting, and diff whitespace checks passed. The large business workspace retains pre-existing unused-variable warnings; this release does not claim repository-wide clean lint.
- Actual components rendered with fixture data in both themes at 390px and 320px, including 150% text. All five screens fit without horizontal overflow. Branding artwork loaded in both themes. Native camera, picker, tab navigation shell, and physical-device layout acceptance remain to be checked.
- The release preserves shared working-tree changes from preceding subscription work. No new native module or runtime change.
