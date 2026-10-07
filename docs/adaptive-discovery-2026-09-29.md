# Adaptive Home discovery — review build

Status: Home design approved by the user on September 29, 2026, including category carousels and position indicators. No new OTA published. The user requested a pending-release inventory; this design approval is not an instruction to publish the full pending bundle.

## Experience

The approved branded header and wide business cards stay consistent. The collections, filter buttons, lead business, and ordering adapt to the visit. The screen does not reshuffle while someone reads it or when a rating response arrives. A new Home focus, pull-to-refresh, or return from the background while Home is visible starts another edition and refreshes context. Brief system interruptions do not reshuffle it. Returning from an in-screen business detail preserves the existing edition and scroll position.

| Local time  | Preferred collections, when matching inventory exists |
| ----------- | ----------------------------------------------------- |
| 05:00–10:59 | Breakfast; coffee                                     |
| 11:00–14:59 | Lunch; coffee; current/imminent mobile stops          |
| 15:00–16:59 | Coffee; sweet treats                                  |
| 17:00–20:59 | Dinner; desserts                                      |
| 21:00–04:59 | Confirmed-open businesses; honest general fallback    |

Service businesses, shops, rewards, recently added businesses, and community experiences mix into these collections. The planner limits food and retail to two collections each and other families to one each before a general remainder section. There are up to five curated collections, with two to six matching businesses each in a horizontal, snapping carousel, followed by remaining local businesses. Each business appears once in the generated feed. A category needs at least two remaining matches to become a carousel; single matches remain in the general discovery row and explicit category filters. Wide cards reveal the next card at the edge, retain logos and banners, and align their action buttons across each row. Section filters retain their complete matching set, even when a business appears under a different heading in the mixed feed.

New service/retail/community category collections form automatically when at least two businesses in the local pool share a category, such as Beauty & wellness. Broad singleton businesses remain available in Services or the remainder section. A future structured `discoveryTags` input can supplement current category, description, and published offering-search text. No fabricated merchant capabilities or ratings are needed.

## Eligibility before variety

- Only active businesses from the existing authorized discovery result can enter the planner. The existing blocked-business filtering remains upstream.
- With coordinates, the default radius is 15 miles; unknown or distant locations are not presented as nearby. A manually selected city can be browsed without location permission. Home checks an existing foreground permission but never prompts simply because the tab opened.
- Mobile locality comes from a published stop that has not ended and begins within six hours, using that stop's coordinates. An old base address or tomorrow's stop cannot establish a nearby match. The same stop distance is used on the card.
- A meal collection requires relevant published text and excludes businesses whose hours say closed. Missing hours do not become an “Open now” claim. General discovery can still show a closed business for planning.
- Time uses the selected area's or nearest business's IANA zone, falling back to a single shared inventory zone or the device zone. Calendar season is hemisphere-aware when an area latitude is known; otherwise seasonal collections are omitted. Seasonal wording must match actual inventory (for example, pumpkin/harvest or holiday gifts).
- Explicit search, feature/category filters, following, and sorting keep their existing behavior instead of being overridden by the adaptive planner.

## Freshness and memory

Ranking combines collection relevance, confirmed-open status, proximity, a small deterministic per-visit tie-breaker, and a penalty for recently presented businesses/collections. The previous leading business gets an additional penalty when an alternative exists. This avoids popularity-only ranking and gives newly added businesses a chance.

Local history is isolated by account/guest and coarse area, with up to eight recent editions considered for seven days. It records collection IDs and the first three planned business IDs, not a claim that every below-the-fold card was viewed. The history is device-local and is not uploaded. Storage errors fall back to memory and do not prevent browsing. This is not a guarantee of never repeating: a three-business catalog or a single relevant dinner restaurant will recur. The planner favors relevance over making up categories merely to look different.

## Weather contract and current limitation

The pure planner accepts optional `DiscoveryWeather`: observation timestamp, coordinates, condition, and temperature in Celsius. It rejects future/stale observations (older than 90 minutes), observations farther than 20 miles, invalid coordinates, and invalid temperatures. Rain can favor coffee; heat can favor cold drinks or frozen treats; cold can favor soup/hot drinks. Every collection still requires matching business inventory.

**No live weather provider exists in this app yet, and this change does not add a third-party weather request.** The Home integration currently supplies no weather, so time/location/inventory/season rules run normally. The rainy preview is an explicit weather simulation. Before enabling real weather, connect a cached backend weather provider to this contract, use coarse selected-area coordinates, establish its commercial usage terms, and retain the same time-only fallback on failure. No Supabase schema migration, native dependency, or remote seeded data mutation was performed for this review.

## Implementation

