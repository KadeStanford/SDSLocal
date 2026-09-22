import { Stack } from 'expo-router';

/** Ordering is a pushable screen above NativeTabs, never a hidden tab. */
export function RootNavigator() {
  return (
    <Stack initialRouteName="(tabs)" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
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
    </Stack>
  );
}
