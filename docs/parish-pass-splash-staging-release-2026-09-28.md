# Parish Pass animated startup — staging release

Published to Expo `preview` channel and environment on 2026-09-28.

- Group: `acd2a700-c266-4f54-a032-a8284e2e8173`
- Android: `01a0ea62-0f95-7a7c-a0ce-d8c47bbbe636`
- iOS: `01a0ea62-0f95-724d-b4df-1c301f5b3a5b`
- Published source: `1f43af2593fd2395da29e8298d2a4a713b4940e9`
- Runtime: `0.1.0`; resolved app environment: `staging`
- Dashboard: https://expo.dev/accounts/kadestanford/projects/sds-local/updates/acd2a700-c266-4f54-a032-a8284e2e8173

The selected Modern / Architectural emblem settles onto an evergreen canvas,
followed by an ivory Parish Pass wordmark and mint tagline. The overlay fades
into the app after 1.5 seconds. It runs once per app mount, respects Reduce Motion,
and has a bounded fallback for interrupted animations or unresolved accessibility
preferences. Native splash hide errors do not block the JavaScript handoff.

The scalable mark is shared with the Home header in
`apps/mobile/src/components/parish-brand.tsx`. Palette: evergreen `#102D25`, ivory
`#F4F2E9`, mint `#89C9A2`. Brand kit and native-build handoff are documented in
`apps/mobile/assets/branding/parish-pass/README.md`.

The isolated release checkout merges the current Account, alerts, merchant,
Home and order implementations plus the Preview source guard from `5fa0a5e`.
Later customer page redesign work remains in the main checkout and is not part
of this snapshot. The user authorized coordination with “Finish staging payments
and onboarding”; that chat received the selected reference, palette, shared
mark, ownership boundaries, and release details for subsequent redesigns.

Validation: TypeScript passed; 115 tests passed across splash lifecycle, Home,
pickup navigation, UI components and discovery logic. Focused splash/mark/hook
ESLint passed. Inspected a browser composition preview; a physical-device run
has not been performed. EAS successfully exported both native bundles. Channel
readback confirms both platform IDs, group, source revision and staging runtime.
The resolved Expo client/native configuration exactly matches the previous
combined release. Fingerprint hashes are not claimed identical across checkouts,
because dependency junction paths affect fingerprint discovery.

Launcher icons and the operating system's initial splash are embedded native
resources and remain unchanged by this OTA. Those require a new native branding
build. Close and reopen Preview twice to fetch and activate the update.