- `apps/mobile/src/lib/discovery-feed.ts`: deterministic section planner and eligibility/ranking rules.
- `apps/mobile/src/lib/discovery-history*.ts`: bounded, validated local rotation history, web/native adapters.
- `apps/mobile/src/app/(tabs)/explore.tsx`: visit lifecycle, published stop coordinates, context selection, persisted recent history, search/filter preservation, swipe-back underlay.
- `apps/mobile/src/components/discovery-business-feed.tsx`: matching collection controls and deduplicated sections.
- Home header and business cards use the selected branded/wide-card design, showing both logo and banner with compact rating/status pills.

For a larger catalog, move geographic candidate selection and structured offering tags into a paginated discovery RPC before increasing the client candidate count. Preserve the pure planner contract, stable edition IDs, and explicit filter behavior. The current implementation uses the app's existing discovery request.

## Review evidence

`DISCOVERY_CONTEXT_RENDER_DIR` on `discovery-home.test.tsx` renders morning, lunch, dinner, and simulated-rain scenarios using the actual planner and React Native Web components. The fixture businesses/categories come from the seed catalog; hours, schedules, ratings, logo artwork and distances are controlled test data. Native symbols are approximated. These are not captures of a live phone session.

Review gallery: `.codex-tmp/discovery-context/index.html`; full paired images are `morning-review.png`, `lunch-review.png`, `dinner-review.png`, and `rain-review.png`. `day-comparison.png` shows the top of the three time-of-day feeds.

Validation covers meal boundaries/time zones, DST/hemisphere selection, missing metadata, stale opening flags, active/inactive businesses, locality, expired/unpublished/distant mobile stops, missing/stale/distant weather, seasonal inventory, growing categories, deterministic visits, repeat-lead suppression, deduplication, full section filters, sparse inventory, and history persistence/failure. Native phone validation remains part of the approved staging review.

## Carousel refinement

The local review catalog now contains 14 sample businesses, including additional coffee/breakfast, lunch/dinner, home-service, mobile, and retail examples. This is fixture-only expansion, not a mutation of hosted staging businesses. Every fixture includes a logo, cover photo, and sample review summary. Lunch demonstrates four lunch matches, three mobile matches, three service matches, two additional coffee matches, and two shops. Business selection and daypart rules are still produced by the actual planner.

Updated paired previews and scrollable component renders: `.codex-tmp/discovery-carousels/index.html`. These are React Native Web renders; final native gesture testing remains for the phone review after OTA approval.

## Indicators and retail expansion

Carousels show an accent position marker, up to five visible dots, and an accessible “Business X of Y” count. Scroll events update position; a changed collection or card width resets the row. Single cards have no carousel indicator.

Boutiques, clothing shops, gift shops, and florists have explicit category matches and filters; unrelated services cannot enter these collections through matching description words. Two retail collections can mix into each adaptive edition, while all matching category filters remain available.

`supabase/seed/discovery-retail.json` contains 12 additional fixtures (three per category). The same data feeds the 26-business component preview catalog and `scripts/seed-staging-discovery-retail.cjs`. The staging seeder is restricted to the configured staging URL, requires the billing lock and existing demo owner, and uses reserved fixture IDs. It does not create auth users, send mail, add fabricated public reviews, or publish an OTA. Existing rows are preserved on repeat runs.

Staging business records, category links, and weekly hours were seeded successfully. Photo completion is currently blocked: the configured management token cannot read service keys; the app's upload-intent Edge endpoint is not deployed, and normal authenticated storage uploads are rejected by the existing RLS policy even after a valid bounded intent is created. No policies or backend functions were changed. The preview uses complete sample imagery, but the newly seeded staging shops currently use the app's missing-photo fallback. Rerun the seeder after the existing upload flow is repaired; use `--apply --verify` for read-only fixture counts. Supply `SDS_FIXTURE_SHARP_MODULE` if sharp is provided by a separate local runtime.

Latest visual evidence: `.codex-tmp/discovery-indicators/retail-review.png` and `lunch-review.png`; morning, dinner, and simulated-rain comparisons are alongside them. These are component renders, not phone screenshots. Checks: 71 focused tests, mobile TypeScript, changed-file ESLint, and horizontal-scroll/image-load checks at 390px and 320px widths passed.

## Hosted fixture completion — September 29

The earlier media blocker is resolved. The existing upload-intent function was deployed, Storage preflight size handling was repaired without weakening ownership or byte limits, and the finalizer's ImageMagick WASM path was corrected. All 21 existing demo businesses now have logos, banners, and gallery imagery; every active catalog item and event has an image. Twelve retail shops have completed profiles and rewards/event content. See [staging fixture coverage and customer scenarios](staging-fixtures-2026-09-29.md) for verification and test-account details. The temporary bulk importer was deleted and temporary upload memberships were restored.
