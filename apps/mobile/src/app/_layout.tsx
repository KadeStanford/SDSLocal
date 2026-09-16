import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AuthProvider } from '@/providers/auth-provider';
import { AppModeProvider } from '@/providers/app-mode-provider';
import { NotificationProvider } from '@/providers/notification-provider';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <AppModeProvider>
          <NotificationProvider>
            <AnimatedSplashOverlay />
            <AppTabs />
          </NotificationProvider>
        </AppModeProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
