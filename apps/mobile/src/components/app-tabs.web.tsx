import { publicShareBaseUrl } from '@/lib/share-links';
import { router, usePathname } from 'expo-router';
import { useEffect, useSyncExternalStore } from 'react';
import { usePickupWorkspace } from '@/providers/pickup-workspace-provider';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTabOverlay } from '@/hooks/use-screen-bottom-padding';
import { useAuth } from '@/providers/auth-provider';
import { useAppMode } from '@/providers/app-mode-provider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import { Pressable, useWindowDimensions, View, StyleSheet } from 'react-native';

import { ExternalLink } from './external-link';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { pickupDiscoveryEnabled } from '@/lib/pickup-discovery';

const subscribeHydration = () => () => undefined;

export default function AppTabs() {
  const { session } = useAuth();
  const { mode, hasBusinessAccess } = useAppMode();
  const businessMode = Boolean(session && mode === 'business' && hasBusinessAccess);
  const pickup = usePickupWorkspace();
  const pathname = usePathname();
  const showOrders = businessMode && pickup.businesses.length > 0;
  useEffect(() => {
    if (pathname === '/pickup-orders' && !pickup.loading && !pickup.error && !showOrders)
      router.replace(
        businessMode
          ? {
              pathname: '/businesses',
              params: {
                pickupNotice:
                  'Pickup ordering is no longer enabled for your businesses, or your staff access changed.',
              },
            }
          : '/explore',
      );
  }, [pathname, pickup.loading, pickup.error, showOrders, businessMode]);
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          {!businessMode && (
            <TabTrigger name="explore" href="/explore" asChild>
              <TabButton>Discover</TabButton>
            </TabTrigger>
          )}
          {!businessMode && (
            <TabTrigger name="calendar" href="/calendar" asChild>
              <TabButton>Calendar</TabButton>
            </TabTrigger>
          )}
          {!businessMode && (
            <TabTrigger name="rewards" href="/rewards" asChild>
              <TabButton>Rewards</TabButton>
            </TabTrigger>
          )}
          {businessMode && (
            <TabTrigger name="businesses" href="/businesses" asChild>
              <TabButton>Manage</TabButton>
            </TabTrigger>
          )}
          {pickupDiscoveryEnabled(process.env.EXPO_PUBLIC_APP_ENV) &&
            (!businessMode || pathname === '/orders') && (
              <TabTrigger name="orders" href="/orders" asChild>
                <TabButton>Orders</TabButton>
              </TabTrigger>
            )}
          {businessMode && (
            <TabTrigger name="staff-scan" href="/staff-scan" asChild>
              <TabButton>Staff Scan</TabButton>
            </TabTrigger>
          )}
          {(showOrders || pathname === '/pickup-orders') && (
            <TabTrigger name="pickup-orders" href="/pickup-orders" asChild>
              <TabButton>Orders</TabButton>
            </TabTrigger>
          )}
          <TabTrigger name="account" href="/account" asChild>
            <TabButton>Account</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={({ pressed }) => [styles.tabTarget, pressed && styles.pressed]}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.tabButtonView}
      >
        <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const website = publicShareBaseUrl();
  const { setHeight } = useTabOverlay();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  const wide = hydrated && width > 720;
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <View
      {...props}
      onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
      style={[styles.tabListContainer, { paddingBottom: Math.max(8, insets.bottom) }]}
    >
      <ThemedView type="backgroundElement" style={styles.innerContainer}>
        {wide && (
          <ThemedText type="smallBold" style={styles.brandText}>
            SDS Local
          </ThemedText>
        )}

        {props.children}

        {wide && website && (
          <ExternalLink href={website as `https://${string}`} asChild>
            <Pressable style={styles.externalPressable}>
              <ThemedText type="link">Website</ThemedText>
              <SymbolView
                tintColor={colors.text}
                name={{ ios: 'arrow.up.right.square', web: 'link' }}
                size={12}
              />
            </Pressable>
          </ExternalLink>
        )}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
  },
  brandText: {
    marginRight: 'auto',
  },
  pressed: {
    opacity: 0.7,
  },
  tabTarget: { flex: 1, minWidth: 44 },
  tabButtonView: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.one,
    borderRadius: Spacing.three,
  },
  externalPressable: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.one,
    marginLeft: Spacing.three,
  },
});
