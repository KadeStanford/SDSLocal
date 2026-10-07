import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useFocusEffect } from 'expo-router';
import { commerce, pickupCapabilities, readOrderAccess } from '@/lib/square-commerce';
import { type Availability } from '@/lib/square-commerce-core';
import { squareBrowserTimeout } from '@/lib/square-browser';
import {
  initialPickupModule,
  loadPickupModule,
  pickupDiscoveryEnabled,
  pickupModulePresentation,
} from '@/lib/pickup-discovery';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/auth-provider';
import { AppButton } from './app-button';
import { ThemedText } from './themed-text';
import { PickupNavigationButton } from './pickup-navigation-button';

export function PickupOrderCta({
  businessId,
  physicalState,
  nextHours,
}: {
  readonly businessId: string;
  physicalState?: 'open' | 'closed' | 'unknown';
  nextHours?: string | null;
}) {
  const { session } = useAuth();
  const [state, setState] = useState(() => initialPickupModule(businessId));
  const requestId = useRef(0);
  const load = useCallback(async () => {
    if (!pickupDiscoveryEnabled(process.env.EXPO_PUBLIC_APP_ENV)) return;
    const id = ++requestId.current;
    setState((current) => ({
      ...(current.businessId === businessId ? current : initialPickupModule(businessId)),
      loading: true,
      failed: false,
    }));
    const result = await loadPickupModule(businessId, {
      capabilities: () => pickupCapabilities([businessId]),
      order: () => readOrderAccess(undefined, businessId),
      availability: () =>
        squareBrowserTimeout(commerce<Availability>('availability', { businessId })),
    });
    if (id === requestId.current) setState(result);
  }, [businessId]);
  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        ++requestId.current;
      };
      // Recheck the authenticated block policy after sign-in or sign-out.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load, session?.user.id]),
  );
  return (
    <PickupOrderCtaContent
      businessId={businessId}
      state={{
        ...state,
        ...(physicalState ? { physicalState } : {}),
        ...(nextHours ? { nextHours } : {}),
      }}
      onRefresh={() => {
        void load();
      }}
    />
  );
}

export function PickupOrderCtaContent({
  businessId,
  state,
  onRefresh,
}: {
  readonly businessId: string;
  readonly state: ReturnType<typeof initialPickupModule>;
  readonly onRefresh: () => void;
}) {
  const colors = useTheme();
  const view = pickupModulePresentation(
    process.env.EXPO_PUBLIC_APP_ENV,
    state.businessId === businessId ? state : initialPickupModule(businessId),
  );
  if (view.kind === 'hidden') return null;
  const active = view.kind === 'open' || view.kind === 'order';
  const warning = view.kind === 'error';
  const foreground = warning
    ? colors.warningText
    : active
      ? colors.successText
      : colors.textSecondary;
  return (
    <View
      style={{
        padding: Spacing.four,
        gap: Spacing.three,
        borderRadius: Radius.medium,
        backgroundColor: warning
          ? colors.warningSurface
          : active
            ? colors.successSurface
            : view.kind === 'scheduled'
              ? colors.infoSurface
              : colors.backgroundElement,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three }}>
        <SymbolView
          name={
            warning
              ? { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' }
              : view.kind === 'paused'
                ? { ios: 'pause.circle.fill', android: 'pause_circle', web: 'pause_circle' }
                : view.kind === 'scheduled' || view.kind === 'closed'
                  ? { ios: 'clock.fill', android: 'schedule', web: 'schedule' }
                  : { ios: 'bag.fill', android: 'shopping_bag', web: 'shopping_bag' }
          }
          tintColor={foreground}
          style={{ width: 24, height: 24, flexShrink: 0 }}
        />
        <View style={{ flex: 1, minWidth: 0, gap: Spacing.one }} accessibilityLiveRegion="polite">
          <ThemedText type="card">{view.title}</ThemedText>
          <ThemedText themeColor="textSecondary">{view.message}</ThemedText>
        </View>
      </View>
      {view.kind === 'loading' ? (
        <ActivityIndicator accessibilityLabel="Checking pickup options" color={colors.accent} />
      ) : view.kind === 'open' || view.kind === 'order' || view.kind === 'scheduled' ? (
        <PickupNavigationButton
          label={view.action}
          destination={{
            pathname: '/order',
            params: view.kind === 'order' ? { orderId: state.orderId! } : { businessId },
          }}
        />
      ) : (
        <AppButton label={view.action} variant="secondary" onPress={onRefresh} />
      )}
    </View>
  );
}
