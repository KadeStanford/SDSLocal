import { PageHeader } from '@/components/page-header';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useScreenBottomPadding } from '@/hooks/use-screen-bottom-padding';
import { supabase } from '@/lib/supabase';

interface CallbackParams {
  code: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  error: string | null;
}

function parseCallbackUrl(value: string | null): CallbackParams {
  if (!value) return { code: null, accessToken: null, refreshToken: null, error: null };

  try {
    const parsed = new URL(value);
    const params = new URLSearchParams(parsed.search);
    const hash = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash;
    new URLSearchParams(hash).forEach((entry, key) => params.set(key, entry));
    return {
      code: params.get('code'),
      accessToken: params.get('access_token'),
      refreshToken: params.get('refresh_token'),
      error: params.get('error_description') ?? params.get('error'),
    };
  } catch {
    return { code: null, accessToken: null, refreshToken: null, error: null };
  }
}

export default function AuthCallbackScreen() {
  const colors = useTheme();
  const bottomPadding = useScreenBottomPadding(false);
  const handled = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function complete(value?: string | null) {
      if (!active || handled.current) return;
      const callback = parseCallbackUrl(value ?? (await Linking.getInitialURL()));
      // A URL event or screen cleanup may have won while the initial URL was pending.
      if (!active || handled.current) return;

      if (callback.error) {
        handled.current = true;
        setError(callback.error);
        return;
      }

      if (!callback.code && (!callback.accessToken || !callback.refreshToken)) {
        const { data } = await supabase.auth.getSession();
        if (!active || handled.current) return;
        handled.current = true;
        if (data.session) router.replace('/account');
        else {
          handled.current = true;
          setError('This confirmation link is missing its sign-in details. Request a new one.');
        }
        return;
      }

      handled.current = true;
      try {
        if (callback.code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
            callback.code,
          );
          if (exchangeError) throw exchangeError;
        } else {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: callback.accessToken as string,
            refresh_token: callback.refreshToken as string,
          });
          if (sessionError) throw sessionError;
        }
        if (active) router.replace('/account');
      } catch {
        if (active)
          setError('This confirmation link has expired. Request a new one and try again.');
      }
    }

    void complete();
    const subscription = Linking.addEventListener('url', ({ url }) => void complete(url));
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        >
          <PageHeader
            onBack={() => router.replace('/account')}
            backLabel="Return to sign in"
            backDisabled={!error}
          />
          {error ? (
            <>
              <ThemedText type="title" accessibilityRole="header">
                Sign-in needs attention
              </ThemedText>
              <View
                accessibilityRole="alert"
                style={[styles.notice, { backgroundColor: colors.errorSurface }]}
              >
                <ThemedText style={{ color: colors.errorText }}>{error}</ThemedText>
              </View>
            </>
          ) : (
            <View accessibilityLiveRegion="polite" style={styles.progress}>
              <ActivityIndicator color={colors.text} size="large" />
              <ThemedText themeColor="textSecondary">Finishing your sign-in…</ThemedText>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    padding: Spacing.four,
    gap: Spacing.four,
  },
  progress: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  notice: { borderRadius: Radius.small, padding: Spacing.four },
});
