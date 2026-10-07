import { businessSearchScore, discoverySearchIntent, searchWords } from './discovery-search';
import {
  isPublishedUpcomingEvent,
  type DiscoveryBusiness,
  type DiscoveryEvent,
} from './discovery-core';

export interface SuggestionOffering {
  id: string;
  business_id: string;
  name: string;
  description: string;
  sectionName?: string;
}
export interface DiscoverySuggestion {
  id: string;
  kind: 'business' | 'item' | 'service' | 'event';
  title: string;
  subtitle: string;
  businessId: string;
  businessName?: string;
  businessPhotos?: DiscoveryBusiness['business_photos'];
  targetId: string;
  score: number;
}
export function discoverySuggestions({
  query,
  businesses,
  offerings,
  events,
  now,
}: {
  query: string;
  /** Already filtered for active status, access, blocks, area, and selected filters. */
  businesses: readonly DiscoveryBusiness[];
  offerings: readonly SuggestionOffering[];
  events: readonly DiscoveryEvent[];
  now: Date;
}): DiscoverySuggestion[] {
  if (searchWords(query).join('').length < 2) return [];
  const byId = new Map(
    businesses.filter((b) => !b.status || b.status === 'active').map((b) => [b.id, b]),
  );
  const candidates: DiscoverySuggestion[] = [];
  for (const b of byId.values()) {
    const score = businessSearchScore(b, query);
    if (score > 0)
      candidates.push({
        id: 'business:' + b.id,
        kind: 'business',
        title: b.name,
        subtitle: [b.category_summary, b.city].filter(Boolean).join(' · '),
        businessId: b.id,
        businessName: b.name,
        businessPhotos: b.business_photos,
        targetId: b.id,
        score,
      });
  }
  const childScore = (
    name: string,
    description: string,
    category: string,
    b: DiscoveryBusiness,
    term = query,
  ) =>
    businessSearchScore(
      { ...b, name, description, category_summary: category, offering_search_text: '' },
      term,
    );
  for (const item of offerings) {
    const b = byId.get(item.business_id);
    if (!b) continue;
    const score = childScore(item.name, item.description, item.sectionName ?? '', b);
    if (score > 0)
      candidates.push({
        id: 'offering:' + item.id,
        kind: b.business_type === 'services' ? 'service' : 'item',
        title: item.name,
        subtitle: b.name,
        businessId: b.id,
        businessName: b.name,
        businessPhotos: b.business_photos,
        targetId: item.id,
        score,
      });
  }
  const eventQuery = searchWords(query)
    .filter((w) => !['event', 'events', 'upcoming'].includes(w))
    .join(' ');
  for (const event of events) {
    const b = byId.get(event.business_id ?? '');
    if (!b || !event.id || !event.title || !isPublishedUpcomingEvent(event, now)) continue;
    const score = eventQuery
      ? childScore(event.title, '', '', b, eventQuery)
      : /\bevents?\b/i.test(query)
        ? 80
        : 0;
    if (score > 0)
      candidates.push({
        id: 'event:' + event.id,
        kind: 'event',
        title: event.title,
        subtitle: `${b.name} · ${new Date(event.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        businessId: b.id,
        businessName: b.name,
        businessPhotos: b.business_photos,
        targetId: event.id,
        score,
      });
  }
  const broad = discoverySearchIntent(query).broad;
  candidates.sort(
    (a, b) =>
      (broad ? Number(b.kind === 'business') - Number(a.kind === 'business') : 0) ||
      b.score - a.score ||
      Number(b.kind === 'business') - Number(a.kind === 'business') ||
      a.title.localeCompare(b.title) ||
      a.id.localeCompare(b.id),
  );
  const counts = new Map<string, number>(),
    seen = new Set<string>();
  return candidates
    .filter((s) => {
      // Leave room for other result types and prevent repeated item titles at one business.
      const key = `${s.kind}:${s.businessId}:${s.title.toLowerCase()}`;
      if (seen.has(key) || (counts.get(s.kind) ?? 0) >= 3) return false;
      seen.add(key);
      counts.set(s.kind, (counts.get(s.kind) ?? 0) + 1);
      return true;
    })
    .slice(0, 7);
}

/** Safe Postgres prefix query. Tokens contain only normalized letters/numbers. */
export function offeringPrefixQuery(normalizedQuery: string): string {
  return searchWords(normalizedQuery)
    .filter((w) => w !== 'and')
    .slice(0, 12)
    .map((w) => `${w}:*`)
    .join(' & ');
}
