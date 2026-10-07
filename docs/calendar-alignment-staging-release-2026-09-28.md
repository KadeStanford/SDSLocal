# Calendar alignment and styling correction — staging

Published 28 September 2026, approximately 00:07 UTC on 29 September, to Expo Preview/staging.

- Source: `bf601de1206d769a88c8e38699392bb3f32495e9`.
- Group: `63668e5f-8433-4630-8020-729a8e1bdce5`.
- Android: `01a0ea7c-61a4-73eb-89f8-c0aa8d0b25e8`.
- iOS: `01a0ea7c-61a4-7412-b616-ed28844b07f0`.
- Channel/branch/environment: `preview`; runtime `0.1.0`; app environment `staging`.

[Expo update](https://expo.dev/accounts/kadestanford/projects/sds-local/updates/63668e5f-8433-4630-8020-729a8e1bdce5).

## Phone defect and correction

The supplied screenshot showed the new calendar displaying six columns. The wrapping percentage-width grid displaced Saturdays into the next row and stretched the month to seven rows. The previous rendered action tests did not prove native geometry.

The calendar now renders explicit week rows with seven equal-flex date cells per row. No fractional column width or wrapping grid determines day placement. The month toolbar groups Today and both arrows; spacing, heading copy and cell height are reduced. Selected dates use a smaller themed rounded highlight rather than the large white block. Event counts, full-count accessibility, today indication, date selection and navigation remain.

## Evidence and outstanding checks

- Mobile TypeScript and 40 focused checks across four files pass, including Account/alerts shared UI, Home/startup and rotating rewards code.
- The added regression checks render all 42 dates into six distinct seven-day rows, verifies Sunday through Saturday order, and targets Saturday September 5 precisely. The previous wrapping fixture fails the expanded Preview source guard.
- Native iOS and Android exports succeed. Source hashes remained stable during export and immediately before publication.
- Channel readback verifies both exact update IDs, source revision, runtime and staging environment. Resolved native configuration and both native fingerprints match the preceding combined customer-screen update.
- Account, alerts, Home, startup, branding and the preceding customer screens are retained. No backend/payment changes were included.

Close and reopen Preview twice. A new physical-device check is still required for the actual seven-column alignment, spacing, selected-day event list, narrow widths and large text. Tests and exports are not visual acceptance. The broader redesign remains active; the service-request form components started before the screenshot remain unconnected work in progress.
