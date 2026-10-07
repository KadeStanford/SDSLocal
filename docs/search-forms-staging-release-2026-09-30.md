# Discover search and customer request forms — staging release

Published with explicit user authorization; verified September 30, 2026, 01:04 America/Chicago.

- Channel and EAS environment: preview; app backend: staging.
- Runtime: 0.1.0. Both iOS and Android active channel entries verified.
- Update group: 10e1a531-8410-4b0f-9e26-e59d46571481.
- iOS update: 01a0f0e9-c27d-7641-9c88-2ee11e15bc2d.
- Android update: 01a0f0e9-c27d-71d0-bb6b-bdb59a85b34e.

Includes intent-aware Discover ranking, typo/prefix matching, grouped scrollable autocomplete with business logos, compact shortcut sizing, event/item destination handling, and redesigned customer request forms and custom questions. Previous app changes remain included.

Validation: 975 mobile tests passed across 74 files; TypeScript and targeted lint passed. The full suite exposed a missing useWindowDimensions mock in an existing shared UI test; the mock now reflects the EventCard dependency. Search was also checked against 160 seeded business names, 1,280 item-to-business matches and 32 relevance scenarios using an offline public catalog snapshot. Browser checks covered 30 autocomplete layouts plus 18 compact-filter cases and scrolling/selection below the fold.

Fresh native exports verified staging backend, Stripe test configuration, unchanged native configuration and stable source hashes before publishing. Active preview-channel readback matched both new update IDs, runtime and environment. No database migration or server-function deployment was needed for this release. Native device acceptance and live search latency remain unverified.

Not included: browser-only business operations tab, activity dot/chime and rewards design proposals. The user was informed before publication that these are not implemented app changes. The newly requested Menu setup design is also a separate preview pending review, at `.codex-tmp/menu-setup-review/index.html`.

Release evidence: `.codex-tmp/search-forms-verified.json`, source and bundle verification records under the same prefix.
