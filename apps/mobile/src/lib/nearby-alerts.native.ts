import './sqlite-storage';

import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import {
  defaultNearbyAlertRadiusMiles,
  nearbyAlertAccountCacheKey,
  nearbyAlertDedupeKey,
  nearbyAlertLocationCacheMaxAgeMs,
  nearbyBusinessUrl,
  normalizeNearbyAlertRadius,
  planNearbyRegions,
  pruneNearbyAlertDedupe,
  recordNearbyAlert,
  shouldNotifyNearbyEntry,
  type NearbyAlertCandidate,
  type NearbyAlertDedupe,
  type NearbyAlertLocation,
  type NearbyAlertRadiusMiles,
  type PlannedNearbyRegion,
} from './nearby-alerts-core';

export const nearbyGeofenceTaskName = 'sds-local-nearby-business-geofences-v1';
const activeUserKey = 'sds-local:nearby-alerts:active-user';
const stateKey = nearbyAlertAccountCacheKey;

interface NearbyExecutionState {
  readonly userId: string;
  readonly enabled: boolean;
  readonly radiusMiles: NearbyAlertRadiusMiles;
  readonly regions: readonly PlannedNearbyRegion[];
  readonly dedupe: NearbyAlertDedupe;
  readonly location: NearbyAlertLocation | null;
}

function readState(userId: string): NearbyExecutionState | null {
  try {
    const value = globalThis.localStorage.getItem(stateKey(userId));
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<NearbyExecutionState>;
    if (parsed.userId !== userId) return null;
    return {
      userId,
      enabled: parsed.enabled === true,
      radiusMiles: normalizeNearbyAlertRadius(parsed.radiusMiles),
      regions: Array.isArray(parsed.regions) ? parsed.regions : [],
      dedupe: parsed.dedupe && typeof parsed.dedupe === 'object' ? parsed.dedupe : {},
      location: parsed.location ?? null,
    };
  } catch {
    return null;
  }
}

