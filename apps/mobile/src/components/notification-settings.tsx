import {
  MerchantButton,
  MerchantRow,
  MerchantSearch,
  MerchantSheet,
  merchantStyles,
} from '@/components/merchant-ui';
import { StateNotice } from '@/components/data-state';
import { useMerchantTheme } from '@/hooks/use-merchant-theme';
import { useAuth } from '@/providers/auth-provider';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type GestureResponderEvent,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useSwipeBackGestureBlocker } from '@/components/swipe-back-view';
import { Brand, Colors, Spacing, Radius } from '@/constants/theme';
import {
  clampNearbyAlertRadius,
  nearbyAlertRadiusFromPosition,
  nearbyAlertRadiusMaximumMiles,
  nearbyAlertRadiusMinimumMiles,
  type NearbyAlertRadiusMiles,
} from '@/lib/nearby-alerts-core';
import { supabase } from '@/lib/supabase';
import { userMessageFromError } from '@/lib/user-error';
import { useNearbyAlerts, type NearbyAlertStatus } from '@/providers/nearby-alerts-provider';
import { useNotifications } from '@/providers/notification-provider';
import { OrderNotificationSettings } from './pickup/order-notification-settings';

type PreferenceKey = 'events_enabled' | 'loyalty_enabled' | 'general_updates_enabled';
type PreferenceType = 'events' | 'loyalty' | 'general_updates';

interface BusinessSettings {
  business_id: string;
  business_name: string;
  events_enabled: boolean;
  loyalty_enabled: boolean;
  general_updates_enabled: boolean;
}

const preferenceRows: readonly { key: PreferenceKey; type: PreferenceType; label: string }[] = [
  { key: 'events_enabled', type: 'events', label: 'Events and reminders' },
  { key: 'loyalty_enabled', type: 'loyalty', label: 'Rewards and loyalty' },
  { key: 'general_updates_enabled', type: 'general_updates', label: 'General updates' },
];

const statusCopy: Record<NearbyAlertStatus, string> = {
  off: 'Off',
  needs_notification_permission: 'Needs notification permission',
  needs_foreground_location_permission: 'Needs location permission',
  needs_background_location_permission: 'Needs Always location permission',
  enabled: 'Enabled',
  restricted: 'Restricted by device settings',
  unsupported: 'Unsupported on this device',
  error: 'Error',
};

function mileLabel(miles: number) {
  return `${miles} ${miles === 1 ? 'mile' : 'miles'}`;
}

