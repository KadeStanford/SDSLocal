export const nearbyAlertRadiusMinimumMiles = 1;
export const nearbyAlertRadiusMaximumMiles = 25;
export type NearbyAlertRadiusMiles = number;
export type NearbyAlertPermissionStatus =
  | 'off'
  | 'needs_notification_permission'
  | 'needs_foreground_location_permission'
  | 'needs_background_location_permission'
  | 'enabled'
  | 'restricted'
  | 'unsupported'
  | 'error';

export const defaultNearbyAlertRadiusMiles: NearbyAlertRadiusMiles = 5;
export const nearbyAlertPlanningHorizonMs = 7 * 24 * 60 * 60 * 1000;
export const nearbyAlertDeliveryGraceMs = 10 * 60 * 1000;
export const nearbyAlertLocationCacheMaxAgeMs = 24 * 60 * 60 * 1000;
export const nearbyAlertDedupeRetentionMs = 30 * 24 * 60 * 60 * 1000;

export interface NearbyAlertCandidate {
  readonly businessId: string;
  readonly businessName: string;
  readonly businessSlug: string;
  readonly businessType: string;
  readonly stopId: string;
  readonly stopTitle: string;
  readonly addressText: string | null;
  readonly latitude: number;
  readonly longitude: number;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly timezone: string;
  readonly followed: boolean;
  readonly blocked: boolean;
  readonly businessAlertsEnabled: boolean;
  readonly published: boolean;
}

export interface NearbyAlertLocation {
  readonly latitude: number;
  readonly longitude: number;
  readonly capturedAt: number;
}

export interface PlannedNearbyRegion extends NearbyAlertCandidate {
  readonly identifier: string;
  readonly radius: number;
  readonly distanceMeters: number | null;
}

export interface NearbyAlertDedupeRecord {
  readonly notifiedAt: number;
  readonly expiresAt: number;
}

export type NearbyAlertDedupe = Readonly<Record<string, NearbyAlertDedupeRecord>>;

export function normalizeNearbyAlertRadius(value: unknown): NearbyAlertRadiusMiles {
  const numeric = typeof value === 'string' && value.trim() ? Number(value) : value;
  return typeof numeric === 'number' &&
    Number.isInteger(numeric) &&
    numeric >= nearbyAlertRadiusMinimumMiles &&
    numeric <= nearbyAlertRadiusMaximumMiles
    ? numeric
    : defaultNearbyAlertRadiusMiles;
}

export function milesToMeters(miles: NearbyAlertRadiusMiles) {
  return miles * 1609.344;
}

export function clampNearbyAlertRadius(value: number): NearbyAlertRadiusMiles {
  if (!Number.isFinite(value)) return defaultNearbyAlertRadiusMiles;
  return Math.min(
    nearbyAlertRadiusMaximumMiles,
    Math.max(nearbyAlertRadiusMinimumMiles, Math.round(value)),
  );
}

export function nearbyAlertRadiusFromPosition(position: number, width: number) {
  if (!Number.isFinite(position) || !Number.isFinite(width) || width <= 0) {
    return defaultNearbyAlertRadiusMiles;
  }
  const fraction = Math.min(1, Math.max(0, position / width));
  return clampNearbyAlertRadius(
    nearbyAlertRadiusMinimumMiles +
      fraction * (nearbyAlertRadiusMaximumMiles - nearbyAlertRadiusMinimumMiles),
  );
}

export function platformRegionLimit(platform: string) {
  return platform === 'ios' ? 20 : platform === 'android' ? 100 : 0;
}

export function deriveNearbyAlertPermissionStatus(input: {
  readonly accountEnabled: boolean;
  readonly backgroundAvailable: boolean;
  readonly taskManagerAvailable: boolean;
  readonly locationServicesEnabled: boolean;
  readonly notificationGranted: boolean;
  readonly foregroundGranted: boolean;
  readonly backgroundGranted: boolean;
}): NearbyAlertPermissionStatus {
  if (!input.accountEnabled) return 'off';
  if (!input.backgroundAvailable) return 'unsupported';
  if (!input.taskManagerAvailable || !input.locationServicesEnabled) return 'restricted';
  if (!input.notificationGranted) return 'needs_notification_permission';
  if (!input.foregroundGranted) return 'needs_foreground_location_permission';
  if (!input.backgroundGranted) return 'needs_background_location_permission';
  return 'enabled';
}

export function nearbyRegistrationAction(status: NearbyAlertPermissionStatus) {
  return status === 'enabled' ? 'replace' : 'stop';
}

export function nearbyAlertAccountCacheKey(userId: string) {
  return `sds-local:nearby-alerts:user:${userId}`;
}

