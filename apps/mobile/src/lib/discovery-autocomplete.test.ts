import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';
import { discoverySuggestions, offeringPrefixQuery } from './discovery-autocomplete';
import { businessSearchScore } from './discovery-search';
import type { DiscoveryBusiness, DiscoveryEvent } from './discovery-core';

type Template = {
  key: string;
  type: string;
  label: string;
  suffix: string;
  description: string;
  event: string;
  items: [string, number, string][];
};
const templates = createRequire(import.meta.url)(
  '../../../../scripts/staging-playground/templates.cjs',
) as Template[];
const businesses: DiscoveryBusiness[] = templates.map((t) => ({
  id: t.key,
  name: `North ${t.suffix}`,
  business_type: t.type,
  category_summary: t.label,
  description: t.description,
  offering_search_text: t.items.map((i) => `${i[0]} ${i[2]}`).join(' '),
  city: 'Hammond',
  created_at: '2026-09-01',
  status: 'active',
}));
const offerings = templates.flatMap((t) =>
  t.items.map((item, i) => ({
    id: `${t.key}-${i}`,
    business_id: t.key,
    name: item[0],
    description: item[2],
  })),
);
const now = new Date('2026-09-30T12:00:00Z');
const events: DiscoveryEvent[] = templates.map((t) => ({
  id: 'event-' + t.key,
  business_id: t.key,
  title: t.event,
  starts_at: '2026-10-02T18:00:00Z',
  is_published: true,
  publish_at: null,
  archived_at: null,
}));
const suggest = (query: string) =>
  discoverySuggestions({ query, businesses, offerings, events, now });

describe('seed-catalog search matrix', () => {
  for (const t of templates) {
    for (const [name] of t.items) {
      it(`${t.key}: exact item ${name}`, () => {
        expect(
          businessSearchScore(
            businesses.find((b) => b.id === t.key)!,
            name,
          ),
        ).toBeGreaterThan(0);
        expect(
          suggest(name).some(
            (s) => s.kind !== 'business' && s.title === name && s.businessId === t.key,
          ),
        ).toBe(true);
      });
    }
    it(`${t.key}: event ${t.event}`, () =>
      expect(suggest(t.event).some((s) => s.kind === 'event' && s.businessId === t.key)).toBe(
        true,
      ));
    it(`${t.key}: partial business name`, () =>
      expect(
        businessSearchScore(
          businesses.find((b) => b.id === t.key)!,
          `North ${t.suffix.slice(0, 4)}`,
        ),
      ).toBeGreaterThan(0));
  }
  it.each(['dinner', 'supper', 'dinnre', 'restraunts', 'I want dinner near me'])(
    'meal intent %s',
    (query) => {
      const suggestions = suggest(query);
      expect(suggestions[0]?.kind).toBe('business');
      expect(
        query === 'restraunts'
          ? ['pizza', 'cajun', 'tacos', 'bbq', 'deli', 'brunch', 'coffee', 'bakery']
          : ['pizza', 'cajun', 'tacos', 'bbq', 'deli'],
      ).toContain(suggestions[0]?.businessId);
    },
  );
  it.each([
    ['haircut', 'salon'],
    ['flowers', 'florist'],
    ['clothes', 'boutique'],
    ['hvac', 'hvac'],
    ['lawn', 'landscape'],
    ['coffee', 'coffee'],
  ])('synonym %s', (query, id) =>
    expect(suggest(query).some((s) => s.businessId === id)).toBe(true),
  );
  it('shows service type for a service catalog item', () =>
    expect(suggest('Cooling diagnostic visit').some((s) => s.kind === 'service')).toBe(true));
  it('matches transposed and incomplete names', () => {
    expect(suggest('Peppernoi pizza').some((s) => s.title === 'Pepperoni pizza')).toBe(true);
    expect(suggest('Margher').some((s) => s.title === 'Margherita pizza')).toBe(true);
    expect(suggest('No').some((s) => s.kind === 'business')).toBe(true);
  });
  it.each([
    'quantum telescope repair',
    'scuba certification',
    'birthday transmission repair',
    'zxqv12345',
  ])('does not invent matches for %s', (query) => expect(suggest(query)).toEqual([]));
  it('keeps result types bounded and IDs unique', () => {
    const result = suggest('coffee');
    expect(result.length).toBeLessThanOrEqual(7);
    expect(new Set(result.map((s) => s.id)).size).toBe(result.length);
    expect(result.filter((s) => s.kind === 'business').length).toBeLessThanOrEqual(3);
  });
  it('does not reintroduce excluded businesses through items or events', () => {
    expect(
      discoverySuggestions({ query: 'pizza', businesses: [], offerings, events, now }),
    ).toEqual([]);
    expect(
      discoverySuggestions({
        query: 'pizza',
        businesses: businesses.map((b) => ({ ...b, status: 'draft' })),
        offerings,
        events,
        now,
      }),
    ).toEqual([]);
  });
  it('excludes old, archived, and unpublished events', () => {
    const base = events.find((e) => e.business_id === 'pizza')!;
    const invalid = [
      { ...base, starts_at: '2026-01-01T00:00:00Z' },
      { ...base, archived_at: now.toISOString() },
      { ...base, is_published: false },
    ];
    expect(
      discoverySuggestions({
        query: 'pizza',
        businesses,
        offerings: [],
        events: invalid,
        now,
      }).filter((s) => s.kind === 'event'),
    ).toEqual([]);
  });
  it('makes safe prefix lookup queries without raw query operators', () => {
    expect(offeringPrefixQuery('pepperoni pizz')).toBe('pepperoni:* & pizz:*');
    expect(offeringPrefixQuery("pizza' | !:* & (bread)")).toBe('pizza:* & bread:*');
    expect(offeringPrefixQuery('')).toBe('');
  });
});
