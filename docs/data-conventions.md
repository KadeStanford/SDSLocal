# Data and storage conventions

## Database

- UUID primary keys are generated server-side.
- Timestamps use `timestamptz`; calendar-only values use `date`; local operating times use `time`.
- Currency used for arithmetic is stored as integer minor units with an ISO 4217 currency code.
- User-facing strings have database and validation-layer bounds.
- Canonical entities are referenced by foreign key; transactional rows do not copy names, descriptions, or image URLs.
- JSON is reserved for genuinely flexible, low-query metadata. Queryable state uses typed columns.
- Public slugs are lower-case, hyphenated, immutable-by-default identifiers with a unique index.
- Soft lifecycle states are explicit. User-requested deletion and legally required retention are separate workflows.

## Pagination and payloads

- Explore and event pages default to 20 rows.
- Follower admin lists use 25–50 rows.
- Loyalty history defaults to 25 rows and is loaded only when a card is opened.
- List endpoints select only card fields and one thumbnail; they never return full galleries or complete offerings.
- Cursor pagination is preferred for activity/history tables; stable ordered page queries are acceptable for small editorial lists.

## Analytics and logs

- Recent analytics events default to 45-day retention.
- Daily aggregates are the long-term source for business dashboards.
- Logs never include access tokens, passwords, image bytes, full request bodies, or complete user profiles.
- Anonymous visitor uniqueness uses short-lived, privacy-conscious hashes; no cross-site fingerprint is created.

## Media

- Client resizing reduces upload bandwidth, but the server remains authoritative for type, dimensions, size, and ownership.
- Canonical storage contains only approved variants and minimal metadata.
- Temporary sources are removed after successful processing or by scheduled cleanup.
- Storage objects are immutable/versioned and use long cache lifetimes.
- Replacements update references before delayed orphan cleanup removes prior variants.
