import { useColorScheme } from '@/hooks/use-color-scheme';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { router, usePathname } from 'expo-router';
import { useEffect } from 'react';

import { Brand, Colors } from '@/constants/theme';
import { guestCanOpenPath } from '@/lib/navigation-policy';
import { useAppMode } from '@/providers/app-mode-provider';
import { useAuth } from '@/providers/auth-provider';
import { usePickupWorkspace } from '@/providers/pickup-workspace-provider';
import { ordersTabVisible } from '@/lib/pickup-workspace';
import { pickupDiscoveryEnabled } from '@/lib/pickup-discovery';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const { session, loading } = useAuth();
  const { mode, hasBusinessAccess, loading: modeLoading } = useAppMode();
  const pathname = usePathname();
  const pickup = usePickupWorkspace();
  const showOrders = ordersTabVisible(Boolean(session), mode, pickup.businesses);
  useEffect(() => {
    if (pathname === '/pickup-orders' && !pickup.loading && !pickup.error && !showOrders) {
      router.replace(
        session && mode === 'business'
          ? {
              pathname: '/businesses',
              params: {
                pickupNotice:
                  'Pickup ordering is no longer enabled for your businesses, or your staff access changed.',
              },
            }
          : '/explore',
      );
    }
  }, [pathname, pickup.loading, pickup.error, showOrders, session, mode]);

  useEffect(() => {
    if (loading || modeLoading) return;
    if (!session && !guestCanOpenPath(pathname)) {
      router.replace('/explore');
      return;
    }
    const isBusinessRoute =
      pathname === '/businesses' ||
      pathname === '/staff-scan' ||
      pathname === '/business' ||
      pathname === '/pickup-orders' ||
      pathname === '/pickup-order';
    const isCustomerRoute =
      pathname === '/' ||
      pathname === '/explore' ||
      pathname === '/calendar' ||
      pathname === '/rewards';
    if (session && mode === 'customer' && isBusinessRoute) {
      router.replace('/explore');
    }
    if (session && mode === 'business' && isCustomerRoute) {
      router.replace('/businesses');
    }
  }, [loading, mode, modeLoading, pathname, session]);

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}
    >
      {(!session || mode === 'customer') && (
        <NativeTabs.Trigger name="explore">
          <NativeTabs.Trigger.Label>Discover</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            md={{ default: 'search', selected: 'search' }}
            selectedColor={Brand.primary}
            sf={{ default: 'magnifyingglass', selected: 'magnifyingglass.circle.fill' }}
          />
        </NativeTabs.Trigger>
      )}

      {(!session || mode === 'customer') && (
        <NativeTabs.Trigger name="calendar">
          <NativeTabs.Trigger.Label>Calendar</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            md={{ default: 'event', selected: 'event' }}
            selectedColor={Brand.primary}
            sf={{ default: 'calendar', selected: 'calendar.circle.fill' }}
          />
        </NativeTabs.Trigger>
      )}

      {session && mode === 'customer' && (
        <NativeTabs.Trigger name="rewards">
          <NativeTabs.Trigger.Label>Rewards</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            md={{ default: 'redeem', selected: 'redeem' }}
            selectedColor={Brand.primary}
            sf={{ default: 'gift', selected: 'gift.fill' }}
          />
        </NativeTabs.Trigger>
      )}

      {session && mode === 'business' && hasBusinessAccess && (
        <NativeTabs.Trigger name="businesses">
          <NativeTabs.Trigger.Label>Manage</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            md={{ default: 'storefront', selected: 'storefront' }}
            selectedColor={Brand.primary}
            sf={{ default: 'building.2', selected: 'building.2.fill' }}
          />
        </NativeTabs.Trigger>
      )}

      {pickupDiscoveryEnabled(process.env.EXPO_PUBLIC_APP_ENV) &&
        (!session || mode === 'customer' || pathname === '/orders') && (
          <NativeTabs.Trigger name="orders">
            <NativeTabs.Trigger.Label>Orders</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon
              md={{ default: 'receipt_long', selected: 'receipt_long' }}
              sf={{ default: 'bag', selected: 'bag.fill' }}
              selectedColor={Brand.primary}
            />
          </NativeTabs.Trigger>
        )}

      {session && mode === 'business' && hasBusinessAccess && (
        <NativeTabs.Trigger name="staff-scan">
          <NativeTabs.Trigger.Label>Staff Scan</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            md={{ default: 'qr_code_scanner', selected: 'qr_code_scanner' }}
            selectedColor={Brand.primary}
            sf={{ default: 'qrcode', selected: 'qrcode.viewfinder' }}
          />
        </NativeTabs.Trigger>
      )}
      {(showOrders || pathname === '/pickup-orders') && (
        <NativeTabs.Trigger name="pickup-orders">
          <NativeTabs.Trigger.Label>Orders</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            md={{ default: 'receipt_long', selected: 'receipt_long' }}
            sf={{ default: 'bag', selected: 'bag.fill' }}
            selectedColor={Brand.primary}
          />
        </NativeTabs.Trigger>
      )}

      <NativeTabs.Trigger name="notification" hidden />
      <NativeTabs.Trigger name="index" hidden />
      <NativeTabs.Trigger name="business" hidden />
      <NativeTabs.Trigger name="business-new" hidden />
      <NativeTabs.Trigger name="listing-plans" hidden />
      <NativeTabs.Trigger name="staff-invite" hidden />
      <NativeTabs.Trigger name="auth/callback" hidden />
      <NativeTabs.Trigger name="b/[slug]" hidden />

      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          md={{ default: 'person_outline', selected: 'account_circle' }}
          selectedColor={Brand.primary}
          sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
