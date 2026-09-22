import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing } from '@/constants/theme';
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
  const handled = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function complete(value?: string | null) {
      if (!active || handled.current) return;
      const callback = parseCallbackUrl(value ?? (await Linking.getInitialURL()));

      if (callback.error) {
        handled.current = true;
        setError(callback.error);
        return;
      }

      if (!callback.code && (!callback.accessToken || !callback.refreshToken)) {
        const { data } = await supabase.auth.getSession();
        if (active && data.session) router.replace('/account');
        else if (active) {
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
        <View style={styles.content}>
          {error ? (
            <>
              <ThemedText type="title">Link could not be completed</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.copy}>
                {error}
              </ThemedText>
              <Pressable onPress={() => router.replace('/account')} style={styles.button}>
                <ThemedText style={styles.buttonText} type="smallBold">
                  Back to sign in
                </ThemedText>
              </Pressable>
            </>
          ) : (
            <>
              <ActivityIndicator color={Brand.primary} size="large" />
              <ThemedText style={styles.copy} themeColor="textSecondary">
                Finishing your sign-in…
              </ThemedText>
            </>
          )}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.five,
  },
  copy: { marginTop: Spacing.three, textAlign: 'center' },
  button: {
    marginTop: Spacing.five,
    borderRadius: 999,
    backgroundColor: Brand.primary,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
  },
  buttonText: { color: '#fff' },
});