export function isValidCoordinate(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function isStopActive(
  candidate: Pick<NearbyAlertCandidate, 'startsAt' | 'endsAt'>,
  now: number,
) {
  const startsAt = Date.parse(candidate.startsAt);
  const endsAt = Date.parse(candidate.endsAt);
  return (
    Number.isFinite(startsAt) &&
    Number.isFinite(endsAt) &&
    startsAt <= now &&
    endsAt + nearbyAlertDeliveryGraceMs >= now
  );
}

function isEligibleCandidate(candidate: NearbyAlertCandidate, now: number) {
  const startsAt = Date.parse(candidate.startsAt);
  const endsAt = Date.parse(candidate.endsAt);
  return (
    candidate.followed &&
    !candidate.blocked &&
    candidate.businessAlertsEnabled &&
    candidate.businessType === 'mobile' &&
    candidate.published &&
    isValidCoordinate(candidate.latitude, candidate.longitude) &&
    Number.isFinite(startsAt) &&
    Number.isFinite(endsAt) &&
    endsAt > startsAt &&
    endsAt + nearbyAlertDeliveryGraceMs >= now &&
    startsAt <= now + nearbyAlertPlanningHorizonMs
  );
}

function radians(value: number) {
  return (value * Math.PI) / 180;
}

export function distanceMeters(
  from: Pick<NearbyAlertLocation, 'latitude' | 'longitude'>,
  to: Pick<NearbyAlertCandidate, 'latitude' | 'longitude'>,
) {
  const earthRadiusMeters = 6_371_000;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(from.latitude)) *
      Math.cos(radians(to.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function regionIdentifier(userId: string, stopId: string) {
  return `sds-nearby:${userId}:${stopId}`;
}

export function planNearbyRegions(input: {
  readonly candidates: readonly NearbyAlertCandidate[];
  readonly userId: string;
  readonly radiusMiles: unknown;
  readonly platform: string;
  readonly now: number;
  readonly location?: NearbyAlertLocation | null;
}) {
  const radius = milesToMeters(normalizeNearbyAlertRadius(input.radiusMiles));
  const location =
    input.location &&
    input.now - input.location.capturedAt <= nearbyAlertLocationCacheMaxAgeMs &&
    isValidCoordinate(input.location.latitude, input.location.longitude)
      ? input.location
      : null;

  return input.candidates
    .filter((candidate) => isEligibleCandidate(candidate, input.now))
    .map<PlannedNearbyRegion>((candidate) => ({
      ...candidate,
      identifier: regionIdentifier(input.userId, candidate.stopId),
      radius,
      distanceMeters: location ? distanceMeters(location, candidate) : null,
    }))
    .sort((left, right) => {
      const activeDelta =
        Number(isStopActive(right, input.now)) - Number(isStopActive(left, input.now));
      if (activeDelta) return activeDelta;
      if (left.distanceMeters !== null && right.distanceMeters !== null) {
        const distanceDelta = left.distanceMeters - right.distanceMeters;
        if (distanceDelta) return distanceDelta;
      }
      const timeDelta = Date.parse(left.startsAt) - Date.parse(right.startsAt);
      if (timeDelta) return timeDelta;
      const businessDelta = left.businessId.localeCompare(right.businessId);
      return businessDelta || left.stopId.localeCompare(right.stopId);
    })
    .slice(0, platformRegionLimit(input.platform));
}

export function nearbyAlertDedupeKey(
  userId: string,
  stop: Pick<NearbyAlertCandidate, 'stopId' | 'startsAt' | 'endsAt'>,
) {
  return `${userId}:${stop.stopId}:${stop.startsAt}:${stop.endsAt}`;
}

export function pruneNearbyAlertDedupe(records: NearbyAlertDedupe, now: number) {
  return Object.fromEntries(
    Object.entries(records).filter(([, record]) => record.expiresAt > now),
  ) as Record<string, NearbyAlertDedupeRecord>;
}

export function recordNearbyAlert(
  records: NearbyAlertDedupe,
  key: string,
  now: number,
): Record<string, NearbyAlertDedupeRecord> | null {
  const current = pruneNearbyAlertDedupe(records, now);
  if (current[key]) return null;
  return {
    ...current,
    [key]: { notifiedAt: now, expiresAt: now + nearbyAlertDedupeRetentionMs },
  };
}

export function shouldNotifyNearbyEntry(input: {
  readonly eventType: 'enter' | 'exit';
  readonly stop: Pick<NearbyAlertCandidate, 'startsAt' | 'endsAt'>;
  readonly enabled: boolean;
  readonly now: number;
  readonly alreadyNotified: boolean;
}) {
  return (
    input.eventType === 'enter' &&
    input.enabled &&
    !input.alreadyNotified &&
    isStopActive(input.stop, input.now)
  );
}

export function nearbyBusinessUrl(slug: string, stopId?: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  const base = `/b/${slug}`;
  if (!stopId) return base;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(stopId)) {
    return null;
  }
  return `${base}?section=locations&stop=${encodeURIComponent(stopId)}`;
}

export function shouldShowNearbyTestAction(environment: string | undefined) {
  return environment === 'staging';
}

export function isSafeNotificationUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (value === '/rewards') return true;
  try {
    const parsed = new URL(value, 'https://internal.invalid');
    if (parsed.origin !== 'https://internal.invalid') return false;
    if (parsed.pathname === '/order' || parsed.pathname === '/pickup-order') {
      return (
        !parsed.hash &&
        [...parsed.searchParams.keys()].length === 1 &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          parsed.searchParams.get('orderId') ?? '',
        )
      );
    }
    if (parsed.pathname === '/notification') {
      return (
        [...parsed.searchParams.keys()].every((key) => key === 'type' || key === 'id') &&
        ['event', 'business_update'].includes(parsed.searchParams.get('type') ?? '') &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          parsed.searchParams.get('id') ?? '',
        )
      );
    }
    return (
      /^\/b\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(parsed.pathname) &&
      [...parsed.searchParams.keys()].every((key) => key === 'section' || key === 'stop') &&
      (!parsed.searchParams.has('section') || parsed.searchParams.get('section') === 'locations') &&
      (!parsed.searchParams.has('stop') ||
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          parsed.searchParams.get('stop') ?? '',
        ))
    );
  } catch {
    return false;
  }
}
