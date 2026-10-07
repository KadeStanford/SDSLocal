# Customer request, calendar and rewards-code staging release

Published 28 September 2026, approximately 23:56 UTC, to Expo Preview/staging.

- Source: `3f01fe7d149aee1a3a0b64f45589d2fc4f138cc8`.
- Group: `005b5495-ad82-4718-b325-af8153b2e9f2`.
- Android: `01a0ea72-0831-7aff-b125-eb83d74257c1`.
- iOS: `01a0ea72-0831-771a-8394-aada129fb439`.
- Channel, branch and environment: `preview`; runtime `0.1.0`; staging Supabase `lgddhdexvwclfrnzjtly`.

[Expo update](https://expo.dev/accounts/kadestanford/projects/sds-local/updates/005b5495-ad82-4718-b325-af8153b2e9f2).

## Included

- Searchable customer service-request list with Active/History filters, focused details, plain-language status guidance and confirmed cancellation. Existing owner-scoped query and cancellation RPC retained. Failed reads keep the last loaded list; stale account/read responses are ignored. Server-confirmed cancellation is reflected before refreshing.
- Calendar with shared theme, responsive month heading, Today navigation, readable event counts and selected-day/full-count accessibility.
- Following filters in the shared scrollable sheet with category/location pickers, highlight/sort choices and reset. Existing business filtering and unfollow confirmation retained.
- Responsive rewards-code sheet opened explicitly from a reward card. Server expiry controls the displayed code; errors, expiry and backgrounding clear it. Routine refresh requests are serialized and dismissed results ignored. The original membership-token endpoint remains authoritative.
- Current Account/alerts, Parish Pass Home, animated startup and native branding source retained. The Preview source contract now also requires these customer-screen implementations and rejects an older rewards fixture.

## Verification and limits

TypeScript and **122 tests across 13 files** pass. Both native bundles exported successfully. Mobile/package source hashes remained stable during export and immediately before publication. Channel readback confirms both exact update IDs, source revision, staging environment and runtime. Preview configuration and Stripe test-key fingerprint preflight passed without printing the key.

Resolved Expo configuration matches the prior animated-startup release after excluding only the separately committed native branding fields: display name, icons/adaptive icon, background, favicon and splash artwork/options. Native libraries, plugins apart from the splash branding options, app identifiers, auth schemes and service configuration remain unchanged. Native fingerprints are not claimed identical after the icon/splash change. Operating-system splash and launcher resources require the separate native build installation; an OTA does not replace them in an installed binary.

No backend, payment/provider or financial configuration was changed by this batch. The pending backend changes from the other task remain untouched. No device or live financial acceptance claim is made.

Close and reopen Preview twice. Physical-device checks remain: narrow widths and large text, keyboard/back gestures, stacked category/location pickers, calendar month boundaries, code scanning and background/expiry/retry, request cancellation failure/recovery, and both themes.

The broader enterprise redesign remains active: rewards wallet hierarchy, service-request entry, public-business/discovery refinement, remaining workspace profile/location/hub and order/scan polish are not completed by this release.
