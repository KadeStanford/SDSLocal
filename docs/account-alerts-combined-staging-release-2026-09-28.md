# Combined Account, alerts and Parish Pass staging release

Published **28 September 2026, 23:33 UTC**. The earlier home OTA was built from a copied checkout with older Account and alerts screens. This release uses the combined main workspace; no older checkout was republished.

## Included source

- Compact Account/settings rows and unread badges; shared searchable alerts with customer/business audience separation; focused notification preferences.
- Parish Pass customer home, discovery shortcuts/feed, selected light/dark icons and the current JavaScript startup branding.
- Payment setup overview and focused connection/pickup settings; Save remains beside unsaved availability controls.
- Event inbox/detail/creation, update/staff lists and focused composers, rewards overview/rules, photo grid/detail and actionable publishing requirements.
- Existing cancellation/refund request action and quiet background refresh behavior from the other completed staging task.

The six Account/alerts files were compared byte-for-byte with the refreshed home/branding checkout and match. Additional startup-animation work in that chat remains separate. The original database/provider requests and destructive confirmations remain; source preservation is not proof of live financial acceptance.

## Release evidence

- Source: `5fa0a5eda43176d5760ac4f164c2b2c4e362473c`.
- Preview group: `563728bc-b854-48a5-b3ea-f6d42c643679`.
- Android: `01a0ea5d-f472-77f3-9c24-f4dc55288db5`.
- iOS: `01a0ea5d-f472-747b-9ff4-74191e24e174`.
- Active channel/branch: `preview`; EAS environment: `preview`; app environment: `staging`; runtime: `0.1.0`.
- Staging Supabase: `lgddhdexvwclfrnzjtly`; Stripe test publishable-key fingerprint verified without logging the key.
- Channel readback verifies both updates and unchanged native fingerprints relative to the compatible Preview build.
- Both native bundles exported successfully into a separate output directory. Source hashes were stable during export and immediately before publication.
- Mobile TypeScript and 103 tests across ten files pass; whitespace checks pass. No clean-lint claim is made.
- Listing-plan tests were moved outside Expo Router's app directory before the successful export.

[Expo update](https://expo.dev/accounts/kadestanford/projects/sds-local/updates/563728bc-b854-48a5-b3ea-f6d42c643679).

## Future Preview releases

Run the existing EAS Preview environment/configuration preflight against the checkout being bundled. `verify-expo-preview-config.mjs` now calls `verify-preview-source.mjs`, which requires the combined Account, shared alerts and customer home implementations. An old Account fixture is rejected. Deliberately update the contract when replacing these implementations. A copied checkout must include the latest committed combined source; a matching Git revision alone does not prove its copied files are current.

## Phone acceptance

Close and reopen Preview twice. Confirm Account shows compact rows, alerts show search/unread and customer/business views, and the new Parish Pass home/icons remain. Both themes, narrow width, large text, keyboard/back gestures, native date/photo pickers and preference failure/retry still require phone acceptance. The broader redesign objective remains active.
