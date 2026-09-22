import { describe, expect, it } from 'vitest';

import {
  DEFAULT_DISCOVERY_FILTERS,
  buildCategoryOptions,
  buildCuratedSections,
  buildMenuCategoryDisplay,
  buildUpcomingEventItems,
  businessResultCountLabel,
  businessImageFallback,
  businessPageSectionOrder,
  businessScheduleLabel,
  businessStatusIndicators,
  canonicalCategoryLabel,
  clearDiscoveryFilters,
  clearSearch,
  filterDiscoveryBusinesses,
  DISCOVER_LOCAL_SECTION_TITLE,
  formatEventDateTime,
  formatMenuItemPrice,
  discoverBottomContentInset,
  discoveryEventHorizonEnd,
  discoveryPresentationMode,
  getTodayHours,
  groupWeeklyHours,
  matchesBusinessSearch,
  limitEventPreview,
  menuItemReportAccessibilityLabel,
  sanitizeDiscoveryState,
  upcomingEventPreviewState,
  upcomingEventsPath,
  upcomingSeeAllLabel,
  type DiscoveryBusiness,
} from './discovery-core';
import { readableTextColor } from './color-contrast';

const now = new Date('2026-09-19T12:00:00');
const business = (overrides: Partial<DiscoveryBusiness> = {}): DiscoveryBusiness => ({
  id: 'a',
  name: 'Bayou Bites',
  description: 'Fresh Louisiana lunch',
  category_summary: 'Food & drink',
  offering_search_text: 'gumbo po boy',
  city: 'Baton Rouge',
  created_at: '2026-09-01T00:00:00Z',
  status: 'active',
  business_type: 'food_drink',
  has_active_rewards: true,
  events: [
    {
      id: 'event-a',
      business_id: 'a',
      title: 'Coffee class',
      address_text: 'Market Hall',
      starts_at: '2026-09-20T12:00:00Z',
      is_published: true,
      publish_at: null,
      archived_at: null,
    },
  ],
  ...overrides,
});

describe('discovery search and filters', () => {
  it.each([['Bayou'], ['food'], ['gumbo'], ['baton rouge']])('searches real fields: %s', (query) =>
    expect(matchesBusinessSearch(business(), query)).toBe(true),
  );
  it('combines search and advanced filters', () =>
    expect(
      filterDiscoveryBusinesses(
        [business()],
        'gumbo',
        { ...DEFAULT_DISCOVERY_FILTERS, category: 'Food & Drink' },
        new Set(),
        new Set(),
        now,
      ),
    ).toHaveLength(1));
  it('filters following only', () =>
    expect(
      filterDiscoveryBusinesses(
        [business()],
        '',
        { ...DEFAULT_DISCOVERY_FILTERS, audience: 'following' },
        new Set(['a']),
        new Set(),
        now,
      ),
    ).toHaveLength(1));
  it('filters rewards and events', () => {
    expect(
      filterDiscoveryBusinesses(
        [business()],
        '',
        { ...DEFAULT_DISCOVERY_FILTERS, feature: 'rewards' },
        new Set(),
        new Set(),
        now,
      ),
    ).toHaveLength(1);
    expect(
      filterDiscoveryBusinesses(
        [business()],
        '',
        { ...DEFAULT_DISCOVERY_FILTERS, feature: 'events' },
        new Set(),
        new Set(),
        now,
      ),
    ).toHaveLength(1);
  });
  it('sorts A–Z and recently added deterministically', () => {
    const rows = [
      business({ id: 'b', name: 'Zulu', created_at: '2026-08-01T00:00:00Z' }),
      business({ id: 'a', name: 'Alpha', created_at: '2026-09-01T00:00:00Z' }),
    ];
    expect(
      filterDiscoveryBusinesses(rows, '', DEFAULT_DISCOVERY_FILTERS, new Set(), new Set(), now).map(
        (x) => x.name,
      ),
    ).toEqual(['Alpha', 'Zulu']);
    expect(
      filterDiscoveryBusinesses(
        rows,
        '',
        { ...DEFAULT_DISCOVERY_FILTERS, sort: 'recent' },
        new Set(),
        new Set(),
        now,
      ).map((x) => x.name),
    ).toEqual(['Alpha', 'Zulu']);
  });
  it('excludes blocked and inactive businesses', () => {
    expect(
      filterDiscoveryBusinesses(
        [business()],
        '',
        DEFAULT_DISCOVERY_FILTERS,
        new Set(),
        new Set(['a']),
        now,
      ),
    ).toEqual([]);
    expect(
      filterDiscoveryBusinesses(
        [business({ status: 'draft' })],
        '',
        DEFAULT_DISCOVERY_FILTERS,
        new Set(),
        new Set(),
        now,
      ),
    ).toEqual([]);
  });
  it('ignores unpublished or archived events', () => {
    const invalid = business({
      events: [
        {
          starts_at: '2026-09-20T12:00:00Z',
          is_published: false,
          publish_at: null,
          archived_at: '2026-09-18T00:00:00Z',
        },
      ],
    });
    expect(
      filterDiscoveryBusinesses(
        [invalid],
        '',
        { ...DEFAULT_DISCOVERY_FILTERS, feature: 'events' },
        new Set(),
        new Set(),
        now,
      ),
    ).toEqual([]);
  });
  it('ignores inactive rewards', () =>
    expect(
      filterDiscoveryBusinesses(
        [business({ has_active_rewards: false })],
        '',
        { ...DEFAULT_DISCOVERY_FILTERS, feature: 'rewards' },
        new Set(),
        new Set(),
        now,
      ),
    ).toEqual([]));
});

