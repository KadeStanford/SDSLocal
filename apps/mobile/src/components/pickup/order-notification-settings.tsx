import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { AppButton } from '../app-button';
import { CommerceToggle } from '../commerce-fields';
import { ThemedText } from '../themed-text';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { useNotifications } from '@/providers/notification-provider';
import { useTheme } from '@/hooks/use-theme';

export function OrderNotificationSettings({ hideHeading = false }: { hideHeading?: boolean }) {
  const { session } = useAuth();
  return (
    <OrderNotificationSettingsForUser hideHeading={hideHeading} key={session?.user.id ?? 'guest'} />
  );
}

function OrderNotificationSettingsForUser({ hideHeading }: { hideHeading: boolean }) {
  const { session } = useAuth();
  const notifications = useNotifications();
  const c = useTheme();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    if (session)
      void supabase.rpc('order_notification_preference').then(({ data, error }) => {
        if (!active) return;
        if (error) setError('Order alert preferences could not load.');
        else {
          setEnabled(data === true);
          setError('');
        }
      });
    return () => {
      active = false;
    };
  }, [session, retry]);
  async function change(value: boolean) {
    setBusy(true);
    setError('');
    if (value && Platform.OS !== 'web' && notifications.status !== 'enabled') {
      const registered = await notifications.enable();
      if (!registered) {
        setError(
          notifications.errorMessage ??
            'Allow notifications on this device to receive order updates outside the app.',
        );
        setBusy(false);
        return;
      }
    }
    const { data, error } = await supabase.rpc('order_notification_preference', {
      p_enabled: value,
    });
    if (error) setError('Your preference could not be saved. Please retry.');
    else setEnabled(data === true);
    setBusy(false);
  }
  if (!session)
    return (
      <ThemedText type="small" themeColor="textSecondary">
        Sign in to receive pickup updates on your devices. You can still follow this order here.
      </ThemedText>
    );
  return (
    <View style={{ gap: 10, padding: 16, borderRadius: 16, backgroundColor: c.backgroundElement }}>
      {!hideHeading && <ThemedText type="card">Order alerts</ThemedText>}
      <ThemedText type="small" themeColor="textSecondary">
        New business orders, preparation updates, and pickup confirmations. Order updates also
        appear in Alerts. This setting works for customer orders and business team members.
      </ThemedText>
      <CommerceToggle
        label="Push notifications for orders"
        value={enabled === true}
        disabled={busy || enabled === null}
        onChange={(value) => void change(value)}
      />
      {enabled && notifications.status !== 'enabled' && Platform.OS !== 'web' && (
        <AppButton
          label="Enable notifications on this device"
          variant="secondary"
          disabled={busy}
          onPress={() => void notifications.enable()}
        />
      )}
      {enabled && notifications.status === 'enabled' && (
        <ThemedText type="small" themeColor="textSecondary">
          Push delivery is enabled on this device. Order banners can appear while the app is open or
          in the background, and every update remains in Alerts.
        </ThemedText>
      )}
      {notifications.errorMessage && (
        <ThemedText type="small" style={{ color: c.errorText }}>
          {notifications.errorMessage}
        </ThemedText>
      )}
      {!!error && (
        <ThemedText type="small" style={{ color: c.errorText }}>
          {error}
        </ThemedText>
      )}
      {!!error && enabled === null && (
        <AppButton
          label="Retry order alerts"
          variant="tertiary"
          onPress={() => setRetry(retry + 1)}
        />
      )}
    </View>
  );
}
