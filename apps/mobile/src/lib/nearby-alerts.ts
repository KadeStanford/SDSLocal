import type { NearbyAlertCandidate } from './nearby-alerts-core';

export const nearbyGeofenceTaskName = 'sds-local-nearby-business-geofences-v1';

export async function replaceNearbyGeofences(_input: {
  readonly userId: string;
  readonly radiusMiles: unknown;
  readonly candidates: readonly NearbyAlertCandidate[];
}) {
  return [];
}

export async function stopNearbyGeofencing(_userId: string, _clearAccountState = false) {}

export async function sendStagingNearbyTestAlert(_input: {
  readonly businessName: string;
  readonly businessSlug: string;
  readonly stopId?: string;
}) {
  throw new Error('Nearby alerts are available in the installed mobile app.');
}
