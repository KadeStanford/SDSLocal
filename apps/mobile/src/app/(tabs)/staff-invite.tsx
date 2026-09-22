import { useColorScheme } from '@/hooks/use-color-scheme';
import { useScreenBottomPadding } from '@/hooks/use-screen-bottom-padding';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SwipeBackView } from '@/components/swipe-back-view';
import { Brand, Colors, Spacing, Radius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { userMessageFromError } from '@/lib/user-error';
import { useAppMode } from '@/providers/app-mode-provider';
import { useAuth } from '@/providers/auth-provider';

interface AcceptedInvite {
  readonly business_id: string;
  readonly business_name: string;
  readonly role: 'staff';
}

export default function StaffInviteScreen() {
  const bottomPadding = useScreenBottomPadding();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === 'string' ? params.token : '';
  const { session, loading: authLoading } = useAuth();
  const { refreshBusinessAccess, setMode } = useAppMode();
  const colors = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState<AcceptedInvite | null>(null);
  const [error, setError] = useState<string | null>(null);

  const acceptInvite = useCallback(async () => {
    if (!session || !token || loading || accepted) return;
    setLoading(true);
    setError(null);
    const { data, error: acceptError } = await supabase.rpc('accept_business_staff_invite', {
      p_token: token,
    });
    setLoading(false);
    if (acceptError) {
      setError(userMessageFromError(acceptError, 'This invite could not be accepted.'));
      return;
    }
    const result = (Array.isArray(data) ? data[0] : data) as AcceptedInvite | null;
    if (!result?.business_id) {
      setError('This invite did not include a business. Ask the owner for a new link.');
      return;
    }
    setAccepted(result);
    await refreshBusinessAccess();
  }, [accepted, loading, refreshBusinessAccess, session, token]);

  useEffect(() => {
    if (!session || !token) return;
    const timeout = setTimeout(() => void acceptInvite(), 0);
    return () => clearTimeout(timeout);
  }, [acceptInvite, session, token]);

  function openWorkspace() {
    if (!accepted) return;
    setMode('business');
    router.replace({
      pathname: '/business',
      params: { id: accepted.business_id, section: 'preview' },
    } as Href);
  }

  function openAccount() {
    router.push({ pathname: '/account', params: { staffInvite: token } });
  }

  return (
    <SwipeBackView onSwipeBack={() => router.replace('/account')}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.container} edges={['top']}>
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
          >
            <View style={styles.eyebrowRow}>
              <View style={styles.eyebrowDot} />
              <ThemedText type="smallBold" style={{ color: Brand.primary }}>
                STAFF INVITE
              </ThemedText>
            </View>
            <ThemedText type="title">You’re invited</ThemedText>
            <ThemedText themeColor="textSecondary">
              Join a business on SDS Local. You can use an existing account or create one now—no app
              setup is required before you accept.
            </ThemedText>

            {!token ? (
              <InviteMessage
                colors={colors}
                message="This invite link is incomplete."
                kind="error"
              />
            ) : !session ? (
              <View style={styles.card}>
                <ThemedText type="subtitle">Continue to accept</ThemedText>
                <ThemedText themeColor="textSecondary">
                  Sign in if you already use SDS Local, or choose Create account to finish
                  onboarding with this invite attached.
                </ThemedText>
                <Pressable style={styles.primaryButton} onPress={openAccount}>
                  <ThemedText style={styles.primaryButtonText} type="smallBold">
                    Sign in or create account
                  </ThemedText>
                </Pressable>
              </View>
            ) : authLoading || loading ? (
              <View style={styles.card}>
                <ActivityIndicator color={Brand.primary} />
                <ThemedText themeColor="textSecondary">Activating your staff access…</ThemedText>
              </View>
            ) : accepted ? (
              <View style={styles.card}>
                <ThemedText type="subtitle">You’re all set</ThemedText>
                <ThemedText themeColor="textSecondary">
                  You now have Staff Scan access for {accepted.business_name}.
                </ThemedText>
                <Pressable style={styles.primaryButton} onPress={openWorkspace}>
                  <ThemedText style={styles.primaryButtonText} type="smallBold">
                    Open business workspace
                  </ThemedText>
                </Pressable>
              </View>
            ) : (
              <View style={styles.card}>
                <InviteMessage
                  colors={colors}
                  message={error ?? 'This invite could not be accepted.'}
                  kind="error"
                />
                <Pressable style={styles.secondaryButton} onPress={openAccount}>
                  <ThemedText type="smallBold">Use a different account</ThemedText>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    </SwipeBackView>
  );
}

function InviteMessage({
  colors,
  kind,
  message,
}: {
  readonly colors: {
    readonly errorSurface: string;
    readonly errorText: string;
    readonly backgroundElement: string;
    readonly text: string;
  };
  readonly kind: 'error' | 'info';
  readonly message: string;
}) {
  return (
    <View
      style={[
        styles.notice,
        { backgroundColor: kind === 'error' ? colors.errorSurface : colors.backgroundElement },
      ]}
    >
      <ThemedText
        style={{ color: kind === 'error' ? colors.errorText : colors.text }}
        type="smallBold"
      >
        {message}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    padding: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  eyebrowDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Brand.primary },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(138,147,142,0.65)',
    backgroundColor: 'rgba(120,140,128,0.06)',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  notice: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(200,106,106,0.55)',
    padding: Spacing.three,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.primary,
    paddingHorizontal: Spacing.three,
  },
  primaryButtonText: { color: Brand.onPrimary },
  secondaryButton: {
    minHeight: 50,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Brand.border,
    paddingHorizontal: Spacing.three,
  },
});
