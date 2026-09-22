import { describe, expect, it } from 'vitest';

import {
  clampNearbyAlertRadius,
  defaultNearbyAlertRadiusMiles,
  deriveNearbyAlertPermissionStatus,
  isSafeNotificationUrl,
  milesToMeters,
  nearbyAlertDedupeKey,
  nearbyAlertAccountCacheKey,
  nearbyAlertRadiusFromPosition,
  nearbyRegistrationAction,
  nearbyBusinessUrl,
  normalizeNearbyAlertRadius,
  planNearbyRegions,
  pruneNearbyAlertDedupe,
  recordNearbyAlert,
  shouldNotifyNearbyEntry,
  shouldShowNearbyTestAction,
  type NearbyAlertCandidate,
  type NearbyAlertLocation,
} from './nearby-alerts-core';

const now = Date.parse('2026-09-19T18:00:00Z');
const base: NearbyAlertCandidate = {
  businessId: '10000000-0000-4000-8000-000000000001',
  businessName: 'Bayou Bites',
  businessSlug: 'bayou-bites',
  businessType: 'mobile',
  stopId: '20000000-0000-4000-8000-000000000001',
  stopTitle: 'Market Square',
  addressText: '1 Market Square',
  latitude: 30,
  longitude: -90,
  startsAt: new Date(now - 60_000).toISOString(),
  endsAt: new Date(now + 3_600_000).toISOString(),
  timezone: 'America/Chicago',
  followed: true,
  blocked: false,
  businessAlertsEnabled: true,
  published: true,
};

function plan(
  candidates: NearbyAlertCandidate[],
  platform = 'ios',
  location: NearbyAlertLocation | null = null,
) {
  return planNearbyRegions({
    candidates,
    platform,
    location,
    userId: '30000000-0000-4000-8000-000000000001',
    radiusMiles: 5,
    now,
  });
}

