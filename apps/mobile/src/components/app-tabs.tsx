import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { router, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { useAppMode } from '@/providers/app-mode-provider';
import { useAuth } from '@/providers/auth-provider';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const { session, loading } = useAuth();
  const { mode, hasBusinessAccess, loading: modeLoading } = useAppMode();
  const pathname = usePathname();

  useEffect(() => {
    if (loading || modeLoading) return;
    if (!session && pathname !== '/account') {
      router.replace('/account');
      return;
    }
    if (
      session &&
      mode === 'customer' &&
      (pathname === '/' || pathname === '/businesses' || pathname === '/staff-scan')
    ) {
      router.replace('/explore');
    }
    if (
      session &&
      mode === 'business' &&
      (pathname === '/' || pathname === '/explore' || pathname === '/rewards')
    ) {
      router.replace('/businesses');
    }
  }, [loading, mode, modeLoading, pathname, session]);

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}
    >
      {session && mode === 'customer' && (
        <NativeTabs.Trigger name="explore">
          <NativeTabs.Trigger.Label>Discover</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={require('@/assets/images/tabIcons/home.png')}
            renderingMode="template"
          />
        </NativeTabs.Trigger>
      )}

      {session && mode === 'customer' && (
        <NativeTabs.Trigger name="rewards">
          <NativeTabs.Trigger.Label>Rewards</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={require('@/assets/images/tabIcons/explore.png')}
            renderingMode="template"
          />
        </NativeTabs.Trigger>
      )}

      {session && mode === 'business' && hasBusinessAccess && (
        <NativeTabs.Trigger name="businesses">
          <NativeTabs.Trigger.Label>Manage</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={require('@/assets/images/tabIcons/home.png')}
            renderingMode="template"
          />
        </NativeTabs.Trigger>
      )}

      {session && mode === 'business' && hasBusinessAccess && (
        <NativeTabs.Trigger name="staff-scan">
          <NativeTabs.Trigger.Label>Staff Scan</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={require('@/assets/images/tabIcons/explore.png')}
            renderingMode="template"
          />
        </NativeTabs.Trigger>
      )}

      <NativeTabs.Trigger name="notification" hidden />
      <NativeTabs.Trigger name="index" hidden />
      <NativeTabs.Trigger name="business" hidden />
      <NativeTabs.Trigger name="business-new" hidden />

      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
