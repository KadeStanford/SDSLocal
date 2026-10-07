import { Platform } from 'react-native';
import { Fonts } from '@/constants/theme';
import { parseStaffInvitePreview, type StaffInvitePreviewV1 } from '@sds/business-logic';
import { FocusedHeader } from '@/components/focused-page-ui';
import { AppIcon } from '@/components/app-icon';
import { Image } from 'expo-image';
import { FlowIdentity } from '@/components/flow-layout';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '@/components/app-button';
import { SwipeBackView } from '@/components/swipe-back-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useScreenBottomPadding } from '@/hooks/use-screen-bottom-padding';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { userMessageFromError } from '@/lib/user-error';
import { storagePublicUrl } from '@/lib/storage-url';
import { useAppMode } from '@/providers/app-mode-provider';
import { useAuth } from '@/providers/auth-provider';

const focusedFont = Platform.OS === 'web' ? 'system-ui' : Fonts.sans;

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
  const [preview, setPreview] = useState<StaffInvitePreviewV1 | null>(null);
  const [logoFailed, setLogoFailed] = useState(false);
  const acceptedRef = useRef<AcceptedInvite | null>(null);
  const busy = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const loadPreview = useCallback(async () => {
    if (!userId || !token || busy.current) return;
    busy.current = true;
    setLoading(true);
    setError(null);
    setPreview(null);
    try {
      const { data, error: readError } = await supabase.rpc('get_business_staff_invite_preview', {
        p_token: token,
      });
      if (!mounted.current) return;
      if (readError) throw readError;
      const checked = parseStaffInvitePreview(data);
      if (!checked) throw new Error('Invitation preview unavailable.');
      setPreview(checked);
      setLogoFailed(false);
    } catch {
      if (mounted.current)
        setError(
          'We could not verify this invitation for your account. It may have expired or been withdrawn. Check your account or ask the owner for a fresh link.',
        );
    } finally {
      busy.current = false;
      if (mounted.current) setLoading(false);
    }
  }, [token, userId]);
  const acceptInvite = useCallback(async () => {
    if (!userId || !token || busy.current) return;
    if (!acceptedRef.current && !parseStaffInvitePreview(preview)) {
      setPreview(null);
      setError(
        'This invitation is no longer available. Check it again or ask the owner for a fresh link.',
      );
      return;
    }
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
  }, [preview, refreshBusinessAccess, token, userId]);
  useEffect(() => {
    if (authLoading || !userId || !token) return;
    const timeout = setTimeout(() => {
      void loadPreview();
    }, 0);
    return () => clearTimeout(timeout);
  }, [loadPreview, authLoading, token, userId]);
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
            <FocusedHeader
              title={accepted ? 'Welcome to your team' : 'Your team invitation'}
              subtitle="Review the business and your role before you join."
              onBack={back}
              backLabel="Back to account"
              disabled={pending}
            />
            <View
              style={[
                styles.card,
                { backgroundColor: colors.backgroundElement, borderColor: colors.border },
              ]}
            >
              {!token ? (
                <ThemedText style={{ fontFamily: focusedFont, color: colors.errorText }}>
                  This invite link is incomplete. Ask the owner for a new link.
                </ThemedText>
              ) : pending ? (
                <View accessibilityLiveRegion="polite" style={styles.stack}>
                  <ActivityIndicator color={colors.text} />
                  <ThemedText themeColor="textSecondary">
                    {authLoading
                      ? 'Checking your account.'
                      : accepted
                        ? 'Refreshing staff access.'
                        : 'Checking your invitation.'}
                  </ThemedText>
                </View>
              ) : !userId ? (
                <>
                  <ThemedText type="subtitle" style={{ fontFamily: focusedFont }}>
                    Sign in to review your invitation
                  </ThemedText>
                  <ThemedText themeColor="textSecondary">
                    Use the account invited by the business. Then you can review its identity and
                    choose whether to join.
                  </ThemedText>
                  <AppButton label="Sign in or create account" onPress={openAccount} />
                </>
              ) : accepted ? (
                <>
                  <ThemedText type="subtitle" style={{ fontFamily: focusedFont }}>
                    Invitation accepted
                  </ThemedText>
                  <FlowIdentity
                    name={accepted.business_name}
                    detail="Your team workspace is ready"
                  />
                  <ThemedText themeColor="textSecondary">Your role: Staff</ThemedText>
                  {accessReady && (
                    <AppButton label="Open business workspace" onPress={openWorkspace} />
                  )}
                </>
              ) : preview ? (
                <>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    INVITED BUSINESS
                  </ThemedText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    {preview.logo_path && !logoFailed ? (
                      <Image
                        source={{ uri: storagePublicUrl(preview.logo_path) }}
                        accessibilityLabel={`${preview.business_name} logo`}
                        style={{ width: 64, height: 64, borderRadius: 16 }}
                        contentFit="contain"
                        onError={() => setLogoFailed(true)}
                      />
                    ) : (
                      <View
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: 16,
                          backgroundColor: colors.backgroundSelected,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <ThemedText type="subtitle" style={{ fontFamily: focusedFont }}>
                          {preview.business_name
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((word) => word[0])
                            .join('')
                            .toUpperCase()}
                        </ThemedText>
                      </View>
                    )}
                    <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                      <ThemedText
                        style={{
                          fontFamily: focusedFont,
                          fontSize: 22,
                          lineHeight: 28,
                          fontWeight: '700',
                        }}
                      >
                        {preview.business_name}
                      </ThemedText>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <AppIcon name="map-pin" size={16} />
                        <ThemedText type="small" themeColor="textSecondary" style={{ flex: 1 }}>
                          {preview.location_label || 'Public location not provided'}
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                  <View
                    style={{
                      backgroundColor: colors.backgroundSelected,
                      borderRadius: 14,
                      padding: 16,
                      gap: 6,
                    }}
                  >
                    <ThemedText type="small" themeColor="textSecondary">
                      YOUR INVITED ROLE
                    </ThemedText>
                    <ThemedText type="subtitle" style={{ fontFamily: focusedFont }}>
                      Staff
                    </ThemedText>
                    <ThemedText type="small">
                      Access the business workspace and Staff Scan with your own account.
                    </ThemedText>
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    Joining happens only when you accept below.
                  </ThemedText>
                  <AppButton label="Accept staff invitation" onPress={() => void acceptInvite()} />
                </>
              ) : (
                <ThemedText type="subtitle" style={{ fontFamily: focusedFont }}>
                  Invitation unavailable
                </ThemedText>
              )}
              {!!error && !pending && (
                <>
                  <View
                    accessibilityRole="alert"
                    style={[styles.notice, { backgroundColor: colors.errorSurface }]}
                  >
                    <ThemedText style={{ fontFamily: focusedFont, color: colors.errorText }}>
                      {error}
                    </ThemedText>
                  </View>
                  <AppButton
                    label={accepted ? 'Refresh business access' : 'Check invitation again'}
                    onPress={() => void (accepted ? acceptInvite() : loadPreview())}
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
  card: { borderWidth: 1, borderRadius: 22, padding: Spacing.four, gap: Spacing.three },
  notice: { borderRadius: Radius.small, padding: Spacing.three },
});