function RadiusSlider({
  value,
  disabled,
  borderColor,
  onChange,
}: {
  readonly value: NearbyAlertRadiusMiles;
  readonly disabled: boolean;
  readonly borderColor: string;
  readonly onChange: (value: NearbyAlertRadiusMiles) => Promise<void>;
}) {
  const sliderColors = useMerchantTheme();
  const [draft, setDraft] = useState<NearbyAlertRadiusMiles | null>(null);
  const [width, setWidth] = useState(0);
  const { beginControlGesture, endControlGesture } = useSwipeBackGestureBlocker();
  const displayedValue = draft ?? value;

  const updateFromGesture = (event: GestureResponderEvent) => {
    const next = nearbyAlertRadiusFromPosition(event.nativeEvent.locationX - 10, width - 20);
    setDraft(next);
  };

  const commit = (next: NearbyAlertRadiusMiles) => {
    if (next !== value) void onChange(next);
    setDraft(null);
  };

  const percentage =
    ((displayedValue - nearbyAlertRadiusMinimumMiles) /
      (nearbyAlertRadiusMaximumMiles - nearbyAlertRadiusMinimumMiles)) *
    100;

  return (
    <View style={styles.sliderBlock}>
      <View style={styles.sliderValueRow}>
        <ThemedText type="smallBold">Alert distance</ThemedText>
        <ThemedText
          accessibilityLiveRegion="polite"
          type="smallBold"
          style={[styles.sliderValue, { color: sliderColors.text }]}
        >
          {mileLabel(displayedValue)}
        </ThemedText>
      </View>
      <View
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        accessibilityHint="Swipe up or down to adjust the alert distance one mile at a time"
        accessibilityLabel="Nearby alert distance"
        accessibilityRole="adjustable"
        accessibilityState={{ disabled }}
        accessibilityValue={{
          min: nearbyAlertRadiusMinimumMiles,
          max: nearbyAlertRadiusMaximumMiles,
          now: displayedValue,
          text: mileLabel(displayedValue),
        }}
        onAccessibilityAction={({ nativeEvent }) => {
          if (disabled) return;
          const delta = nativeEvent.actionName === 'increment' ? 1 : -1;
          const next = clampNearbyAlertRadius(displayedValue + delta);
          commit(next);
        }}
        onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}
        onMoveShouldSetResponder={() => !disabled}
        onResponderGrant={(event) => {
          beginControlGesture();
          updateFromGesture(event);
        }}
        onResponderMove={updateFromGesture}
        onResponderRelease={(event) => {
          const next = nearbyAlertRadiusFromPosition(event.nativeEvent.locationX - 10, width - 20);
          commit(next);
          endControlGesture();
        }}
        onResponderTerminate={() => {
          setDraft(null);
          endControlGesture();
        }}
        onStartShouldSetResponder={() => !disabled}
        style={[styles.sliderTouchArea, disabled && styles.sliderDisabled]}
      >
        <View style={[styles.sliderTrack, { backgroundColor: borderColor }]}>
          <View style={[styles.sliderFill, { width: `${percentage}%` }]} />
          <View style={[styles.sliderThumb, { left: `${percentage}%` }]} />
        </View>
      </View>
      <View style={styles.sliderRangeRow}>
        <ThemedText themeColor="textSecondary" type="small">
          1 mile
        </ThemedText>
        <ThemedText themeColor="textSecondary" type="small">
          25 miles
        </ThemedText>
      </View>
    </View>
  );
}

