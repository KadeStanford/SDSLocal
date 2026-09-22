import { Redirect } from 'expo-router';
import { ActivityIndicator } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { rootDestination } from '@/lib/navigation-policy';
import { useAppMode } from '@/providers/app-mode-provider';
import { useAuth } from '@/providers/auth-provider';

export default function HomeScreen() {
  const { session, loading: authLoading } = useAuth();
  const { mode, loading: modeLoading } = useAppMode();
  if (authLoading || modeLoading) {
    return (
      <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </ThemedView>
    );
  }
  return <Redirect href={rootDestination(Boolean(session), mode)} />;
}
