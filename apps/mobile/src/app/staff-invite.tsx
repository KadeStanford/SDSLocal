import { CustomerBrand } from '@/components/customer-brand';
import { FlowIdentity } from '@/components/flow-layout';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '@/components/app-button';
import { BackPill } from '@/components/back-pill';
import { SwipeBackView } from '@/components/swipe-back-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useScreenBottomPadding } from '@/hooks/use-screen-bottom-padding';
import { useTheme } from '@/hooks/use-theme';
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
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === 'string' ? params.token : '';
  const { session, loading: authLoading } = useAuth();
  return (
    <StaffInviteContent
      key={`${session?.user.id ?? 'guest'}:${token}`}
      token={token}
      userId={session?.user.id ?? null}
      authLoading={authLoading}
    />
  );
}
function StaffInviteContent({
  token,
  userId,
  authLoading,
}: {
  token: string;
  userId: string | null;
  authLoading: boolean;
}) {
  const bottomPadding = useScreenBottomPadding(false);
  const colors = useTheme();
  const { refreshBusinessAccess, setMode } = useAppMode();
  const [loading, setLoading] = useState(Boolean(userId && token));
  const [accepted, setAccepted] = useState<AcceptedInvite | null>(null);
  const [accessReady, setAccessReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const acceptedRef = useRef<AcceptedInvite | null>(null);
  const busy = useRef(false);
  const started = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const acceptInvite = useCallback(async () => {
    if (!userId || !token || busy.current) return;
    busy.current = true;
    setLoading(true);
    setError(null);
    try {
      if (!acceptedRef.current) {
        const { data, error: acceptError } = await supabase.rpc('accept_business_staff_invite', {
          p_token: token,
        });
        if (!mounted.current) return;
        if (acceptError) throw acceptError;
        const result = (Array.isArray(data) ? data[0] : data) as AcceptedInvite | null;
        if (
          !result ||
          typeof result.business_id !== 'string' ||
          !result.business_id ||
          typeof result.business_name !== 'string' ||
          result.role !== 'staff'
        ) {
          throw new Error('This invite did not include a business. Ask the owner for a new link.');
        }
        acceptedRef.current = result;
        setAccepted(result);
      }
      const hasAccess = await refreshBusinessAccess();
      if (!hasAccess) throw new Error('Business access is not available yet.');
      if (mounted.current) setAccessReady(true);
    } catch (cause) {
      if (mounted.current)
        setError(
          acceptedRef.current
            ? 'Your invite was accepted, but business access could not refresh. Try refreshing access.'
            : userMessageFromError(cause, 'This invite could not be accepted. Please try again.'),
        );
    } finally {
      busy.current = false;
      if (mounted.current) setLoading(false);
    }
  }, [refreshBusinessAccess, token, userId]);
  useEffect(() => {
    if (authLoading || !userId || !token || started.current) return;
    const timeout = setTimeout(() => {
      started.current = true;
      void acceptInvite();
    }, 0);
    return () => clearTimeout(timeout);
  }, [acceptInvite, authLoading, token, userId]);
  function openWorkspace() {
    if (!accepted || !accessReady || busy.current) return;
    setMode('business');
    router.replace({
      pathname: '/business',
      params: { id: accepted.business_id, section: 'preview' },
    } as Href);
  }
  function openAccount() {
    if (busy.current) return;
    router.push({ pathname: '/account', params: { staffInvite: token } });
  }
  const pending = authLoading || loading;
  const back = () => {
    if (!busy.current) router.replace('/account');
  };
  return (
    <SwipeBackView onSwipeBack={back} enabled={!pending}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.container} edges={['top']}>
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
          >
            <BackPill label="Back to account" onPress={back} disabled={pending} />
            <CustomerBrand />
            <View style={styles.heading}>
              <ThemedText type="smallBold" style={{ color: colors.textSecondary }}>
                STAFF INVITATION
              </ThemedText>
              <ThemedText type="title" accessibilityRole="header">
                Join your team
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                Accept your invitation to access the business workspace and Staff Scan.
              </ThemedText>
            </View>
            <View
              style={[
                styles.card,
                { backgroundColor: colors.backgroundElement, borderColor: colors.border },
              ]}
            >
              {!token ? (
                <ThemedText style={{ color: colors.errorText }}>
                  This invite link is incomplete. Ask the owner for a new link.
                </ThemedText>
              ) : pending ? (
                <View accessibilityLiveRegion="polite" style={styles.stack}>
                  <ActivityIndicator color={colors.text} />
                  <ThemedText themeColor="textSecondary">
                    {authLoading ? 'Checking your account…' : 'Activating your staff access…'}
                  </ThemedText>
                </View>
              ) : !userId ? (
                <>
                  <ThemedText type="subtitle">Sign in to accept</ThemedText>
                  <ThemedText themeColor="textSecondary">
                    Use your Parish Pass account or create one. Your invitation will stay attached.
                  </ThemedText>
                  <AppButton label="Sign in or create account" onPress={openAccount} />
                </>
              ) : accepted ? (
                <>
                  <ThemedText type="subtitle">Invitation accepted</ThemedText>
                  <FlowIdentity
                    name={accepted.business_name}
                    detail="Your team workspace is ready"
                  />
                  <ThemedText themeColor="textSecondary">Your role: Staff</ThemedText>
                  {accessReady && (
                    <AppButton label="Open business workspace" onPress={openWorkspace} />
                  )}
                </>
              ) : (
                <ThemedText type="subtitle">Invitation needs attention</ThemedText>
              )}
              {!!error && !pending && (
                <>
                  <View
                    accessibilityRole="alert"
                    style={[styles.notice, { backgroundColor: colors.errorSurface }]}
                  >
                    <ThemedText style={{ color: colors.errorText }}>{error}</ThemedText>
                  </View>
                  <AppButton
                    label={accepted ? 'Refresh business access' : 'Retry invitation'}
                    onPress={() => void acceptInvite()}
                  />
                  {!accepted && (
                    <AppButton
                      label="Use a different account"
                      variant="secondary"
                      onPress={openAccount}
                    />
                  )}
                </>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    </SwipeBackView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    padding: Spacing.four,
    gap: Spacing.five,
  },
  heading: { gap: Spacing.two },
  stack: { gap: Spacing.three, alignItems: 'center' },
  card: { borderWidth: 0, borderRadius: 22, padding: Spacing.four, gap: Spacing.three },
  notice: { borderRadius: Radius.small, padding: Spacing.three },
});
