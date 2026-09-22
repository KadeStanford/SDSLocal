# Architecture

```text
Public browser ──┐
Business web ────┼── Next.js ───────────┐
Expo mobile ─────┘                       │
                                        ├── Supabase Auth + Postgres/PostGIS
Shared packages ─ validation/types ─────┤
                                        ├── Storage (optimized variants only)
Trusted jobs / Edge Functions ──────────┘
```

Public business and event pages are real server-rendered webpages. Account-only actions authenticate at the point of action. Mobile deep links use those same HTTPS destinations.

Privileged workflows—including loyalty stamps, redemptions, reversals, moderation, subscription entitlements, image finalization, and administrative actions—are validated in trusted server code. Client state is never authoritative for financial or loyalty outcomes.

Realtime is opt-in for narrow workflows such as an active loyalty scan confirmation. Menus, public profiles, historical events, and analytics use ordinary cached requests.

Square Sandbox pickup ordering uses private Postgres tables and four Edge Functions:
`square-commerce`, `square-oauth-callback`, `square-webhook`, and `square-maintenance`.
The app sends catalog choices and opens Square-hosted checkout. Server-calculated
quotes, atomic capacity reservations, encrypted OAuth credentials, signed webhooks,
and provider reconciliation control money and order state. The existing editorial
menu remains independent. This is physical-goods commerce; RevenueCat continues
to cover digital listing subscriptions only. See [Square commerce](square-commerce.md).

Business-mode pickup uses a visible native Orders tab with a single batched,
session-authorized operator summary. Its inbox is inside `(tabs)` and individual
order details use the root Stack. Active owners and staff can read and fulfill
their own business orders; only owners can refund or configure Square. Queue
reads batch items/counts and never call Square per order. Focus/foreground polling,
versioned leases and server transitions handle concurrent workers. Public pickup
discovery uses a separate minimal batch status RPC; live slots are checked on the
business page and again server-side at checkout.
