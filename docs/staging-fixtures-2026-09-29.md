# Staging customer and business fixtures — September 29, 2026

## Scope

Expanded the 21 existing `demo-*` businesses on staging project `lgddhdexvwclfrnzjtly`. User-created draft businesses were not part of this seed. Preserved existing catalog entries and payment connections. No OTA is required for this data and backend update.

Every demo business has an active rewards program, published past and upcoming events, a catalog, a logo, a banner, and gallery imagery. Final media inventory contains 670 ready image variants with no missing Storage objects. All 670 public URLs returned valid image responses; transient throttled responses passed on a slower retry. Catalog items and events have published images. Retail coverage includes boutiques, clothing shops, gift shops, and florists. Imagery combines existing assets, category-appropriate stock photography, and demo logo artwork; it is illustrative rather than a depiction of real merchants.

Final catalog: 139 active offerings, 103 events (54 upcoming published events), and 21 active rewards programs. Added 84 events, 68 catalog entries, 13 rewards programs, eight published mobile stops, and three Cypress pay-in-person services. Cypress now offers five bookable services. The new mobile schedule includes a stop active on September 29 and seven subsequent stops. Retail profile contact details are explicitly fictional staging data.

## Customer scenarios

Created four confirmed password-login accounts directly, without email delivery. Passwords are in the ignored local handoff `.codex-tmp/comprehensive-fixtures/customer-logins.md`; do not commit credentials.

| Account                       | Scenario                                                                                                                         |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `foodie@demo.sdslocal.test`   | Miles Carter: 21 attended events, six order histories, seven followed businesses, nine reward wallets, four redeemable rewards   |
| `explorer@demo.sdslocal.test` | Camille Brooks: 21 attended events, six order histories, seven followed businesses, nine reward wallets, four redeemable rewards |
| `regular@demo.sdslocal.test`  | Jordan Ellis: 21 attended events, six order histories, all 21 businesses followed, nine reward wallets, eight redeemable rewards |
| `fresh@demo.sdslocal.test`    | Taylor Reed: empty-state testing; no attendance, orders, follows, or rewards                                                     |

The populated accounts each have completed, confirmed, and requested appointment examples. The fixture includes saved future events, future RSVPs, verified event reviews with some merchant replies, order reviews, service requests, and reward transactions. Order histories include completed, refunded, and expired checkouts with receipt snapshots and activity timelines. They are synthetic terminal records with no provider payment IDs; no actual charges or refunds occurred. External notification delivery was suppressed for the new fixture records. Demo reviews are labeled `[Demo review]`.

## Attended-events repair

The `my_event_review_candidates` endpoint returned a storage error because `service_role` lacked the required event/RSVP read grants. Migration `20260929000800_attended_event_read_grants.sql` grants only the columns read by the endpoint. Customer scoping remains enforced by the endpoint. The user's account currently has zero checked-in RSVPs, which should display the normal empty state.

Verified through authenticated API requests: all four accounts sign in; the three populated accounts each return 21 attended events; the fresh account and the original demo customer return an empty list. A real review submission succeeded, repeating it was idempotent, and an account without attendance was denied.

## Media pipeline repairs

Deployed the existing `business-media-upload-intent` function. Migration `20260929000900_storage_preflight_content_length.sql` accepts the Storage preflight `contentLength` field as well as the persisted `size` field. Ownership, membership, MIME, expiry, intent, and maximum-byte checks remain enforced. Corrected the pinned ImageMagick package's WASM path to `x86/magick.wasm` and deployed `finalize-business-image`.

Verified the normal owner flow end to end: intent creation, three authenticated/RLS-protected uploads, actual image decoding/re-encoding, and published gallery finalization. SQL regression checks cover the empty attendance query and valid/invalid upload intent boundaries.

Bulk image completion used a temporary staging-only function restricted to the demo owner, an explicit business allowlist, bounded payloads, and a two-hour expiry. It retained real image decoding and media finalization. The temporary function was deleted (verified HTTP 404), the previously inactive Juniper demo-owner membership was restored to inactive, and the temporary Magnolia demo-owner membership was removed. Final cleanup evidence is stored alongside the fixture verification results.

## Verification evidence

Ignored local artifacts under `.codex-tmp/comprehensive-fixtures/`:

- `fixture-manifest.json`: deterministic seeded entity IDs and data, excluding passwords.
- `account-verification.json`: account login, attendance, order, and follow checks.
- `review-wallet-verification.json`: review authorization/idempotency and rewards checks.
- `booking-status-verification.json`: appointment setup/status and order receipt checks.
- `normal-upload-verification.json`: normal media upload flow result.
- `final-coverage.json`: final per-business media/catalog/event coverage and Storage references.
- `public-media-verification.json`: public media HTTP validation.
- `cleanup-verification.json`: temporary importer deletion and membership restoration.

Do not rerun the broad staging seed as part of this handoff: existing fixtures and passwords are preserved. The scoped scripts and generated SQL for this enrichment are retained in the ignored fixture directory; `seed-content.sql` contains credentials and must remain untracked.
