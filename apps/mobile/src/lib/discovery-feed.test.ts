import { describe, expect, it } from 'vitest';
import {
  buildDiscoveryFeed,
  discoveryLocalMoment,
  type DiscoveryContext,
  type FeedBusiness,
} from './discovery-feed';

const business = (id: string, extra: Partial<FeedBusiness> = {}): FeedBusiness => ({
  id,
  name: id,
  description: '',
  category_summary: '',
  offering_search_text: '',
  city: 'Hammond',
  created_at: '2026-01-01',
  status: 'active',
  business_type: 'food_drink',
  distanceMiles: 1,
  ...extra,
});
const context = (hour: number, extra: Partial<DiscoveryContext> = {}): DiscoveryContext => ({
  now: new Date(`2026-09-29T${String(hour + 5).padStart(2, '0')}:00:00Z`),
  timeZone: 'America/Chicago',
  visit: 'one',
  coordinates: { latitude: 30.5, longitude: -90.46 },
  ...extra,
});
const catalog = [
  business('cafe', {
    category_summary: 'Coffee, brunch, pastries',
    offering_search_text: 'breakfast biscuit, cold brew',
  }),
  business('lunch', { offering_search_text: 'sandwich salad lunch' }),
  business('dinner', { offering_search_text: 'dinner pasta seafood' }),
  business('services', { business_type: 'services', category_summary: 'Home services, repairs' }),
  business('shop', { business_type: 'retail', category_summary: 'Gifts, home goods' }),
];
catalog.push(...catalog.map((b) => ({ ...b, id: `${b.id}-alternative` })));
const first = (hour: number) => buildDiscoveryFeed(catalog, context(hour)).sections[0]?.id;
describe('time and truthful targeting', () => {
  it('changes the leading meal collection using local time', () => {
    expect(first(8)).toBe('breakfast');
    expect(first(12)).toBe('lunch');
    expect(first(18)).toBe('dinner');
  });
  it('uses time zones, DST, daypart boundaries, and southern seasons', () => {
    expect(
      discoveryLocalMoment(new Date('2026-09-29T16:00:00Z'), 'America/Chicago', 30).daypart,
    ).toBe('lunch');
    expect(
      discoveryLocalMoment(new Date('2026-09-29T16:00:00Z'), 'America/Los_Angeles', 30).daypart,
    ).toBe('breakfast');
    expect(
      discoveryLocalMoment(new Date('2026-03-08T08:30:00Z'), 'America/Chicago', -30).season,
    ).toBe('autumn');
    expect(discoveryLocalMoment(new Date('2026-09-29T16:00:00Z'), 'bad/zone').timeZone).toBe('UTC');
    expect(
      discoveryLocalMoment(new Date('2026-09-29T16:00:00Z'), 'America/Chicago').season,
    ).toBeNull();
  });
  it('never invents meal categories from a generic food business or unrelated service text', () => {
    const plan = buildDiscoveryFeed(
      [
        business('unknown'),
        business('cleaner', {
          business_type: 'services',
          description: 'We clean breakfast rooms.',
        }),
      ],
      context(8),
    );
    expect(plan.filters.some((s) => s.id === 'breakfast')).toBe(false);
  });
  it('recomputes opening hours for the visit, ignoring stale open flags', () => {
    const plan = buildDiscoveryFeed(
      [
        business('breakfast', {
          category_summary: 'Breakfast',
          isOpenNow: true,
          timezone: 'America/Chicago',
          hours: [{ day_of_week: 2, opens_at: '09:00', closes_at: '17:00', is_closed: false }],
        }),
      ],
      context(8),
    );
    expect(plan.filters.some((s) => s.id === 'breakfast')).toBe(false);
    expect(plan.sections.flatMap((s) => s.businessIds)).toEqual(['breakfast']);
  });
  it('only says still open when confirmed, with an honest late-night fallback', () => {
    const plan = buildDiscoveryFeed(
      [business('unknown'), business('closed', { isOpenNow: false })],
      context(0),
    );
    expect(plan.filters.some((s) => s.id === 'open-evening')).toBe(false);
    expect(plan.sections[0]?.title).toBe('Discoveries near you');
  });
});
describe('locality and mobile stops', () => {
  it('excludes inactive, far-away, and unknown-distance businesses from nearby', () => {
    const plan = buildDiscoveryFeed(
      [
        business('near'),
        business('far', { distanceMiles: 70 }),
        business('unknown', { distanceMiles: null }),
        business('draft', { status: 'draft' }),
      ],
      context(12),
    );
    expect(plan.sections.flatMap((s) => s.businessIds)).toEqual(['near']);
  });
  it('falls back to selected city without fabricating distances or nearby mobile claims', () => {
    const plan = buildDiscoveryFeed(
      [business('here', { distanceMiles: null }), business('there', { city: 'Baton Rouge' })],
      context(12, { coordinates: undefined, city: 'Hammond' }),
    );
    expect(plan.sections.flatMap((s) => s.businessIds)).toEqual(['here']);
    expect(plan.sections[0]?.title).toBe('Explore local');
  });
  it('uses actual published imminent stop coordinates, not a mobile business base', () => {
    const stop = {
      starts_at: '2026-09-29T17:00:00Z',
      ends_at: '2026-09-29T19:00:00Z',
      is_published: true,
      latitude: 30.501,
      longitude: -90.461,
    };
    const mobile = (id: string, patch: object) =>
      business(id, { business_type: 'mobile', stops: [{ ...stop, ...patch }] });
    const plan = buildDiscoveryFeed(
      [
        mobile('now', {}),
        mobile('unpublished', { is_published: false }),
        mobile('expired', { ends_at: '2026-09-29T16:00:00Z' }),
        mobile('tomorrow', { starts_at: '2026-09-30T17:00:00Z', ends_at: '2026-09-30T19:00:00Z' }),
        mobile('far', { latitude: 35 }),
        mobile('unknown', { latitude: null }),
      ],
      context(12),
    );
    expect(plan.sections.flatMap((s) => s.businessIds)).toEqual(['now']);
    expect(plan.sections[0]?.id).toBe('explore');
  });
});
describe('weather, inventory and rotation', () => {
  it('grows new local category shelves only when enough matching inventory exists', () => {
    const salon = business('salon', {
      business_type: 'services',
      category_summary: 'Beauty & wellness',
    });
    expect(
      buildDiscoveryFeed([salon], context(12)).filters.some((s) => s.id.startsWith('category:')),
    ).toBe(false);
    expect(
      buildDiscoveryFeed([salon, { ...salon, id: 'spa' }], context(12)).filters.find(
        (s) => s.id === 'category:beauty & wellness',
      )?.businessIds,
    ).toHaveLength(2);
  });
  it('uses fresh nearby weather and ignores stale, future, distant, or absent weather', () => {
    const weather = {
      observedAt: '2026-09-29T12:50:00Z',
      latitude: 30.5,
      longitude: -90.46,
      condition: 'rain' as const,
      temperatureC: 22,
    };
    expect(buildDiscoveryFeed(catalog, context(8, { weather })).sections[0]?.id).toBe(
      'rain-coffee',
    );
    for (const patch of [
      { observedAt: '2026-09-28T12:00:00Z' },
      { observedAt: '2026-09-30T12:00:00Z' },
      { latitude: 42 },
    ])
      expect(
        buildDiscoveryFeed(catalog, context(8, { weather: { ...weather, ...patch } })).filters.some(
          (s) => s.id === 'rain-coffee',
        ),
      ).toBe(false);
    expect(
      buildDiscoveryFeed(catalog, context(8)).filters.some((s) => s.id === 'rain-coffee'),
    ).toBe(false);
  });
  it('only creates seasonal shelves with actual matching inventory', () => {
    expect(buildDiscoveryFeed(catalog, context(8)).filters.some((s) => s.id === 'seasonal')).toBe(
      false,
    );
    expect(
      buildDiscoveryFeed(
        [...catalog, business('pumpkin', { offering_search_text: 'pumpkin latte' })],
        context(8),
      ).filters.find((s) => s.id === 'seasonal')?.businessIds,
    ).toEqual(['pumpkin']);
  });
  it('is stable within a visit, deduplicates across shelves, and includes services', () => {
    const plan = buildDiscoveryFeed(catalog, context(8));
    expect(plan).toEqual(buildDiscoveryFeed(catalog, context(8)));
    const ids = plan.sections.flatMap((s) => s.businessIds);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort()).toEqual(catalog.map((b) => b.id).sort());
    expect(plan.sections.some((s) => s.id === 'services')).toBe(true);
  });
  it('prefers less recently shown businesses within a relevant collection', () => {
    const cafes = Array.from({ length: 8 }, (_, i) =>
      business(`coffee-${i}`, { category_summary: 'Coffee and breakfast' }),
    );
    const initial = buildDiscoveryFeed(cafes, context(8));
    const ids = initial.sections[0]!.businessIds.slice(0, 2);
    const next = buildDiscoveryFeed(
      cafes,
      context(8, {
        visit: 'two',
        history: [
          {
            at: context(8).now.getTime() - 1000,
            visit: 'one',
            sectionIds: ['breakfast'],
            businessIds: ids,
          },
        ],
      }),
    );
    expect(next.sections[0]?.businessIds.slice(0, 2).some((id) => ids.includes(id))).toBe(false);
  });
  it('avoids repeating the last lead when a comparably relevant alternative exists', () => {
    const cafes = [
      business('a', { category_summary: 'Breakfast' }),
      business('b', { category_summary: 'Breakfast' }),
    ];
    const first = buildDiscoveryFeed(cafes, context(8));
    const next = buildDiscoveryFeed(
      cafes,
      context(8, {
        visit: 'next',
        history: [
          {
            at: context(8).now.getTime() - 1,
            visit: 'previous',
            sectionIds: ['breakfast'],
            businessIds: first.sections[0]!.businessIds,
          },
        ],
      }),
    );
    expect(next.sections[0]?.businessIds[0]).not.toBe(first.sections[0]?.businessIds[0]);
  });
  it('handles empty and tiny catalogs without empty or repeated shelves', () => {
    expect(buildDiscoveryFeed([], context(8)).sections).toEqual([]);
    expect(buildDiscoveryFeed([catalog[0]!], context(8)).sections).toHaveLength(1);
  });
  it('retains all matches for a section filter after cross-section deduplication', () => {
    const b = business('coffee-breakfast', { category_summary: 'coffee breakfast' });
    const plan = buildDiscoveryFeed([b], context(8));
    expect(plan.filters.find((f) => f.id === 'coffee')?.businessIds).toEqual([b.id]);
  });
});