describe('curation', () => {
  const rows = Array.from({ length: 12 }, (_, index) =>
    business({
      id: String(index),
      name: `Business ${index}`,
      has_active_rewards: index % 2 === 0,
      events: index === 1 ? (business().events ?? []) : [],
      business_type: index === 2 ? 'mobile' : 'general',
      stops:
        index === 2
          ? [
              {
                starts_at: '2026-09-20T00:00:00Z',
                ends_at: '2026-09-20T02:00:00Z',
                is_published: true,
              },
            ]
          : [],
    }),
  );
  it('generates useful non-empty sections with no duplicates', () => {
    const sections = buildCuratedSections(rows, new Set(['0']), now);
    expect(sections.length).toBeGreaterThan(1);
    expect(sections.every((section) => section.businesses.length > 0)).toBe(true);
    const ids = sections.flatMap((section) => section.businesses.map((item) => item.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('uses a simple layout for small datasets', () =>
    expect(buildCuratedSections(rows.slice(0, 7), new Set(), now).map((x) => x.kind)).toEqual([
      'all',
    ]));
});

describe('corrective Discover presentation', () => {
  it('uses one compact list below twelve businesses', () => {
    expect(discoveryPresentationMode(7)).toBe('compact-list');
    expect(discoveryPresentationMode(11)).toBe('compact-list');
  });

  it('allows curated presentation at twelve or more businesses', () => {
    expect(discoveryPresentationMode(12)).toBe('curated');
    expect(discoveryPresentationMode(30)).toBe('curated');
  });

  it.each([
    ['Coffee, brunch, pastries', 'Coffee'],
    ['Classes, workshops, community', 'Classes'],
    ['Home services, repairs, maintenance', 'Home Services'],
  ])('derives a concise category label from %s', (summary, expected) => {
    expect(canonicalCategoryLabel(summary)).toBe(expected);
  });

  it('never exposes a complete comma-separated summary as a chip label', () => {
    const label = canonicalCategoryLabel('Southern plates, seasonal menu, cocktails');
    expect(label).toBe('Southern Plates');
    expect(label).not.toContain(',');
    expect(label.length).toBeLessThanOrEqual(18);
  });

  it('deduplicates category labels and keeps All first', () => {
    const options = buildCategoryOptions([
      'Coffee, brunch',
      'coffee, pastries',
      'Classes, community',
      null,
    ]);
    expect(options[0]).toEqual({ value: 'all', label: 'All' });
    expect(options.map((option) => option.label)).toEqual(['All', 'Classes', 'Coffee']);
  });

  it('builds upcoming presentation from event records rather than businesses', () => {
    const events = [
      ...(business().events ?? []),
      {
        id: 'event-b',
        business_id: 'a',
        title: 'Supper',
        address_text: null,
        starts_at: '2026-09-21T12:00:00Z',
        is_published: true,
        publish_at: null,
        archived_at: null,
      },
    ];
    const result = buildUpcomingEventItems(events, [{ id: 'a', name: 'Bayou Bites' }], now);
    expect(result).toHaveLength(2);
    expect(result.map((event) => event.title)).toEqual(['Coffee class', 'Supper']);
  });

  it('excludes archived, unpublished, past, and unknown-business events', () => {
    const invalid = [
      {
        id: 'archived',
        business_id: 'a',
        title: 'Old',
        starts_at: '2026-09-20T12:00:00Z',
        is_published: true,
        publish_at: null,
        archived_at: '2026-09-19T00:00:00Z',
      },
      {
        id: 'draft',
        business_id: 'a',
        title: 'Draft',
        starts_at: '2026-09-20T12:00:00Z',
        is_published: false,
        publish_at: null,
        archived_at: null,
      },
      {
        id: 'past',
        business_id: 'a',
        title: 'Past',
        starts_at: '2026-09-18T12:00:00Z',
        is_published: true,
        publish_at: null,
        archived_at: null,
      },
      {
        id: 'orphan',
        business_id: 'missing',
        title: 'Orphan',
        starts_at: '2026-09-20T12:00:00Z',
        is_published: true,
        publish_at: null,
        archived_at: null,
      },
    ];
    expect(buildUpcomingEventItems(invalid, [{ id: 'a', name: 'Bayou Bites' }], now)).toEqual([]);
  });

  it('counts separate events from the same business separately', () => {
    const first = business().events?.[0];
    expect(first).toBeDefined();
    expect(
      buildUpcomingEventItems(
        [first!, { ...first!, id: 'event-b', title: 'Second event' }],
        [{ id: 'a', name: 'Bayou Bites' }],
        now,
      ),
    ).toHaveLength(2);
  });

  it('deduplicates repeated rows for the same event identifier', () => {
    const first = business().events?.[0];
    expect(first).toBeDefined();
    expect(
      buildUpcomingEventItems([first!, { ...first! }], [{ id: 'a', name: 'Bayou Bites' }], now),
    ).toHaveLength(1);
  });

  it('uses the same ninety-day planning horizon for Discover and Calendar', () => {
    expect(discoveryEventHorizonEnd(now).getTime() - now.getTime()).toBe(90 * 24 * 60 * 60 * 1000);
  });

  it('limits the event preview without changing event order', () => {
    const events = ['first', 'second', 'third'];
    expect(limitEventPreview(events, 2)).toEqual(['first', 'second']);
    expect(events).toEqual(['first', 'second', 'third']);
  });

  it.each([
    [0, 0, false],
    [1, 1, false],
    [2, 2, false],
    [3, 2, true],
    [17, 2, true],
  ])(
    'shows %i events with the correct two-card preview and See all state',
    (total, previewCount, showSeeAll) => {
      const events = Array.from({ length: total }, (_, index) => `event-${index}`);
      const presentation = upcomingEventPreviewState(events);
      expect(presentation.preview).toHaveLength(previewCount);
      expect(presentation.totalCount).toBe(total);
      expect(presentation.showSeeAll).toBe(showSeeAll);
      expect(upcomingSeeAllLabel(total)).toBe(showSeeAll ? `See all ${total}` : null);
    },
  );

  it('uses a stable list-only Calendar destination', () => {
    expect(upcomingEventsPath()).toBe('/calendar?scope=all-upcoming');
    expect(upcomingEventsPath()).toBe(upcomingEventsPath());
  });

  it.each([
    [0, false, '0 results'],
    [1, false, '1 result'],
    [7, false, '7 results'],
    [0, true, null],
  ])('formats result count %i while loading=%s', (count, loading, expected) => {
    expect(businessResultCountLabel(count, loading)).toBe(expected);
  });

  it('uses the selected local-results section wording', () => {
    expect(DISCOVER_LOCAL_SECTION_TITLE).toBe('Explore local');
  });

  it('formats event dates for customers without seconds or a redundant year', () => {
    const formatted = formatEventDateTime('2026-09-25T20:06:50', new Date('2026-09-19T12:00:00'));
    expect(formatted).toBe('Fri, Sep 25 · 8:06 PM');
    expect(formatted).not.toContain('2026');
    expect(formatted).not.toContain(':50');
  });

  it('includes the year when an event is outside the current year', () => {
    expect(formatEventDateTime('2027-01-02T09:00:00', new Date('2026-09-19T12:00:00'))).toContain(
      '2027',
    );
    expect(formatEventDateTime('not-a-date')).toBe('Date and time unavailable');
  });

  it('limits and prioritizes compact status indicators', () => {
    const mobile = business({
      business_type: 'mobile',
      stops: [
        { starts_at: '2026-09-20T10:00:00Z', ends_at: '2026-09-20T14:00:00Z', is_published: true },
      ],
    });
    expect(businessStatusIndicators(mobile, new Set(['a']), now)).toEqual(['stop', 'following']);
  });

  it('uses events before rewards when higher-priority signals are absent', () => {
    expect(businessStatusIndicators(business(), new Set(), now)).toEqual(['event', 'rewards']);
  });

  it('reserves enough bottom content space for the floating tab bar and safe area', () => {
    expect(discoverBottomContentInset(50, 34)).toBe(132);
    expect(discoverBottomContentInset(50, 0)).toBe(120);
  });
});

describe('presentation and state', () => {
  it('creates intentional image fallback data', () =>
    expect(businessImageFallback(' Bayou', '#123456')).toEqual({ letter: 'B', color: '#123456' }));
  it('chooses safe arbitrary-color contrast', () => {
    expect(readableTextColor('#ffffff')).toBe('#000000');
    expect(readableTextColor('#001100')).toBe('#FFFFFF');
  });
  it('preserves discover state and sanitizes scroll offset', () =>
    expect(
      sanitizeDiscoveryState({
        query: 'gumbo',
        filters: DEFAULT_DISCOVERY_FILTERS,
        scrollOffset: 120,
      }),
    ).toMatchObject({ query: 'gumbo', scrollOffset: 120 }));
  it('clears search and all filters', () => {
    expect(clearSearch('gumbo')).toBe('');
    expect(clearDiscoveryFilters()).toEqual(DEFAULT_DISCOVERY_FILTERS);
  });
});

describe('hours and page hierarchy', () => {
  it('calculates today open hours with injected time', () =>
    expect(
      getTodayHours(
        [{ day_of_week: 6, opens_at: '09:00', closes_at: '17:00', is_closed: false }],
        now,
      ).state,
    ).toBe('open'));
  it('handles closed, missing, malformed, and ambiguous hours', () => {
    expect(
      getTodayHours([{ day_of_week: 6, opens_at: null, closes_at: null, is_closed: true }], now)
        .state,
    ).toBe('closed');
    expect(getTodayHours([], now).state).toBe('unknown');
    expect(
      getTodayHours(
        [{ day_of_week: 6, opens_at: 'bad', closes_at: '17:00', is_closed: false }],
        now,
      ).state,
    ).toBe('unknown');
  });
  it('handles overnight hours', () =>
    expect(
      getTodayHours(
        [{ day_of_week: 6, opens_at: '20:00', closes_at: '02:00', is_closed: false }],
        new Date('2026-09-19T23:00:00'),
      ).state,
    ).toBe('open'));
  it('carries overnight hours into the following day', () =>
    expect(
      getTodayHours(
        [{ day_of_week: 5, opens_at: '20:00', closes_at: '02:00', is_closed: false }],
        new Date('2026-09-19T01:00:00'),
      ).state,
    ).toBe('open'));
  it('groups consecutive weekdays with identical hours and keeps closed days clear', () => {
    const grouped = groupWeeklyHours([
      ...[1, 2, 3, 4, 5].map((day_of_week) => ({
        day_of_week,
        opens_at: '09:00',
        closes_at: '17:00',
        is_closed: false,
      })),
      { day_of_week: 6, opens_at: '10:00', closes_at: '14:00', is_closed: false },
      { day_of_week: 0, opens_at: null, closes_at: null, is_closed: true },
    ]);
    expect(grouped).toEqual([
      { dayLabel: 'Mon–Fri', hoursLabel: '9:00 AM–5:00 PM', isClosed: false },
      { dayLabel: 'Saturday', hoursLabel: '10:00 AM–2:00 PM', isClosed: false },
      { dayLabel: 'Sunday', hoursLabel: 'Closed', isClosed: true },
    ]);
  });
  it('shows a one-day schedule directly and marks overnight hours', () => {
    expect(
      groupWeeklyHours([
        { day_of_week: 5, opens_at: '20:00', closes_at: '02:00', is_closed: false },
      ]),
    ).toEqual([{ dayLabel: 'Friday', hoursLabel: '8:00 PM–2:00 AM (overnight)', isClosed: false }]);
  });
  it('finds the next configured opening after a business closes', () => {
    expect(
      getTodayHours(
        [{ day_of_week: 5, opens_at: '10:00', closes_at: '18:00', is_closed: false }],
        new Date('2026-09-19T12:00:00'),
      ).label,
    ).toBe('Closed · Opens Friday at 10:00 AM');
  });
  it('labels mobile schedules by the availability customers can actually use', () => {
    expect(businessScheduleLabel('mobile', 2, 7)).toBe('Where to find us');
    expect(businessScheduleLabel('mobile', 0, 1)).toBe('Schedule');
    expect(businessScheduleLabel('retail', 0, 7)).toBe('Hours');
  });
  it('orders menu categories, removes empty categories, and builds resilient items', () => {
    const categories = buildMenuCategoryDisplay(
      [
        { id: 'featured', name: " Today's menu ", description: ' Fresh today ' },
        { id: 'empty', name: 'Empty', description: null },
        { id: 'bowls', name: 'Bowls', description: null },
      ],
      [
        {
          id: 'one',
          section_id: 'featured',
          name: ' A very long seasonal grain bowl name that can wrap without losing its price ',
          description: '  Bright citrus and greens.  ',
          price_minor: 1500,
          price_text: null,
          currency: 'USD',
          is_available: true,
          is_featured: true,
        },
        {
          id: 'two',
          section_id: 'bowls',
          name: 'Soup',
          description: '',
          price_minor: null,
          price_text: null,
          currency: 'USD',
          is_available: true,
          is_featured: false,
        },
      ],
    );
    expect(categories.map((category) => category.name)).toEqual(["Today's menu", 'Bowls']);
    expect(categories[0]?.items[0]).toMatchObject({
      description: 'Bright citrus and greens.',
      priceLabel: '$15.00',
    });
    expect(categories[1]?.items[0]?.priceLabel).toBe('');
  });
  it('formats custom, numeric, missing, and invalid-currency menu prices safely', () => {
    expect(formatMenuItemPrice({ price_minor: 900, price_text: 'From $9', currency: 'USD' })).toBe(
      'From $9',
    );
    expect(formatMenuItemPrice({ price_minor: 1250, price_text: null, currency: 'USD' })).toBe(
      '$12.50',
    );
    expect(formatMenuItemPrice({ price_minor: null, price_text: null, currency: 'USD' })).toBe('');
    expect(formatMenuItemPrice({ price_minor: 500, price_text: null, currency: 'bad' })).toBe(
      '$5.00',
    );
  });
  it('provides a specific accessible overflow label', () => {
    expect(menuItemReportAccessibilityLabel('Citrus grain bowl')).toBe(
      'More options for Citrus grain bowl',
    );
  });
  it('uses type-specific information ordering', () => {
    expect(businessPageSectionOrder('general').slice(0, 3)).toEqual([
      'identity',
      'glance',
      'actions',
    ]);
    expect(businessPageSectionOrder('mobile').indexOf('stops')).toBeLessThan(
      businessPageSectionOrder('mobile').indexOf('offerings'),
    );
    expect(businessPageSectionOrder('services').indexOf('about')).toBeLessThan(
      businessPageSectionOrder('services').indexOf('hours'),
    );
    expect(businessPageSectionOrder('services').indexOf('hours')).toBeLessThan(
      businessPageSectionOrder('services').indexOf('offerings'),
    );
    expect(businessPageSectionOrder('food_drink').indexOf('offerings')).toBeLessThan(
      businessPageSectionOrder('food_drink').indexOf('events'),
    );
  });
});
