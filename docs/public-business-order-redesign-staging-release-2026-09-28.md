# Public business pages and merchant order guidance

## Implementation

Public business pages now show ordering, booking and service-request actions immediately after the business identity. Consultation is secondary when appointments are available. Contact actions follow; compact location, service-area and today's-hours context remains visible. Browseable offerings precede About, reviews and schedules. Weekly hours and mobile-stop maps/details open through themed expandable rows. Existing business imagery and merchant accent bars remain; location icons, directions links and preview notices use semantic theme colors.

Merchant order details use instructions for the server-confirmed stage. Ready orders request pickup scanning; completed orders describe the completed handoff. Pending payment, payment review and refund states describe the required review instead of telling businesses to accept or prepare. The order heading allows badge wrapping at narrow widths.

## Verification and limits

- Mobile TypeScript and 43 focused regressions across four files pass, covering order-stage instructions plus existing customer requests, shared UI and rotating rewards code.
- A source comparison verifies preservation of all 100 existing scoped query, navigation and action calls on the public page.
- Both native bundles exported with stable source hashes. The Preview source guard requires the public details and order-stage components, alongside the existing rewards, Calendar, Account, alerts and Home contracts.
- No backend or production change is included. Actual phone acceptance remains outstanding for representative food, service, retail and mobile businesses; expansion/map interactions, long names, large text, both themes and safe areas need checking.

## Staging publication

Published at `2026-09-29T00:35:02.871Z` (28 September locally).

- Source: `5f8dd6e53e5df6e12e2578ab871391b59cd424d0`.
- Group: `f9c634db-cd55-4f5d-b94b-421236bf37a4`.
- Android: `01a0ea96-2257-7687-ac24-867efb3df33b`.
- iOS: `01a0ea96-2257-7c8a-8753-dcdd136e6758`.
- Channel/branch/environment: `preview`; runtime `0.1.0`; app environment `staging`.

Fresh channel readback verifies both exact platform IDs, source and staging environment. Resolved native configuration and native fingerprints match the preceding request/wallet update. Rewards, Calendar, Account, alerts and Home remain in the published source.

[Expo update](https://expo.dev/accounts/kadestanford/projects/sds-local/updates/f9c634db-cd55-4f5d-b94b-421236bf37a4). Close and reopen Preview twice to load it.

The broader app redesign remains active; workspace identity/location/mobile-stop editors and remaining order/scan and authentication polish remain open. Physical-device acceptance has not been established by these source checks and exports.
