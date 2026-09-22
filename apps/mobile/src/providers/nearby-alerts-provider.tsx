import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, AppState, Linking, Platform } from 'react-native';

import {
  defaultNearbyAlertRadiusMiles,
  deriveNearbyAlertPermissionStatus,
  normalizeNearbyAlertRadius,
  shouldShowNearbyTestAction,
  type NearbyAlertCandidate,
  type NearbyAlertPermissionStatus,
  type NearbyAlertRadiusMiles,
} from '@/lib/nearby-alerts-core';
import {
  replaceNearbyGeofences,
  sendStagingNearbyTestAlert,
  stopNearbyGeofencing,
} from '@/lib/nearby-alerts';
import { supabase } from '@/lib/supabase';
import { userMessageFromError } from '@/lib/user-error';
import { useAuth } from '@/providers/auth-provider';
import { useNotifications } from '@/providers/notification-provider';

export type NearbyAlertStatus = NearbyAlertPermissionStatus;

export interface NearbyBusinessPreference {
  readonly businessId: string;
  readonly businessName: string;
  readonly businessSlug: string;
  readonly enabled: boolean;
}

interface NearbyContextValue {
  readonly status: NearbyAlertStatus;
  readonly accountEnabled: boolean;
  readonly radiusMiles: NearbyAlertRadiusMiles;
  readonly businesses: readonly NearbyBusinessPreference[];
  readonly loading: boolean;
  readonly busy: boolean;
  readonly errorMessage: string | null;
  readonly isStaging: boolean;
  readonly enable: () => Promise<void>;
  readonly disable: () => Promise<void>;
  readonly setRadius: (radius: NearbyAlertRadiusMiles) => Promise<void>;
  readonly setBusinessEnabled: (businessId: string, enabled: boolean) => Promise<void>;
  readonly refresh: () => Promise<void>;
  readonly openSettings: () => Promise<void>;
  readonly sendTest: () => Promise<void>;
  readonly clearForAccount: (userId: string) => Promise<void>;
}

interface StoredPreferencesResponse {
  readonly enabled?: unknown;
  readonly radiusMiles?: unknown;
  readonly businesses?: unknown;
}

interface StopRow {
  readonly business_id: string;
  readonly business_name: string;
  readonly business_slug: string;
  readonly business_type: string;
  readonly stop_id: string;
  readonly stop_title: string;
  readonly address_text: string | null;
  readonly latitude: number;
  readonly longitude: number;
  readonly starts_at: string;
  readonly ends_at: string;
  readonly timezone: string;
  readonly followed: boolean;
  readonly blocked: boolean;
  readonly business_alerts_enabled: boolean;
  readonly published: boolean;
}

const NearbyAlertsContext = createContext<NearbyContextValue | null>(null);
const isStaging = shouldShowNearbyTestAction(process.env.EXPO_PUBLIC_APP_ENV);

function parseBusinesses(value: unknown): NearbyBusinessPreference[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const row = item as Record<string, unknown>;
    return typeof row.businessId === 'string' &&
      typeof row.businessName === 'string' &&
      typeof row.businessSlug === 'string'
      ? [
          {
            businessId: row.businessId,
            businessName: row.businessName,
            businessSlug: row.businessSlug,
            enabled: row.enabled !== false,
          },
        ]
      : [];
  });
}

function mapStop(row: StopRow): NearbyAlertCandidate {
  return {
    businessId: row.business_id,
    businessName: row.business_name,
    businessSlug: row.business_slug,
    businessType: row.business_type,
    stopId: row.stop_id,
    stopTitle: row.stop_title,
    addressText: row.address_text,
    latitude: row.latitude,
    longitude: row.longitude,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    timezone: row.timezone,
    followed: row.followed,
    blocked: row.blocked,
    businessAlertsEnabled: row.business_alerts_enabled,
    published: row.published,
  };
}

