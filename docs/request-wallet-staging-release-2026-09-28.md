# Customer requests, rewards wallet and retained Calendar correction

Published to Expo Preview/staging at `2026-09-29T00:24:22.688Z` (28 September locally).

- Source: `a05a9bfa3fed17e469f22466e38b2546e89103ad`.
- Update group: `d213abad-4f19-4388-a8ba-34925fdc7d0f`.
- Android: `01a0ea8c-5da0-73db-afc2-2e4bb91651ed`.
- iOS: `01a0ea8c-5da0-7341-88a4-1da3336c5611`.
- Channel, branch and environment: `preview`; runtime `0.1.0`; app environment `staging`.

[Expo update](https://expo.dev/accounts/kadestanford/projects/sds-local/updates/d213abad-4f19-4388-a8ba-34925fdc7d0f).

## Changes and verification

Customer service requests now use a draft, review and server-confirmed submission flow. Duplicate submissions are serialized; uncertain retries retain the same reviewed payload and idempotency key. Rewards cards separate points, progress and server-provided available rewards, with scoped state and refresh recovery.

The Calendar correction remains included: explicit seven-column week rows prevent Saturdays wrapping into the next week. The month toolbar, spacing and themed selection highlight are compact. Account, alerts, Home and Parish Pass branding are retained.

Mobile TypeScript and 136 regressions across 15 files pass. After final refresh recovery refinements, 53 focused checks across six files pass. Both native bundles exported successfully with stable source hashes. Fresh channel readback verified both exact platform IDs, source, runtime and staging environment; resolved native configuration and native fingerprints match the preceding Calendar release. A source comparison preserves the wallet's 48 existing database/API calls.

Close and reopen Preview twice to load this update. Physical-device acceptance remains pending, including Calendar alignment, narrow screens, large text, both themes, request submission/recovery and rewards scanning. No production deployment or backend changes were included. The broader redesign remains active.