export function NotificationSettings() {
  const { session } = useAuth();
  return <NotificationSettingsForUser key={session?.user.id ?? 'guest'} />;
}
function NotificationSettingsForUser() {
  const notifications = useNotifications();
  const nearby = useNearbyAlerts();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [settings, setSettings] = useState<BusinessSettings[]>([]);
  const merchantColors = useMerchantTheme();
  const [panel, setPanel] = useState<'order' | 'nearby' | null>(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const pending = useRef(false);
  const selectedBusiness = settings.find((b) => b.business_id === selectedBusinessId);
  const visibleSettings = settings.filter((b) =>
    b.business_name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase.rpc('get_notification_settings');
      if (error) throw error;
      setSettings((data ?? []) as BusinessSettings[]);
    } catch (cause) {
      setError(userMessageFromError(cause, 'Your notification settings could not load.'));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timeout = setTimeout(() => void loadSettings(), 0);
    return () => clearTimeout(timeout);
  }, [loadSettings]);

  async function changePreference(
    businessId: string,
    key: PreferenceKey,
    type: PreferenceType,
    value: boolean,
  ) {
    if (pending.current) return;
    pending.current = true;
    setBusyKey(businessId + ':' + type);
    setError('');
    try {
      const { error } = await supabase.rpc('set_notification_preference', {
        p_business_id: businessId,
        p_notification_type: type,
        p_is_enabled: value,
      });
      if (error) throw error;
      setSettings((current) =>
        current.map((business) =>
          business.business_id === businessId ? { ...business, [key]: value } : business,
        ),
      );
    } catch (cause) {
      setError(userMessageFromError(cause, 'That preference could not be saved. Please retry.'));
    } finally {
      pending.current = false;
      setBusyKey(null);
    }
  }
  const needsSettings = [
    'needs_notification_permission',
    'needs_foreground_location_permission',
    'needs_background_location_permission',
    'restricted',
  ].includes(nearby.status);

  return (
    <View style={{ gap: 20 }}>
      <View style={[merchantStyles.list, { borderColor: merchantColors.border }]}>
        <MerchantRow
          title="Order alerts"
          subtitle="Push updates for customer orders and your team"
          onPress={() => setPanel('order')}
        />
        <MerchantRow
          title="Nearby business alerts"
          subtitle={statusCopy[nearby.status] + ' · ' + mileLabel(nearby.radiusMiles)}
          onPress={() => setPanel('nearby')}
        />
      </View>
      <View style={{ gap: 12 }}>
        <ThemedText type="smallBold">Business updates</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Choose events, rewards and news for each business you follow.
        </ThemedText>
        {error && (
          <>
            <StateNotice kind="error" message={error} />
            <MerchantButton
              label="Retry preferences"
              secondary
              disabled={!!busyKey}
              onPress={() => void loadSettings()}
            />
          </>
        )}
        <MerchantSearch
          value={search}
          onChange={setSearch}
          placeholder="Search followed businesses"
        />
        {loading ? (
          <ThemedText type="small">Loading preferences…</ThemedText>
        ) : (
          !visibleSettings.length && (
            <ThemedText type="small" themeColor="textSecondary">
              {settings.length
                ? 'No matching businesses.'
                : 'Follow a business or join rewards to choose its updates.'}
            </ThemedText>
          )
        )}
        {!!visibleSettings.length && (
          <View style={[merchantStyles.list, { borderColor: merchantColors.border }]}>
            {visibleSettings.map((business) => (
              <MerchantRow
                key={business.business_id}
                title={business.business_name}
                subtitle={
                  preferenceRows
                    .filter((p) => business[p.key])
                    .map((p) =>
                      p.type === 'events' ? 'Events' : p.type === 'loyalty' ? 'Rewards' : 'News',
                    )
                    .join(' · ') || 'Updates off'
                }
                onPress={() => {
                  setError('');
                  setSelectedBusinessId(business.business_id);
                }}
              />
            ))}
          </View>
        )}
      </View>
      {notifications.status !== 'enabled' && Platform.OS !== 'web' && (
        <MerchantButton
          label="Enable notifications on this device"
          secondary
          onPress={() => void notifications.enable()}
        />
      )}
      <MerchantSheet
        visible={!!panel}
        title={panel === 'order' ? 'Order alerts' : 'Nearby business alerts'}
        blocked={nearby.busy}
        onClose={() => setPanel(null)}
      >
        {panel === 'order' && <OrderNotificationSettings hideHeading />}
        {panel === 'nearby' && (
          <View style={[styles.card, { borderColor: colors.border }]}>
            <View style={styles.titleRow}>
              <View style={styles.titleCopy}>
                <ThemedText type="subtitle">Nearby mobile-business alerts</ThemedText>
                <ThemedText themeColor="textSecondary" type="small">
                  {statusCopy[nearby.status]}
                </ThemedText>
              </View>
              <Switch
                accessibilityLabel="Nearby mobile-business alerts"
                accessibilityHint="Alerts when followed mobile businesses have an active published stop nearby"
                disabled={nearby.loading || nearby.busy || nearby.status === 'unsupported'}
                value={nearby.accountEnabled}
                onValueChange={(value) => void (value ? nearby.enable() : nearby.disable())}
              />
            </View>
            <ThemedText themeColor="textSecondary">
              Get an alert when a mobile business you follow has an active published stop nearby.
              Location may be checked even when the app is closed or not in use.
            </ThemedText>
            <View style={[styles.disclosure, { backgroundColor: colors.backgroundElement }]}>
              <ThemedText type="small">
                Your location is evaluated on this device and is not used for advertising. Parish
                Pass does not upload a continuous location history.
              </ThemedText>
            </View>

            <RadiusSlider
              borderColor={colors.border}
              disabled={nearby.busy}
              onChange={nearby.setRadius}
              value={nearby.radiusMiles}
            />

            {needsSettings && nearby.accountEnabled && (
              <Pressable
                accessibilityRole="button"
                onPress={() => void nearby.openSettings()}
                style={styles.secondaryButton}
              >
                <ThemedText type="smallBold">Open settings</ThemedText>
              </Pressable>
            )}

            {nearby.businesses.length > 0 && (
              <View style={styles.businessList}>
                <ThemedText type="smallBold">Followed mobile businesses</ThemedText>
                {nearby.businesses.map((business) => (
                  <View key={business.businessId} style={styles.switchRow}>
                    <ThemedText type="small" style={styles.flexText}>
                      {business.businessName}
                    </ThemedText>
                    <Switch
                      accessibilityLabel={`Nearby alerts from ${business.businessName}`}
                      disabled={nearby.busy}
                      value={business.enabled}
                      onValueChange={(enabled) =>
                        void nearby.setBusinessEnabled(business.businessId, enabled)
                      }
                    />
                  </View>
                ))}
              </View>
            )}

            {nearby.isStaging && (
              <View style={styles.testBlock}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Send test nearby alert"
                  disabled={nearby.busy}
                  onPress={() => void nearby.sendTest()}
                  style={styles.secondaryButton}
                >
                  <ThemedText type="smallBold">Send test nearby alert</ThemedText>
                </Pressable>
                <ThemedText themeColor="textSecondary" type="small">
                  Staging test: verifies notification display and navigation, not geofence entry.
                </ThemedText>
              </View>
            )}
            {nearby.errorMessage && (
              <ThemedText
                accessibilityLiveRegion="polite"
                style={[styles.error, { color: colors.errorText }]}
              >
                {nearby.errorMessage}
              </ThemedText>
            )}
            {!nearby.errorMessage && notifications.errorMessage && nearby.accountEnabled && (
              <ThemedText
                accessibilityLiveRegion="polite"
                style={[styles.error, { color: colors.errorText }]}
              >
                Nearby alerts can still run locally, but push registration needs another try when
                you are online.
              </ThemedText>
            )}
          </View>
        )}
      </MerchantSheet>
      <MerchantSheet
        visible={!!selectedBusiness}
        title={selectedBusiness?.business_name ?? 'Business updates'}
        blocked={!!busyKey}
        onClose={() => setSelectedBusinessId(null)}
      >
        {error && <StateNotice kind="error" message={error} />}
        <ThemedText type="small" themeColor="textSecondary">
          Preferences save when you change a switch.
        </ThemedText>
        {selectedBusiness &&
          preferenceRows.map((preference) => (
            <View key={preference.type} style={styles.switchRow}>
              <ThemedText style={{ flex: 1 }} type="small">
                {preference.label}
              </ThemedText>
              <Switch
                accessibilityLabel={preference.label + ' from ' + selectedBusiness.business_name}
                disabled={!!busyKey}
                value={selectedBusiness[preference.key]}
                onValueChange={(value) =>
                  void changePreference(
                    selectedBusiness.business_id,
                    preference.key,
                    preference.type,
                    value,
                  )
                }
              />
            </View>
          ))}
      </MerchantSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: Spacing.three },
  card: { gap: Spacing.two, padding: Spacing.three, borderRadius: 16, borderWidth: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  titleCopy: { flex: 1, gap: 2 },
  disclosure: { borderRadius: 12, padding: Spacing.two },
  sliderBlock: { gap: 2 },
  sliderValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  sliderValue: { color: Brand.primary },
  sliderTouchArea: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 10 },
  sliderDisabled: { opacity: 0.55 },
  sliderTrack: { height: 6, borderRadius: 3 },
  sliderFill: {
    position: 'absolute',
    height: 6,
    borderRadius: 3,
    backgroundColor: Brand.primary,
  },
  sliderThumb: {
    position: 'absolute',
    top: -8,
    width: 22,
    height: 22,
    marginLeft: -11,
    borderRadius: 11,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: Brand.primary,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  sliderRangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: Radius.small,
    borderWidth: 1,
    borderColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  businessList: { gap: Spacing.one, paddingTop: Spacing.one },
  testBlock: { gap: Spacing.one },
  enableButton: {
    minHeight: 48,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: Brand.primary,
  },
  enableText: { color: '#FFFFFF', textAlign: 'center' },
  error: { color: '#A12B2B' },
  businessGroup: {
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#8A9690',
    gap: Spacing.one,
  },
  switchRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  flexText: { flex: 1 },
});
