import type { Session } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { type Href, router } from 'expo-router';
import { businessChimeStorage } from '@/lib/business-chime-storage';
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
import { AppState, Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import { isSafeNotificationUrl } from '@/lib/nearby-alerts-core';
import { userMessageFromError } from '@/lib/user-error';
import { useAuth } from '@/providers/auth-provider';
import { useAppMode } from '@/providers/app-mode-provider';

type NotificationStatus = 'available' | 'enabled' | 'denied' | 'error' | 'unsupported';

interface NotificationContextValue {
  readonly businessChime: boolean;
  readonly setBusinessChime: (enabled: boolean) => void;
  readonly status: NotificationStatus;
  readonly errorMessage: string | null;
  readonly unreadCount: number;
  readonly refreshUnreadCount: () => Promise<void>;
  readonly enable: () => Promise<boolean>;
  readonly deactivate: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);
const installationKey = 'sds-local-installation-id';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => ({
    shouldPlaySound: notification.request.content.data?.notificationType === 'orders',
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function permissionGranted(permission: Notifications.NotificationPermissionsStatus) {
  if (Platform.OS !== 'ios') return permission.status === 'granted';
  const status = permission.ios?.status;
  return (
    status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    status === Notifications.IosAuthorizationStatus.EPHEMERAL
  );
}

function projectId() {
  const extra = Constants.expoConfig?.extra as
    { eas?: { projectId?: string }; easProjectId?: string } | undefined;
  return extra?.eas?.projectId ?? extra?.easProjectId ?? Constants.easConfig?.projectId;
}

async function installationHash() {
  let installationId = globalThis.localStorage.getItem(installationKey);
  if (!installationId) {
    installationId = Crypto.randomUUID();
    globalThis.localStorage.setItem(installationKey, installationId);
  }
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, installationId);
}

async function registerToken(session: Session) {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('orders', {
      name: 'Pickup orders',
      description: 'New orders, preparation updates, and pickup confirmations.',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('updates', {
      name: 'SDS Local updates',
      description: 'Event reminders, rewards, and followed-business updates.',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const easProjectId = projectId();
  if (!easProjectId) {
    throw new Error(
      'This build is not linked to an EAS project yet. Run EAS init before building.',
    );
  }
  const expoPushToken = await Notifications.getExpoPushTokenAsync({ projectId: easProjectId });
  const { error } = await supabase.rpc('register_push_token', {
    p_expo_push_token: expoPushToken.data,
    p_platform: Platform.OS,
    p_device_id_hash: await installationHash(),
  });
  if (error) throw error;
  return session;
}

function notificationUrl(notification: Notifications.Notification) {
  const value = notification.request.content.data?.url;
  if (typeof value !== 'string') return null;
  if (isSafeNotificationUrl(value)) return value as Href;
  return null;
}

export function NotificationProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const { setMode, loading: modeLoading } = useAppMode();
  const handledResponse = useRef<string | null>(null);
  const [status, setStatus] = useState<NotificationStatus>('available');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chimePreference, setChimePreference] = useState<{
    userId: string;
    enabled: boolean;
  } | null>(null);
  const businessChime =
    chimePreference?.userId === session?.user.id && chimePreference?.enabled === true;
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!session) {
        setChimePreference(null);
        return;
      }
      let enabled = false;
      try {
        enabled = businessChimeStorage.get('business-chime:' + session.user.id) === 'true';
      } catch {}
      setChimePreference({ userId: session.user.id, enabled });
    }, 0);
    return () => clearTimeout(timer);
  }, [session?.user.id]);
  const setBusinessChime = useCallback(
    (enabled: boolean) => {
      if (!session) return;
      setChimePreference({ userId: session.user.id, enabled });
      try {
        businessChimeStorage.set('business-chime:' + session.user.id, String(enabled));
      } catch {}
    },
    [session?.user.id],
  );

  const refreshUnreadCount = useCallback(async () => {
    if (!session) {
      setUnreadCount(0);
      return;
    }
    const { count, error } = await supabase
      .from('notification_deliveries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .or('status.eq.sent,entity_type.eq.pickup_order')
      .is('read_at', null)
      .is('dismissed_at', null);
    if (!error) setUnreadCount(count ?? 0);
  }, [session]);

  const syncGrantedRegistration = useCallback(async () => {
    if (!session) return false;
    const permission = await Notifications.getPermissionsAsync();
    if (!permissionGranted(permission)) {
      setStatus(permission.status === 'denied' ? 'denied' : 'available');
      return false;
    }
    try {
      await registerToken(session);
      setStatus('enabled');
      setErrorMessage(null);
      return true;
    } catch (error) {
      setStatus('error');
      setErrorMessage(
        userMessageFromError(
          error,
          'Notifications could not be enabled right now. Please try again.',
        ),
      );
      return false;
    }
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const initialSync = setTimeout(() => void syncGrantedRegistration(), 0);
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void syncGrantedRegistration();
    });
    return () => {
      clearTimeout(initialSync);
      appStateSubscription.remove();
    };
  }, [session, syncGrantedRegistration]);

  useEffect(() => {
    const initialRefresh = setTimeout(() => void refreshUnreadCount(), 0);
    const appStateSubscription = session
      ? AppState.addEventListener('change', (nextState) => {
          if (nextState === 'active') void refreshUnreadCount();
        })
      : null;
    return () => {
      clearTimeout(initialRefresh);
      appStateSubscription?.remove();
    };
  }, [refreshUnreadCount, session]);

  useEffect(() => {
    const redirect = (notification: Notifications.Notification) => {
      if (modeLoading || !session || handledResponse.current === notification.request.identifier)
        return;
      const url = notificationUrl(notification);
      if (url) {
        handledResponse.current = notification.request.identifier;
        if (
          String(url).startsWith('/pickup-order?') ||
          String(url).startsWith('/service-requests?')
        )
          setMode('business');
        router.push(url);
      }
    };
    const initialResponse = Notifications.getLastNotificationResponse();
    if (initialResponse?.notification) redirect(initialResponse.notification);
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) =>
      redirect(response.notification),
    );
    return () => responseSubscription.remove();
  }, [setMode, modeLoading, session]);

  useEffect(() => {
    const receivedSubscription = Notifications.addNotificationReceivedListener(() => {
      void refreshUnreadCount();
    });
    return () => receivedSubscription.remove();
  }, [refreshUnreadCount]);

  const enable = useCallback(async () => {
    if (!session) return false;
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('updates', {
          name: 'SDS Local updates',
          description: 'Event reminders, rewards, and followed-business updates.',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }
      const existing = await Notifications.getPermissionsAsync();
      const permission = permissionGranted(existing)
        ? existing
        : await Notifications.requestPermissionsAsync();
      if (!permissionGranted(permission)) {
        setStatus('denied');
        setErrorMessage('Notifications are blocked in your device settings.');
        return false;
      }
      await registerToken(session);
      setStatus('enabled');
      setErrorMessage(null);
      return true;
    } catch (error) {
      setStatus('error');
      setErrorMessage(
        userMessageFromError(
          error,
          'Notifications could not be enabled right now. Please try again.',
        ),
      );
      return false;
    }
  }, [session]);

  const deactivate = useCallback(async () => {
    if (!session) return;
    const { error } = await supabase.rpc('deactivate_push_tokens');
    if (error) throw error;
    setStatus('available');
  }, [session]);

  const value = useMemo(
    () => ({
      status,
      errorMessage,
      unreadCount,
      refreshUnreadCount,
      enable,
      deactivate,
      businessChime,
      setBusinessChime,
    }),
    [
      status,
      errorMessage,
      unreadCount,
      refreshUnreadCount,
      enable,
      deactivate,
      businessChime,
      setBusinessChime,
    ],
  );
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const value = useContext(NotificationContext);
  if (!value) throw new Error('useNotifications must be used inside NotificationProvider.');
  return value;
}

export const notificationDeviceDescription = Device.isDevice
  ? 'this device'
  : 'this simulator or emulator';