it('builds multi-business category carousels and folds single matches into general discovery', () => {
  const cafes = Array.from({ length: 9 }, (_, i) =>
    business(`cafe-${i}`, { category_summary: 'Breakfast, coffee' }),
  );
  const singleton = business('only-plumber', { business_type: 'services' });
  const plan = buildDiscoveryFeed([...cafes, singleton], context(8));
  expect(plan.sections[0]?.businessIds).toHaveLength(6);
  expect(
    plan.sections.filter((s) => s.id !== 'explore').every((s) => s.businessIds.length >= 2),
  ).toBe(true);
  expect(plan.sections.find((s) => s.id === 'services')).toBeUndefined();
  expect(plan.sections.find((s) => s.id === 'explore')?.businessIds).toContain('only-plumber');
  expect(plan.filters.find((s) => s.id === 'breakfast')?.businessIds).toHaveLength(9);
});

it('keeps boutiques, clothing, gifts, and florists as distinct matching collections', () => {
  const shops = ['Boutiques', 'Clothing shops', 'Gift shops', 'Florists'].flatMap((category) =>
    Array.from({ length: 3 }, (_, i) =>
      business(`${category}-${i}`, { business_type: 'retail', category_summary: category }),
    ),
  );
  const plan = buildDiscoveryFeed(shops, context(15));
  for (const id of ['boutiques', 'clothing', 'gifts', 'florists']) {
    expect(plan.filters.find((f) => f.id === id)?.businessIds).toHaveLength(3);
  }
  expect(
    plan.sections.filter((s) => ['boutiques', 'clothing', 'gifts', 'florists'].includes(s.id)),
  ).toHaveLength(2);
});
