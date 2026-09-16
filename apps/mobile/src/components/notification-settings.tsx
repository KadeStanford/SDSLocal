import { useEffect, useState } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { userMessageFromError } from '@/lib/user-error';
import { notificationDeviceDescription, useNotifications } from '@/providers/notification-provider';

type PreferenceKey = 'events_enabled' | 'loyalty_enabled' | 'general_updates_enabled';
type PreferenceType = 'events' | 'loyalty' | 'general_updates';

interface BusinessSettings {
  business_id: string;
  business_name: string;
  events_enabled: boolean;
  loyalty_enabled: boolean;
  general_updates_enabled: boolean;
}

const preferenceRows: readonly {
  key: PreferenceKey;
  type: PreferenceType;
  label: string;
}[] = [
  { key: 'events_enabled', type: 'events', label: 'Events and reminders' },
  { key: 'loyalty_enabled', type: 'loyalty', label: 'Rewards and loyalty' },
  { key: 'general_updates_enabled', type: 'general_updates', label: 'General updates' },
];

export function NotificationSettings() {
  const notifications = useNotifications();
  const [settings, setSettings] = useState<BusinessSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    void supabase.rpc('get_notification_settings').then(({ data, error }) => {
      if (error) {
        Alert.alert(
          'Could not load notifications',
          userMessageFromError(error, 'We could not load your notification settings.'),
        );
      }
      setSettings((data ?? []) as BusinessSettings[]);
      setLoading(false);
    });
  }, []);

  async function changePreference(
    businessId: string,
    key: PreferenceKey,
    type: PreferenceType,
    value: boolean,
  ) {
    const operationKey = `${businessId}:${type}`;
    setBusyKey(operationKey);
    const previous = settings;
    setSettings((current) =>
      current.map((business) =>
        business.business_id === businessId ? { ...business, [key]: value } : business,
      ),
    );
    const { error } = await supabase.rpc('set_notification_preference', {
      p_business_id: businessId,
      p_notification_type: type,
      p_is_enabled: value,
    });
    if (error) {
      setSettings(previous);
      Alert.alert(
        'Could not save preference',
        userMessageFromError(error, 'That preference could not be saved. Please try again.'),
      );
    }
    setBusyKey(null);
  }

  return (
    <View style={styles.card}>
      <ThemedText type="subtitle">Notifications</ThemedText>
      {loading ? (
        <ThemedText themeColor="textSecondary">Loading preferences…</ThemedText>
      ) : settings.length === 0 ? (
        <ThemedText themeColor="textSecondary">
          Follow a business, save an event, or join rewards first. Then SDS Local can explain the
          useful updates available before asking for permission.
        </ThemedText>
      ) : (
        <>
          <ThemedText themeColor="textSecondary">
            Get event reminders and reward updates from businesses you chose. You control each
            category below.
          </ThemedText>
          {notifications.status !== 'enabled' && Platform.OS !== 'web' && (
            <Pressable
              accessibilityRole="button"
              onPress={() => void notifications.enable()}
              style={styles.enableButton}
            >
              <ThemedText type="smallBold" style={styles.enableText}>
                Enable notifications on {notificationDeviceDescription}
              </ThemedText>
            </Pressable>
          )}
          {notifications.status === 'denied' && (
            <Pressable onPress={() => void Linking.openSettings()}>
              <ThemedText type="linkPrimary">Open device settings</ThemedText>
            </Pressable>
          )}
          {notifications.status === 'unsupported' && (
            <ThemedText themeColor="textSecondary">
              Push alerts are available in the installed iOS and Android app.
            </ThemedText>
          )}
          {notifications.errorMessage && (
            <ThemedText style={styles.error}>{notifications.errorMessage}</ThemedText>
          )}
          {settings.map((business) => (
            <View key={business.business_id} style={styles.businessGroup}>
              <ThemedText type="smallBold">{business.business_name}</ThemedText>
              {preferenceRows.map((preference) => {
                const key = `${business.business_id}:${preference.type}`;
                return (
                  <View key={preference.type} style={styles.switchRow}>
                    <ThemedText type="small">{preference.label}</ThemedText>
                    <Switch
                      accessibilityLabel={`${preference.label} from ${business.business_name}`}
                      disabled={busyKey === key}
                      value={business[preference.key]}
                      onValueChange={(value) =>
                        void changePreference(
                          business.business_id,
                          preference.key,
                          preference.type,
                          value,
                        )
                      }
                    />
                  </View>
                );
              })}
            </View>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BFCAC3',
  },
  enableButton: {
    minHeight: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#176B4D',
  },
  enableText: { color: '#FFFFFF', textAlign: 'center' },
  error: { color: '#A12B2B' },
  businessGroup: {
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: '#DCE2DE',
    gap: Spacing.one,
  },
  switchRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
});
