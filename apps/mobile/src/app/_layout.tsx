import { useColorScheme } from '@/hooks/use-color-scheme';
import { TabOverlayProvider } from '@/hooks/use-screen-bottom-padding';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import '@/lib/sqlite-storage';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { RootNavigator } from '@/components/root-navigator';
import { AuthProvider } from '@/providers/auth-provider';
import { AppModeProvider } from '@/providers/app-mode-provider';
import { NotificationProvider } from '@/providers/notification-provider';
import { NearbyAlertsProvider } from '@/providers/nearby-alerts-provider';
import { ListingBillingProvider } from '@/providers/listing-billing-provider';
import { PickupWorkspaceProvider } from '@/providers/pickup-workspace-provider';

SplashScreen.preventAutoHideAsync();
export const unstable_settings = { initialRouteName: '(tabs)' };

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <ListingBillingProvider>
            <AppModeProvider>
              <NotificationProvider>
                <NearbyAlertsProvider>
                  <AnimatedSplashOverlay />
                  <TabOverlayProvider>
                    <PickupWorkspaceProvider>
                      <RootNavigator />
                    </PickupWorkspaceProvider>
                  </TabOverlayProvider>
                </NearbyAlertsProvider>
              </NotificationProvider>
            </AppModeProvider>
          </ListingBillingProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
