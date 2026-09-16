# Initial cost and storage budgets

These are operational targets, not quality-breaking hard limits. Revisit them with real beta measurements.

## Per-business media target

| Asset           |    Allowance |       Typical optimized bytes |
| --------------- | -----------: | ----------------------------: |
| Logo variants   |            3 |                ≤ 150 KB total |
| Cover           |     1 active |                    150–450 KB |
| Gallery         |    10 images |  150–400 KB full variant each |
| Offering images | initially 50 |   50–150 KB card variant each |
| Event images    |  1 per event | generally ≤ 250 KB card image |

Target an established, media-rich business at 5–20 MB total. The initial configurable enforcement ceiling is 50 MB per business, with administrator review rather than silent quality degradation.

## Transfer targets

- Public business page initial transfer: aim below 1 MB on a cold mobile visit, excluding user-initiated gallery expansion.
- Explore card: text plus one 20–60 KB thumbnail; no full offerings or galleries.
- Event/offering card image: normally 50–150 KB.
- Full image: normally 150–400 KB, with visual quality taking precedence for complex photos.
- Lazy-load below-the-fold media and rely on immutable CDN caching for repeat visits.

## Database and analytics

- Description limits are enforced in SQL and shared validation.
- Retain low-value raw analytics for 45 days by default; aggregate into daily rows.
- Never record scroll pixels, hover events, animation events, or repetitive component impressions.
- Review indexes from real query plans instead of indexing every column.

## Quota alerts

Create provider alerts at 50%, 75%, and 90% of database disk, object storage, cached and uncached egress, MAU, Edge Function, Realtime, and image-transformation allowances. The SDS admin console will surface the same thresholds and per-business media bytes.

## Beta audit checklist

Measure database bytes, object bytes, bytes per business, bytes per photo, largest assets, cache hit behavior, public-page transfer, Explore-card transfer, analytics rows per session, orphan count, and transformation usage before public beta.
