import { useEffect } from 'react';
import { router, Stack, usePathname } from 'expo-router';

import { guestCanOpenPath } from '@/lib/navigation-policy';
import { useAppMode } from '@/providers/app-mode-provider';
import { useAuth } from '@/providers/auth-provider';

/** Tab destinations stay in NativeTabs; detail and link destinations use this stack. */
export function RootNavigator() {
  const pathname = usePathname();
  const { session, loading } = useAuth();
  const { mode, loading: modeLoading } = useAppMode();

  useEffect(() => {
    if (loading || modeLoading) return;
    if (!session && !guestCanOpenPath(pathname)) {
      router.replace('/explore');
      return;
    }

    const isBusinessRoute =
      pathname === '/businesses' ||
      pathname === '/business-appointments' ||
      pathname === '/business-requests' ||
      pathname === '/staff-scan' ||
      pathname === '/business' ||
      pathname === '/pickup-orders' ||
      pathname === '/pickup-order' ||
      pathname === '/business-reviews' ||
      pathname === '/service-requests' ||
      pathname === '/request-form' ||
      pathname === '/event-attendees';
    const isCustomerRoute =
      pathname === '/' ||
      pathname === '/explore' ||
      pathname === '/calendar' ||
      pathname === '/rewards' ||
      pathname === '/service-request';

    if (session && mode === 'customer' && isBusinessRoute) router.replace('/explore');
    if (session && mode === 'business' && isCustomerRoute) router.replace('/businesses');
  }, [loading, mode, modeLoading, pathname, session]);

  return (
    <Stack initialRouteName="(tabs)" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="index" options={{ animation: 'none' }} />
      <Stack.Screen name="notification" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="business" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="business-new" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="listing-plans" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="staff-invite" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="auth/callback" options={{ animation: 'none' }} />
      <Stack.Screen name="b/[slug]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen
        name="pickup-order"
        options={{ animation: 'slide_from_right', gestureEnabled: true }}
      />
      <Stack.Screen
        name="order"
        options={{
          animation: 'slide_from_right',
          gestureEnabled: true,
          fullScreenGestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="book-appointment"
        options={{
          animation: 'slide_from_right',
          gestureEnabled: true,
          fullScreenGestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="appointment"
        options={{
          animation: 'slide_from_right',
          gestureEnabled: true,
          fullScreenGestureEnabled: false,
        }}
      />
      <Stack.Screen name="service-request" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="request-form" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="service-requests" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="business-account" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="event-attendees" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="business-reviews" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="my-service-requests" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="my-event-reviews" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