describe('nearby-alert planning', () => {
  it.each([
    ['unfollowed', { followed: false }],
    ['fixed-location', { businessType: 'food_drink' }],
    ['blocked', { blocked: true }],
    ['per-business disabled', { businessAlertsEnabled: false }],
    ['unpublished', { published: false }],
    ['expired', { endsAt: new Date(now - 11 * 60_000).toISOString() }],
    ['far future', { startsAt: new Date(now + 8 * 86_400_000).toISOString() }],
    ['invalid latitude', { latitude: 91 }],
    ['invalid longitude', { longitude: Number.NaN }],
  ])('excludes %s stops', (_label, changes) => {
    expect(plan([{ ...base, ...changes }])).toHaveLength(0);
  });

  it('removes a business as soon as its followed state changes', () => {
    expect(plan([base])).toHaveLength(1);
    expect(plan([{ ...base, followed: false }])).toHaveLength(0);
  });

  it('ranks active stops ahead of future stops and earlier future stops first', () => {
    const later = {
      ...base,
      stopId: '20000000-0000-4000-8000-000000000003',
      startsAt: new Date(now + 3_600_000).toISOString(),
      endsAt: new Date(now + 7_200_000).toISOString(),
    };
    const sooner = {
      ...later,
      stopId: '20000000-0000-4000-8000-000000000002',
      startsAt: new Date(now + 1_800_000).toISOString(),
    };
    expect(plan([later, sooner, base]).map(({ stopId }) => stopId)).toEqual([
      base.stopId,
      sooner.stopId,
      later.stopId,
    ]);
  });

  it('uses distance after active status and deterministic ids when distance/time tie', () => {
    const far = { ...base, stopId: '20000000-0000-4000-8000-000000000003', latitude: 31 };
    const close = { ...base, stopId: '20000000-0000-4000-8000-000000000002', latitude: 30.01 };
    const location = { latitude: 30, longitude: -90, capturedAt: now };
    expect(plan([far, close], 'ios', location).map(({ stopId }) => stopId)).toEqual([
      close.stopId,
      far.stopId,
    ]);
    expect(plan([far, close]).map(({ stopId }) => stopId)).toEqual([close.stopId, far.stopId]);
  });

  it('caps iOS at 20 and Android at 100', () => {
    const candidates = Array.from({ length: 120 }, (_, index) => ({
      ...base,
      stopId: `20000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    }));
    expect(plan(candidates, 'ios')).toHaveLength(20);
    expect(plan(candidates, 'android')).toHaveLength(100);
  });

  it('uses the selected radius for every planned region', () => {
    const regions = planNearbyRegions({
      candidates: [base, { ...base, stopId: '20000000-0000-4000-8000-000000000002' }],
      platform: 'ios',
      userId: 'user',
      radiusMiles: 10,
      now,
    });
    expect(regions.every(({ radius }) => radius === milesToMeters(10))).toBe(true);
  });

  it('includes a stop exactly at the seven-day planning boundary', () => {
    const boundary = {
      ...base,
      startsAt: new Date(now + 7 * 86_400_000).toISOString(),
      endsAt: new Date(now + 7 * 86_400_000 + 3_600_000).toISOString(),
    };
    expect(plan([boundary])).toHaveLength(1);
  });

  it('rejects malformed service-window timestamps', () => {
    expect(plan([{ ...base, startsAt: 'not-a-date' }])).toHaveLength(0);
    expect(plan([{ ...base, endsAt: 'not-a-date' }])).toHaveLength(0);
  });

  it('rejects a service window whose end precedes its start', () => {
    expect(
      plan([
        {
          ...base,
          startsAt: new Date(now + 3_600_000).toISOString(),
          endsAt: new Date(now + 60_000).toISOString(),
        },
      ]),
    ).toHaveLength(0);
  });

  it('uses no regions on an unsupported platform', () => {
    expect(plan([base], 'web')).toHaveLength(0);
  });

  it('ignores an expired cached foreground location', () => {
    const stale = { latitude: 30, longitude: -90, capturedAt: now - 25 * 3_600_000 };
    expect(plan([base], 'ios', stale)[0]?.distanceMeters).toBeNull();
  });

  it('uses a recent cached foreground location only for prioritization', () => {
    const recent = { latitude: 30, longitude: -90, capturedAt: now };
    expect(plan([base], 'ios', recent)[0]?.distanceMeters).toBe(0);
  });
});

describe('nearby-alert radius and deduplication', () => {
  it('defaults invalid or missing radius values to five miles', () => {
    expect(defaultNearbyAlertRadiusMiles).toBe(5);
    expect(normalizeNearbyAlertRadius(undefined)).toBe(5);
    expect(normalizeNearbyAlertRadius(0)).toBe(5);
    expect(normalizeNearbyAlertRadius(26)).toBe(5);
    expect(normalizeNearbyAlertRadius(2.5)).toBe(5);
    expect(normalizeNearbyAlertRadius('corrupt')).toBe(5);
  });

  it.each([
    [1, 1609.344],
    [5, 8046.72],
    [10, 16093.44],
    [13, 20921.472],
    [25, 40233.6],
  ] as const)('converts %s miles to meters', (miles, meters) => {
    expect(milesToMeters(miles)).toBeCloseTo(meters, 5);
    expect(normalizeNearbyAlertRadius(miles)).toBe(miles);
  });

  it('maps slider positions to whole miles from one through twenty-five', () => {
    expect(nearbyAlertRadiusFromPosition(0, 240)).toBe(1);
    expect(nearbyAlertRadiusFromPosition(120, 240)).toBe(13);
    expect(nearbyAlertRadiusFromPosition(240, 240)).toBe(25);
    expect(nearbyAlertRadiusFromPosition(-20, 240)).toBe(1);
    expect(nearbyAlertRadiusFromPosition(300, 240)).toBe(25);
    expect(nearbyAlertRadiusFromPosition(20, 0)).toBe(5);
  });

  it('clamps and rounds accessible radius adjustments', () => {
    expect(clampNearbyAlertRadius(-4)).toBe(1);
    expect(clampNearbyAlertRadius(8.6)).toBe(9);
    expect(clampNearbyAlertRadius(99)).toBe(25);
  });

  it('deduplicates one service window across restarts, text, and radius changes', () => {
    const key = nearbyAlertDedupeKey('user', base);
    const persisted = recordNearbyAlert({}, key, now);
    expect(persisted).not.toBeNull();
    expect(recordNearbyAlert(persisted ?? {}, key, now + 1)).toBeNull();
    const renamed = { ...base, businessName: 'Renamed' };
    expect(nearbyAlertDedupeKey('user', renamed)).toBe(key);
    expect(
      planNearbyRegions({
        candidates: [base],
        platform: 'ios',
        userId: 'user',
        radiusMiles: 1,
        now,
      }),
    ).toHaveLength(1);
    expect(recordNearbyAlert(persisted ?? {}, key, now + 2)).toBeNull();
  });

  it('allows a different stop and expires old records', () => {
    const firstKey = nearbyAlertDedupeKey('user', base);
    const secondKey = nearbyAlertDedupeKey('user', { ...base, stopId: 'different' });
    const first = recordNearbyAlert({}, firstKey, now) ?? {};
    expect(recordNearbyAlert(first, secondKey, now)).not.toBeNull();
    expect(pruneNearbyAlertDedupe(first, now + 31 * 86_400_000)).toEqual({});
  });

  it('allows the same stop to alert in a genuinely different service window', () => {
    const firstKey = nearbyAlertDedupeKey('user', base);
    const laterWindow = {
      ...base,
      startsAt: new Date(now + 86_400_000).toISOString(),
      endsAt: new Date(now + 90_000_000).toISOString(),
    };
    expect(nearbyAlertDedupeKey('user', laterWindow)).not.toBe(firstKey);
  });

  it('retains unexpired deduplication records during pruning', () => {
    const firstKey = nearbyAlertDedupeKey('user', base);
    const records = recordNearbyAlert({}, firstKey, now) ?? {};
    expect(pruneNearbyAlertDedupe(records, now + 1)[firstKey]).toBeDefined();
  });

  it('permits delivery during the documented ten-minute end grace period', () => {
    const recentlyEnded = { ...base, endsAt: new Date(now - 9 * 60_000).toISOString() };
    expect(
      shouldNotifyNearbyEntry({
        eventType: 'enter',
        stop: recentlyEnded,
        enabled: true,
        now,
        alreadyNotified: false,
      }),
    ).toBe(true);
  });

  it('does not alert before an upcoming stop begins', () => {
    const future = {
      ...base,
      startsAt: new Date(now + 60_000).toISOString(),
      endsAt: new Date(now + 3_600_000).toISOString(),
    };
    expect(
      shouldNotifyNearbyEntry({
        eventType: 'enter',
        stop: future,
        enabled: true,
        now,
        alreadyNotified: false,
      }),
    ).toBe(false);
  });

  it('does not alert when the global setting is disabled', () => {
    expect(
      shouldNotifyNearbyEntry({
        eventType: 'enter',
        stop: base,
        enabled: false,
        now,
        alreadyNotified: false,
      }),
    ).toBe(false);
  });

  it('notifies only an active entry, never an exit, duplicate, or stale stop', () => {
    expect(
      shouldNotifyNearbyEntry({
        eventType: 'enter',
        stop: base,
        enabled: true,
        now,
        alreadyNotified: false,
      }),
    ).toBe(true);
    expect(
      shouldNotifyNearbyEntry({
        eventType: 'exit',
        stop: base,
        enabled: true,
        now,
        alreadyNotified: false,
      }),
    ).toBe(false);
    expect(
      shouldNotifyNearbyEntry({
        eventType: 'enter',
        stop: base,
        enabled: true,
        now,
        alreadyNotified: true,
      }),
    ).toBe(false);
    expect(
      shouldNotifyNearbyEntry({
        eventType: 'enter',
        stop: { ...base, endsAt: new Date(now - 11 * 60_000).toISOString() },
        enabled: true,
        now,
        alreadyNotified: false,
      }),
    ).toBe(false);
  });

  it('rebuilds region radii without changing identifiers or dedupe keys', () => {
    const one = planNearbyRegions({
      candidates: [base],
      platform: 'ios',
      userId: 'user',
      radiusMiles: 1,
      now,
    });
    const ten = planNearbyRegions({
      candidates: [base],
      platform: 'ios',
      userId: 'user',
      radiusMiles: 10,
      now,
    });
    expect(one[0]?.identifier).toBe(ten[0]?.identifier);
    expect(one[0]?.radius).not.toBe(ten[0]?.radius);
    expect(nearbyAlertDedupeKey('user', one[0] ?? base)).toBe(
      nearbyAlertDedupeKey('user', ten[0] ?? base),
    );
  });

  it('isolates cached execution state by account', () => {
    expect(nearbyAlertAccountCacheKey('account-a')).not.toBe(
      nearbyAlertAccountCacheKey('account-b'),
    );
  });
});

describe('nearby-alert permission and registration state', () => {
  const granted = {
    accountEnabled: true,
    backgroundAvailable: true,
    taskManagerAvailable: true,
    locationServicesEnabled: true,
    notificationGranted: true,
    foregroundGranted: true,
    backgroundGranted: true,
  };

  it.each([
    ['off', { accountEnabled: false }, 'off'],
    ['unsupported', { backgroundAvailable: false }, 'unsupported'],
    ['task restricted', { taskManagerAvailable: false }, 'restricted'],
    ['services restricted', { locationServicesEnabled: false }, 'restricted'],
    ['notifications missing', { notificationGranted: false }, 'needs_notification_permission'],
    ['foreground missing', { foregroundGranted: false }, 'needs_foreground_location_permission'],
    ['background missing', { backgroundGranted: false }, 'needs_background_location_permission'],
    ['fully enabled', {}, 'enabled'],
  ] as const)('reports %s accurately', (_label, changes, expected) => {
    expect(deriveNearbyAlertPermissionStatus({ ...granted, ...changes })).toBe(expected);
  });

  it('stops registration for every state except fully enabled', () => {
    expect(nearbyRegistrationAction('off')).toBe('stop');
    expect(nearbyRegistrationAction('needs_background_location_permission')).toBe('stop');
    expect(nearbyRegistrationAction('restricted')).toBe('stop');
    expect(nearbyRegistrationAction('enabled')).toBe('replace');
  });
});

describe('nearby-alert routes', () => {
  it('constructs and accepts only validated internal business links', () => {
    const url = nearbyBusinessUrl(base.businessSlug, base.stopId);
    expect(url).toBe(`/b/${base.businessSlug}?section=locations&stop=${base.stopId}`);
    expect(isSafeNotificationUrl(url)).toBe(true);
    expect(isSafeNotificationUrl('https://evil.example/b/bayou-bites')).toBe(false);
    expect(isSafeNotificationUrl('/b/Bayou-Bites')).toBe(false);
    expect(isSafeNotificationUrl('/b/bayou-bites?next=https://evil.example')).toBe(false);
    expect(
      isSafeNotificationUrl('/notification?type=event&id=20000000-0000-4000-8000-000000000001'),
    ).toBe(true);
    expect(isSafeNotificationUrl('/notification?type=event&id=bad')).toBe(false);
    expect(isSafeNotificationUrl('/order?orderId=20000000-0000-4000-8000-000000000001')).toBe(true);
    expect(
      isSafeNotificationUrl('/pickup-order?orderId=20000000-0000-4000-8000-000000000001'),
    ).toBe(true);
    expect(
      isSafeNotificationUrl(
        '/order?orderId=20000000-0000-4000-8000-000000000001&statusToken=secret',
      ),
    ).toBe(false);
    expect(isSafeNotificationUrl('/pickup-order?orderId=bad')).toBe(false);
    expect(shouldShowNearbyTestAction('staging')).toBe(true);
    expect(shouldShowNearbyTestAction('production')).toBe(false);
  });

  it('builds a safe public business fallback without a stop parameter', () => {
    expect(nearbyBusinessUrl(base.businessSlug)).toBe('/b/bayou-bites');
    expect(isSafeNotificationUrl('/b/bayou-bites')).toBe(true);
  });

  it('rejects invalid business slugs and stop identifiers', () => {
    expect(nearbyBusinessUrl('Bayou Bites')).toBeNull();
    expect(nearbyBusinessUrl('bayou-bites', 'not-a-uuid')).toBeNull();
  });
});