function explain(title: string, message: string) {
  return new Promise<boolean>((resolve) => {
    Alert.alert(title, message, [
      { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Continue', onPress: () => resolve(true) },
    ]);
  });
}

function notificationGranted(permission: Notifications.NotificationPermissionsStatus) {
  if (Platform.OS !== 'ios') return permission.status === 'granted';
  return [
    Notifications.IosAuthorizationStatus.AUTHORIZED,
    Notifications.IosAuthorizationStatus.PROVISIONAL,
    Notifications.IosAuthorizationStatus.EPHEMERAL,
  ].includes(permission.ios?.status ?? Notifications.IosAuthorizationStatus.NOT_DETERMINED);
}

async function requestLocalNotificationPermission() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('nearby', {
      name: 'Nearby mobile businesses',
      description: 'Alerts for active nearby stops from mobile businesses you follow.',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const existing = await Notifications.getPermissionsAsync();
  const permission = notificationGranted(existing)
    ? existing
    : await Notifications.requestPermissionsAsync();
  return notificationGranted(permission);
}

export function NearbyAlertsProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const notifications = useNotifications();
  const [status, setStatus] = useState<NearbyAlertStatus>('off');
  const [accountEnabled, setAccountEnabled] = useState(false);
  const [radiusMiles, setRadiusMiles] = useState<NearbyAlertRadiusMiles>(
    defaultNearbyAlertRadiusMiles,
  );
  const [businesses, setBusinesses] = useState<NearbyBusinessPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const previousUserId = useRef<string | null>(null);
  const currentUserId = useRef<string | null>(session?.user.id ?? null);

  useEffect(() => {
    currentUserId.current = session?.user.id ?? null;
  }, [session?.user.id]);

  const readDeviceStatus = useCallback(async (enabled: boolean): Promise<NearbyAlertStatus> => {
    if (!enabled) return 'off';
    try {
      const [
        backgroundAvailable,
        taskManagerAvailable,
        locationServicesEnabled,
        notificationPermission,
        foregroundPermission,
        backgroundPermission,
      ] = await Promise.all([
        Location.isBackgroundLocationAvailableAsync(),
        TaskManager.isAvailableAsync(),
        Location.hasServicesEnabledAsync(),
        Notifications.getPermissionsAsync(),
        Location.getForegroundPermissionsAsync(),
        Location.getBackgroundPermissionsAsync(),
      ]);
      return deriveNearbyAlertPermissionStatus({
        accountEnabled: enabled,
        backgroundAvailable,
        taskManagerAvailable,
        locationServicesEnabled,
        notificationGranted: notificationGranted(notificationPermission),
        foregroundGranted: foregroundPermission.status === 'granted',
        backgroundGranted: backgroundPermission.status === 'granted',
      });
    } catch {
      return 'error';
    }
  }, []);

  const reconcile = useCallback(
    async (enabled = accountEnabled, radius = radiusMiles) => {
      if (!session) return;
      const nextStatus = await readDeviceStatus(enabled);
      setStatus(nextStatus);
      if (nextStatus !== 'enabled') {
        await stopNearbyGeofencing(session.user.id);
        return;
      }
      const { data, error } = await supabase.rpc('get_nearby_alert_stops');
      if (error) throw error;
      if (currentUserId.current !== session.user.id) return;
      await replaceNearbyGeofences({
        userId: session.user.id,
        radiusMiles: radius,
        candidates: ((data ?? []) as StopRow[]).map(mapStop),
      });
    },
    [accountEnabled, radiusMiles, readDeviceStatus, session],
  );

  const refresh = useCallback(async () => {
    if (!session) {
      setAccountEnabled(false);
      setBusinesses([]);
      setStatus('off');
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase.rpc('get_nearby_alert_preferences');
      if (error) throw error;
      const response = (data ?? {}) as StoredPreferencesResponse;
      const enabled = response.enabled === true;
      const radius = normalizeNearbyAlertRadius(response.radiusMiles);
      setAccountEnabled(enabled);
      setRadiusMiles(radius);
      setBusinesses(parseBusinesses(response.businesses));
      setErrorMessage(null);
      await reconcile(enabled, radius);
    } catch (error) {
      setStatus('error');
      setErrorMessage(
        userMessageFromError(error, 'Nearby alerts could not be refreshed. Please try again.'),
      );
    } finally {
      setLoading(false);
    }
  }, [reconcile, session]);

  useEffect(() => {
    const nextUserId = session?.user.id ?? null;
    const oldUserId = previousUserId.current;
    previousUserId.current = nextUserId;
    const initial = setTimeout(() => {
      void (async () => {
        if (oldUserId && oldUserId !== nextUserId) {
          await stopNearbyGeofencing(oldUserId, true);
        }
        if (currentUserId.current === nextUserId) await refresh();
      })();
    }, 0);
    return () => clearTimeout(initial);
  }, [refresh, session?.user.id]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const enable = useCallback(async () => {
    if (!session || busy) return;
    const disclosed = await explain(
      'Nearby mobile-business alerts',
      'SDS Local uses your location to alert you when mobile businesses you follow are serving nearby, even when the app is closed or not in use. Your location is evaluated on this device and is not used for advertising.',
    );
    if (!disclosed) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      const { error: preferenceError } = await supabase.rpc('set_nearby_alert_preferences', {
        p_enabled: true,
        p_radius_miles: radiusMiles,
      });
      if (preferenceError) throw preferenceError;
      setAccountEnabled(true);
      if (!(await requestLocalNotificationPermission())) {
        setStatus('needs_notification_permission');
        return;
      }
      // Push registration is complementary. Nearby entry alerts remain local
      // and can work offline when the OS permission is already available.
      await notifications.enable().catch(() => false);
      const foreground = await Location.requestForegroundPermissionsAsync();
      if (foreground.status !== 'granted') {
        setStatus('needs_foreground_location_permission');
        return;
      }
      if (Platform.OS === 'android') {
        const continueToSettings = await explain(
          'Allow location all the time',
          'Android will open SDS Local’s settings. Choose Allow all the time so nearby alerts can work when the app is closed.',
        );
        if (!continueToSettings) {
          setStatus('needs_background_location_permission');
          return;
        }
      }
      const background = await Location.requestBackgroundPermissionsAsync();
      if (background.status !== 'granted') {
        setStatus('needs_background_location_permission');
        return;
      }
      await reconcile(true, radiusMiles);
    } catch (error) {
      setStatus('error');
      setErrorMessage(
        userMessageFromError(error, 'Nearby alerts could not be enabled. Please try again.'),
      );
    } finally {
      setBusy(false);
    }
  }, [busy, notifications, radiusMiles, reconcile, session]);

  const disable = useCallback(async () => {
    if (!session || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc('set_nearby_alert_preferences', {
        p_enabled: false,
        p_radius_miles: null,
      });
      if (error) throw error;
      await stopNearbyGeofencing(session.user.id);
      setAccountEnabled(false);
      setStatus('off');
      setErrorMessage(null);
    } catch (error) {
      setStatus('error');
      setErrorMessage(
        userMessageFromError(error, 'Nearby alerts could not be turned off. Please try again.'),
      );
    } finally {
      setBusy(false);
    }
  }, [busy, session]);

  const setRadius = useCallback(
    async (radius: NearbyAlertRadiusMiles) => {
      if (!session || busy) return;
      const normalizedRadius = normalizeNearbyAlertRadius(radius);
      const previous = radiusMiles;
      setRadiusMiles(normalizedRadius);
      setBusy(true);
      try {
        const { error } = await supabase.rpc('set_nearby_alert_preferences', {
          p_enabled: null,
          p_radius_miles: normalizedRadius,
        });
        if (error) throw error;
        if (accountEnabled) await reconcile(true, normalizedRadius);
        setErrorMessage(null);
      } catch (error) {
        setRadiusMiles(previous);
        setErrorMessage(
          userMessageFromError(error, 'Your nearby alert distance could not be saved.'),
        );
      } finally {
        setBusy(false);
      }
    },
    [accountEnabled, busy, radiusMiles, reconcile, session],
  );

  const setBusinessEnabled = useCallback(
    async (businessId: string, enabled: boolean) => {
      if (busy) return;
      const previous = businesses;
      setBusinesses((current) =>
        current.map((item) => (item.businessId === businessId ? { ...item, enabled } : item)),
      );
      setBusy(true);
      try {
        const { error } = await supabase.rpc('set_nearby_business_alert_preference', {
          p_business_id: businessId,
          p_is_enabled: enabled,
        });
        if (error) throw error;
        if (accountEnabled) await reconcile();
        setErrorMessage(null);
      } catch (error) {
        setBusinesses(previous);
        setErrorMessage(userMessageFromError(error, 'That nearby alert preference was not saved.'));
      } finally {
        setBusy(false);
      }
    },
    [accountEnabled, businesses, busy, reconcile],
  );

  const sendTest = useCallback(async () => {
    if (!isStaging) return;
    const business = businesses.find(({ enabled }) => enabled) ?? businesses[0];
    if (!business) {
      setErrorMessage('Follow a staging mobile business before sending a test nearby alert.');
      return;
    }
    if (!(await requestLocalNotificationPermission())) {
      setStatus('needs_notification_permission');
      return;
    }
    try {
      await sendStagingNearbyTestAlert({
        businessName: business.businessName,
        businessSlug: business.businessSlug,
      });
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(userMessageFromError(error, 'The test alert could not be sent.'));
    }
  }, [businesses]);

  const clearForAccount = useCallback(async (userId: string) => {
    await stopNearbyGeofencing(userId, true);
    setAccountEnabled(false);
    setBusinesses([]);
    setStatus('off');
  }, []);

  const value = useMemo<NearbyContextValue>(
    () => ({
      status,
      accountEnabled,
      radiusMiles,
      businesses,
      loading,
      busy,
      errorMessage,
      isStaging,
      enable,
      disable,
      setRadius,
      setBusinessEnabled,
      refresh,
      openSettings: Linking.openSettings,
      sendTest,
      clearForAccount,
    }),
    [
      status,
      accountEnabled,
      radiusMiles,
      businesses,
      loading,
      busy,
      errorMessage,
      enable,
      disable,
      setRadius,
      setBusinessEnabled,
      refresh,
      sendTest,
      clearForAccount,
    ],
  );
  return <NearbyAlertsContext.Provider value={value}>{children}</NearbyAlertsContext.Provider>;
}

export function useNearbyAlerts() {
  const value = useContext(NearbyAlertsContext);
  if (!value) throw new Error('useNearbyAlerts must be used inside NearbyAlertsProvider.');
  return value;
}
