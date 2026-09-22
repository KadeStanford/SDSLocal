# Native capability plan

The mobile app includes the native packages needed for the next feature pass. A
package being installed does not automatically turn on a provider or a paid
service; the feature should stay guarded until its server credentials and
product surface are ready.

## Included in the native client

- `expo-local-authentication`: installed in the native client but disabled in
  the current product flow. No biometric toggle, sign-in button, app lock,
  workspace lock, or scanner prompt is exposed.
- `expo-document-picker`: CSV/JSON menu import in the business workspace.
- `expo-clipboard`: copy links from the branded QR poster and staff invite
  surfaces.
- `expo-print`: print a branded business-page QR poster.
- Native `/b/<slug>` deep links mirror the web business page so an installed
  app can open a scanned poster directly; unsigned visitors see a browse-first
  page with an optional account CTA.
- `@react-native-community/netinfo` and `expo-sqlite`: native-only pending scan
  queue. A scan is submitted only after the server is reachable; the queue
  never grants a reward locally.
- `@react-native-google-signin/google-signin`: native Google ID-token sign-in
  and identity linking. It uses the same Supabase account as email and Apple.
- `@stripe/stripe-react-native`: native Stripe PaymentSheet capability is
  included in the build. Payment UI remains disabled until a publishable key,
  server-side PaymentIntent/webhook flow, and (for Apple Pay) a merchant ID
  are configured.
- `expo-updates`: configured for the EAS Update URL and `ON_LOAD` checks. A
  native build is still required for changes to native packages or config.

## Installed for planned features

- `expo-video` and `expo-audio` are ready for a future media surface. Playback,
  recording, and background audio should be added only with an agreed media
  schema and permission copy.
- `@stripe/stripe-react-native` is ready for a future paid feature. Payment
  flows remain disabled until a Stripe publishable key, merchant settings, and
  server-side PaymentIntent implementation exist.
- `expo-store-review` is available for a later, low-frequency review prompt
  after a meaningful successful action.

## Google build variables

Add these values to the mobile build environment before enabling the native
Google button. Do not commit them to source control:

```text
EXPO_PUBLIC_GOOGLE_AUTH_ENABLED=true
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<Web client ID from the sds-local-508919 project>
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<iOS client ID from the same project>
EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME=com.googleusercontent.apps.<iOS client ID prefix>
```

The Android OAuth client must include the app's signing certificate SHA-1. The
iOS client must use the app bundle identifier
`com.stanforddevelopmentsolutions.sdslocal`. Google provider settings in
Supabase still need to use the Web client ID and secret.

## Share URL requirement

The QR poster intentionally refuses loopback URLs. Set
`EXPO_PUBLIC_SHARE_BASE_URL` to a deployed HTTPS web address (or a reachable
LAN HTTPS address) before printing. The generated URL is `/b/<business-slug>`;
the public page handles visitors without an account and can route them into
account creation.
