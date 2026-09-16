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
