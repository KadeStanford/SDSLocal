import type { Session } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { type Href, router } from 'expo-router';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState, Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import { userMessageFromError } from '@/lib/user-error';
import { useAuth } from '@/providers/auth-provider';

type NotificationStatus = 'available' | 'enabled' | 'denied' | 'error' | 'unsupported';

interface NotificationContextValue {
  readonly status: NotificationStatus;
  readonly errorMessage: string | null;
  readonly enable: () => Promise<boolean>;
  readonly deactivate: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);
const installationKey = 'sds-local-installation-id';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
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
  if (value === '/rewards' || value.startsWith('/notification?')) return value as Href;
  return null;
}

export function NotificationProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const [status, setStatus] = useState<NotificationStatus>('available');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    const redirect = (notification: Notifications.Notification) => {
      const url = notificationUrl(notification);
      if (url) router.push(url);
    };
    const initialResponse = Notifications.getLastNotificationResponse();
    if (initialResponse?.notification) redirect(initialResponse.notification);
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) =>
      redirect(response.notification),
    );
    return () => responseSubscription.remove();
  }, []);

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
    () => ({ status, errorMessage, enable, deactivate }),
    [status, errorMessage, enable, deactivate],
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
