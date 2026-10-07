import { BusinessAccessRecovery } from './business-access-recovery';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BusinessColors } from './business-theme';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { router, usePathname } from 'expo-router';
import { useEffect } from 'react';

import { Brand, Colors } from '@/constants/theme';
import { useAppMode } from '@/providers/app-mode-provider';
import { useAuth } from '@/providers/auth-provider';
import { usePickupWorkspace } from '@/providers/pickup-workspace-provider';
import { ordersTabVisible } from '@/lib/pickup-workspace';
import { pickupDiscoveryEnabled } from '@/lib/pickup-discovery';
import { useServiceOperations } from '@/providers/service-operations-provider';
import { useBusinessActivity } from '@/hooks/use-business-activity';
import { nativeTabIcons } from './native-tab-icons';

export default function AppTabs() {
  const scheme = useColorScheme();
  const { session } = useAuth();
  const { mode, hasBusinessAccess, accessError, refreshBusinessAccess } = useAppMode();
  const colors = (session && mode === 'business' ? BusinessColors : Colors)[
    scheme === 'unspecified' ? 'light' : scheme
  ];
  const pathname = usePathname();
  const pickup = usePickupWorkspace();
  const services = useServiceOperations();
  const activity = useBusinessActivity();
  const serviceTabs = Boolean(
    session && mode === 'business' && hasBusinessAccess && services.businesses.length,
  );
  const requestCount = pickup.businesses.reduce((n, b) => n + (b.counts?.requests ?? 0), 0);
  const showOrders = ordersTabVisible(Boolean(session), mode, pickup.businesses);
  useEffect(() => {
    if (
      ['/business-appointments', '/business-requests'].includes(pathname) &&
      !services.loading &&
      !services.error &&
      !serviceTabs
    )
      router.replace(session && mode === 'business' ? '/businesses' : '/explore');
  }, [pathname, services.loading, services.error, serviceTabs, session, mode]);
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

  if (accessError) return <BusinessAccessRecovery onRetry={refreshBusinessAccess} />;
  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}
    >
      {(!session || mode === 'customer') && (
        <NativeTabs.Trigger name="explore">
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon src={nativeTabIcons['house']} renderingMode="template" selectedColor={Brand.primary} />
        </NativeTabs.Trigger>
      )}

      {(!session || mode === 'customer') && (
        <NativeTabs.Trigger name="calendar">
          <NativeTabs.Trigger.Label>Events</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon src={nativeTabIcons['calendar-days']} renderingMode="template" selectedColor={Brand.primary} />
        </NativeTabs.Trigger>
      )}

      {session && mode === 'customer' && (
        <NativeTabs.Trigger name="rewards">
          <NativeTabs.Trigger.Label>Rewards</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon src={nativeTabIcons['gift']} renderingMode="template" selectedColor={Brand.primary} />
        </NativeTabs.Trigger>
      )}

      {session && mode === 'business' && hasBusinessAccess && (
        <NativeTabs.Trigger name="businesses">
          <NativeTabs.Trigger.Label>Manage</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon src={nativeTabIcons['store']} renderingMode="template" selectedColor={Brand.primary} />
        </NativeTabs.Trigger>
      )}

      {pickupDiscoveryEnabled(process.env.EXPO_PUBLIC_APP_ENV) &&
        (!session || mode === 'customer' || pathname === '/orders') && (
          <NativeTabs.Trigger name="orders">
            <NativeTabs.Trigger.Label>Orders</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon src={nativeTabIcons['shopping-bag']} renderingMode="template" selectedColor={Brand.primary} />
          </NativeTabs.Trigger>
        )}

      {session && mode === 'business' && hasBusinessAccess && (
        <NativeTabs.Trigger name="staff-scan">
          <NativeTabs.Trigger.Label>Staff Scan</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon src={nativeTabIcons['scan-line']} renderingMode="template" selectedColor={Brand.primary} />
        </NativeTabs.Trigger>
      )}
      {(showOrders || pathname === '/pickup-orders') && (
        <NativeTabs.Trigger name="pickup-orders">
          <NativeTabs.Trigger.Label>Orders</NativeTabs.Trigger.Label>
          {(requestCount > 0 || activity.orders) && <NativeTabs.Trigger.Badge />}
          <NativeTabs.Trigger.Icon src={nativeTabIcons['shopping-bag']} renderingMode="template" selectedColor={Brand.primary} />
        </NativeTabs.Trigger>
      )}

      {serviceTabs && (
        <NativeTabs.Trigger name="business-appointments">
          <NativeTabs.Trigger.Label>Appointments</NativeTabs.Trigger.Label>
          {activity.appointments && <NativeTabs.Trigger.Badge />}
          <NativeTabs.Trigger.Icon src={nativeTabIcons['calendar-days']} renderingMode="template" selectedColor={Brand.primary} />
        </NativeTabs.Trigger>
      )}
      {serviceTabs && (
        <NativeTabs.Trigger name="business-requests">
          <NativeTabs.Trigger.Label>Requests</NativeTabs.Trigger.Label>
          {activity.requests && <NativeTabs.Trigger.Badge />}
          <NativeTabs.Trigger.Icon src={nativeTabIcons['file-text']} renderingMode="template" selectedColor={Brand.primary} />
        </NativeTabs.Trigger>
      )}
      {!serviceTabs && (
        <NativeTabs.Trigger name="account">
          <NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon src={nativeTabIcons['circle-user-round']} renderingMode="template" selectedColor={Brand.primary} />
        </NativeTabs.Trigger>
      )}
    </NativeTabs>
  );
}