function writeState(state: NearbyExecutionState) {
  try {
    globalThis.localStorage.setItem(stateKey(state.userId), JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

function activeUserId() {
  try {
    return globalThis.localStorage.getItem(activeUserKey);
  } catch {
    return null;
  }
}

function setActiveUserId(userId: string) {
  try {
    globalThis.localStorage.setItem(activeUserKey, userId);
    return true;
  } catch {
    return false;
  }
}

function endTimeText(stop: PlannedNearbyRegion) {
  try {
    return new Date(stop.endsAt).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: stop.timezone,
    });
  } catch {
    return new Date(stop.endsAt).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  }
}

const immediateNearbyTrigger =
  Platform.OS === 'android'
    ? {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1,
        channelId: 'nearby',
      }
    : null;

TaskManager.defineTask<{
  eventType: Location.GeofencingEventType;
  region: Location.LocationRegion;
}>(nearbyGeofenceTaskName, async ({ data, error }) => {
  if (error || !data?.region) return;
  const currentUserId = activeUserId();
  if (!currentUserId) return;
  const state = readState(currentUserId);
  if (!state?.enabled) return;
  const stop = state.regions.find(({ identifier }) => identifier === data.region.identifier);
  if (!stop) return;
  const now = Date.now();
  const dedupe = pruneNearbyAlertDedupe(state.dedupe, now);
  const key = nearbyAlertDedupeKey(currentUserId, stop);
  const eventType = data.eventType === Location.GeofencingEventType.Enter ? 'enter' : 'exit';
  if (
    !shouldNotifyNearbyEntry({
      eventType,
      stop,
      enabled: state.enabled && stop.followed && !stop.blocked && stop.businessAlertsEnabled,
      now,
      alreadyNotified: Boolean(dedupe[key]),
    })
  ) {
    if (Object.keys(dedupe).length !== Object.keys(state.dedupe).length) {
      writeState({ ...state, dedupe });
    }
    return;
  }

  const url = nearbyBusinessUrl(stop.businessSlug, stop.stopId);
  if (!url) return;
  const nextDedupe = recordNearbyAlert(dedupe, key, now);
  if (!nextDedupe) return;
  if (!writeState({ ...state, dedupe: nextDedupe })) return;
  if (activeUserId() !== currentUserId) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${stop.businessName} is nearby`,
        body: `Serving at ${stop.stopTitle} until ${endTimeText(stop)}.`,
        data: { url, type: 'nearby', businessId: stop.businessId, stopId: stop.stopId },
        sound: 'default',
      },
      trigger: immediateNearbyTrigger,
    });
  } catch {
    // A denied/restricted notification must not crash a background task.
  }
});

export async function replaceNearbyGeofences(input: {
  readonly userId: string;
  readonly radiusMiles: unknown;
  readonly candidates: readonly NearbyAlertCandidate[];
}) {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('nearby', {
      name: 'Nearby mobile businesses',
      description: 'Alerts for active nearby stops from mobile businesses you follow.',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const radiusMiles = normalizeNearbyAlertRadius(input.radiusMiles);
  const previous = readState(input.userId);
  let location =
    previous?.location &&
    Date.now() - previous.location.capturedAt <= nearbyAlertLocationCacheMaxAgeMs
      ? previous.location
      : null;
  try {
    const position = await Location.getLastKnownPositionAsync({
      maxAge: nearbyAlertLocationCacheMaxAgeMs,
      requiredAccuracy: 5_000,
    });
    if (position) {
      location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        capturedAt: position.timestamp,
      };
    }
  } catch {
    // Distance is an optional ranking input. Time and IDs remain deterministic.
  }
  const regions = planNearbyRegions({
    candidates: input.candidates,
    userId: input.userId,
    radiusMiles,
    platform: Platform.OS,
    now: Date.now(),
    location,
  });
  const persisted = writeState({
    userId: input.userId,
    enabled: true,
    radiusMiles,
    regions,
    dedupe: pruneNearbyAlertDedupe(previous?.dedupe ?? {}, Date.now()),
    location,
  });
  if (!persisted || !setActiveUserId(input.userId)) {
    throw new Error('Nearby alerts could not save their device state.');
  }
  if (regions.length === 0) {
    if (await Location.hasStartedGeofencingAsync(nearbyGeofenceTaskName)) {
      await Location.stopGeofencingAsync(nearbyGeofenceTaskName);
    }
    return regions;
  }
  await Location.startGeofencingAsync(
    nearbyGeofenceTaskName,
    regions.map(({ identifier, latitude, longitude, radius }) => ({
      identifier,
      latitude,
      longitude,
      radius,
      notifyOnEnter: true,
      notifyOnExit: false,
    })),
  );
  return regions;
}

export async function stopNearbyGeofencing(userId: string, clearAccountState = false) {
  try {
    if (await Location.hasStartedGeofencingAsync(nearbyGeofenceTaskName)) {
      await Location.stopGeofencingAsync(nearbyGeofenceTaskName);
    }
  } finally {
    try {
      if (activeUserId() === userId) globalThis.localStorage.removeItem(activeUserKey);
      if (clearAccountState) {
        globalThis.localStorage.removeItem(stateKey(userId));
      } else {
        const previous = readState(userId);
        writeState({
          userId,
          enabled: false,
          radiusMiles: previous?.radiusMiles ?? defaultNearbyAlertRadiusMiles,
          regions: [],
          dedupe: previous?.dedupe ?? {},
          location: previous?.location ?? null,
        });
      }
    } catch {
      // Geofencing is already stopped; a storage cleanup failure is non-fatal.
    }
  }
}

export async function sendStagingNearbyTestAlert(input: {
  readonly businessName: string;
  readonly businessSlug: string;
  readonly stopId?: string;
}) {
  const url = nearbyBusinessUrl(input.businessSlug, input.stopId);
  if (!url) throw new Error('No safe staging business destination is available.');
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('nearby', {
      name: 'Nearby mobile businesses',
      description: 'Alerts for active nearby stops from mobile businesses you follow.',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Test: ${input.businessName} is nearby`,
      body: 'This verifies local notification display and navigation, not a geofence entry.',
      data: { url, type: 'nearby-test' },
      sound: 'default',
    },
    trigger: immediateNearbyTrigger,
  });
  return url;
}
