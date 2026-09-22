import { useColorScheme } from '@/hooks/use-color-scheme';
import { useScreenBottomPadding } from '@/hooks/use-screen-bottom-padding';
import { AppButton } from '@/components/app-button';
import { StateNotice } from '@/components/data-state';
import {
  customerProfileSchema,
  emailOtpSchema,
  magicLinkSchema,
  emailSchema,
  passwordSchema,
  passwordRecoverySchema,
  signInSchema,
} from '@sds/validation';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import Svg, { Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BlockedBusinessesPanel } from '@/components/blocked-businesses-panel';
import { AccountDataPanel } from '@/components/account-data-panel';
import { NotificationSettings } from '@/components/notification-settings';
import { AppChrome } from '@/components/app-chrome';
import { SwipeBackView } from '@/components/swipe-back-view';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { getRememberSessionPreference, setRememberSessionPreference } from '@/lib/auth-storage';
import { clearBiometricSignInRefreshToken } from '@/lib/biometric-auth';
import {
  isAppleAuthAvailable,
  linkAppleIdentity,
  linkGoogleIdentity,
  signInWithApple,
  signInWithGoogle,
} from '@/lib/mobile-oauth';
import { haptics } from '@/lib/haptics';
import {
  authIntentDestination,
  consumePendingAuthIntent,
  savePendingAuthIntent,
} from '@/lib/auth-intents';
import { clearBusinessOnboardingDraft } from '@/lib/business-onboarding';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { userMessageFromError } from '@/lib/user-error';
import { useAuth } from '@/providers/auth-provider';
import { useNotifications } from '@/providers/notification-provider';
import { useNearbyAlerts } from '@/providers/nearby-alerts-provider';
import { useAppMode } from '@/providers/app-mode-provider';
import { NewBusinessWorkspace } from '@/app/(tabs)/business-new';

interface ProfileRow {
  display_name: string | null;
  city: string | null;
  region_code: string | null;
  postal_code: string | null;
}

interface AuthNoticeState {
  readonly kind: 'error' | 'info';
  readonly message: string;
}

const isGoogleAuthEnabled = process.env.EXPO_PUBLIC_GOOGLE_AUTH_ENABLED === 'true';

function GoogleMark() {
  return (
    <Svg accessibilityLabel="Google" height={20} viewBox="0 0 24 24" width={20}>
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.1A6.99 6.99 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.42 3.44 1.18 4.94l3.66-2.84z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
        fill="#EA4335"
      />
    </Svg>
  );
}

export default function AccountScreen() {
  const bottomPadding = useScreenBottomPadding();
  const params = useLocalSearchParams<{ staffInvite?: string; startBusiness?: string }>();
  const staffInviteToken = typeof params.staffInvite === 'string' ? params.staffInvite : null;
  const staffInviteRedirected = useRef(false);
  const authReturnHandled = useRef(false);
  const { session, loading } = useAuth();
  const notifications = useNotifications();
  const nearbyAlerts = useNearbyAlerts();
  const { hasBusinessAccess, refreshBusinessAccess, setMode: setAppMode } = useAppMode();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [mode, setMode] = useState<'sign-in' | 'sign-up' | 'email-code' | 'recovery'>('sign-in');
  const [accountSection, setAccountSection] = useState<
    | 'overview'
    | 'profile'
    | 'notifications'
    | 'privacy-safety'
    | 'sign-in-methods'
    | 'account-data'
    | 'business-new'
  >('overview');
  const [busy, setBusy] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [rememberSession, setRememberSession] = useState(getRememberSessionPreference);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [googleLinkedThisSession, setGoogleLinkedThisSession] = useState(false);
  const [appleLinkedThisSession, setAppleLinkedThisSession] = useState(false);
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);
  const [authNotice, setAuthNotice] = useState<AuthNoticeState | null>(null);
  const [authFieldErrors, setAuthFieldErrors] = useState<Record<string, string>>({});
  const [city, setCity] = useState('');
  const [regionCode, setRegionCode] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const displayNameInput = useRef<TextInput>(null);
  const emailInput = useRef<TextInput>(null);
  const passwordInput = useRef<TextInput>(null);
  const recoveryCodeInput = useRef<TextInput>(null);
  const emailCodeInput = useRef<TextInput>(null);
  const passwordConfirmationInput = useRef<TextInput>(null);
  const cityInput = useRef<TextInput>(null);
  const regionInput = useRef<TextInput>(null);
  const postalCodeInput = useRef<TextInput>(null);

  function changeRecoveryCode(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 6);
    setRecoveryCode(digits);
    if (digits.length === 6) passwordInput.current?.focus();
  }

  function changeEmailCode(value: string) {
    setEmailCode(value.replace(/\D/g, '').slice(0, 6));
  }

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let active = true;
    void isAppleAuthAvailable().then((available) => {
      if (active) setAppleAuthAvailable(available);
    });
    return () => {
      active = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      let active = true;
      void supabase
        .from('profiles')
        .select('display_name, city, region_code, postal_code')
        .eq('id', session.user.id)
        .single()
        .then(({ data }) => {
          if (!active) return;
          const profile = data as ProfileRow | null;
          if (!profile) return;
          setDisplayName(profile.display_name ?? '');
          setCity(profile.city ?? '');
          setRegionCode(profile.region_code ?? '');
          setPostalCode(profile.postal_code ?? '');
        });
      return () => {
        active = false;
      };
    }, [session]),
  );

  useEffect(() => {
    if (!session || !staffInviteToken || staffInviteRedirected.current) return;
    staffInviteRedirected.current = true;
    router.replace({
      pathname: '/staff-invite',
      params: { token: staffInviteToken },
    } as unknown as Href);
  }, [session, staffInviteToken]);

  useEffect(() => {
    if (!session || authReturnHandled.current) return;
    let active = true;
    queueMicrotask(() => {
      if (!active || authReturnHandled.current) return;
      const intent = consumePendingAuthIntent();
      if (!intent) {
        if (globalThis.localStorage.getItem('sds-local:post-auth-destination') === 'discover') {
          globalThis.localStorage.removeItem('sds-local:post-auth-destination');
          authReturnHandled.current = true;
          setAppMode('customer');
          router.replace('/explore');
        } else if (params.startBusiness === '1') {
          authReturnHandled.current = true;
          setAccountSection('business-new');
        }
        return;
      }
      globalThis.localStorage.removeItem('sds-local:post-auth-destination');
      authReturnHandled.current = true;
      if (intent.kind === 'create_business') {
        setAccountSection('business-new');
        return;
      }
      setAppMode('customer');
      router.replace(authIntentDestination(intent) as unknown as Href);
    });
    return () => {
      active = false;
    };
  }, [params.startBusiness, session, setAppMode]);

  const googleLinked =
    googleLinkedThisSession ||
    (session?.user.identities?.some((identity) => identity.provider === 'google') ?? false);
  const appleLinked =
    appleLinkedThisSession ||
    (session?.user.identities?.some((identity) => identity.provider === 'apple') ?? false);
  const emailLinked = Boolean(session?.user.email);
  const connectedMethods = [
    emailLinked ? 'Email' : null,
    googleLinked ? 'Google' : null,
    appleLinked ? 'Apple' : null,
  ]
    .filter((method): method is string => Boolean(method))
    .join(', ');
  const canSwipeBack = Boolean(
    (session && accountSection !== 'overview') || (!session && mode !== 'sign-in'),
  );

  async function continueWithGoogle() {
    try {
      void haptics.selection();
      setBusy(true);
      setAuthNotice(null);
      setRememberSessionPreference(rememberSession);
      if (mode === 'sign-up')
        globalThis.localStorage.setItem('sds-local:post-auth-destination', 'discover');
      const completed = await signInWithGoogle();
      if (!completed) {
        globalThis.localStorage.removeItem('sds-local:post-auth-destination');
        setAuthNotice({ kind: 'info', message: 'Google sign-in was canceled.' });
      } else {
        void haptics.success();
      }
    } catch (error) {
      globalThis.localStorage.removeItem('sds-local:post-auth-destination');
      void haptics.error();
      setAuthNotice({
        kind: 'error',
        message: userMessageFromError(
          error,
          'Google sign-in could not be completed. Please use email sign-in for now.',
          'Google',
        ),
      });
    } finally {
      setBusy(false);
    }
  }

  async function continueWithApple() {
    try {
      void haptics.selection();
      setBusy(true);
      setAuthNotice(null);
      setRememberSessionPreference(rememberSession);
      if (mode === 'sign-up')
        globalThis.localStorage.setItem('sds-local:post-auth-destination', 'discover');
      await signInWithApple();
      void haptics.success();
    } catch (error) {
      globalThis.localStorage.removeItem('sds-local:post-auth-destination');
      if (error instanceof Error && 'code' in error && error.code === 'ERR_REQUEST_CANCELED') {
        setAuthNotice({ kind: 'info', message: 'Apple sign-in was canceled.' });
      } else {
        void haptics.error();
        setAuthNotice({
          kind: 'error',
          message: userMessageFromError(
            error,
            'Apple sign-in could not be completed. Please use email sign-in for now.',
            'Apple',
          ),
        });
      }
    } finally {
      setBusy(false);
    }
  }

  async function connectGoogle() {
    try {
      setBusy(true);
      setAuthNotice(null);
      const linked = await linkGoogleIdentity();
      if (linked) {
        setGoogleLinkedThisSession(true);
        setAuthNotice({ kind: 'info', message: 'Your Google account is now connected.' });
        void haptics.success();
      }
    } catch (error) {
      void haptics.error();
      setAuthNotice({
        kind: 'error',
        message: userMessageFromError(
          error,
          'Your Google account could not be connected. Please try again.',
          'Google',
        ),
      });
    } finally {
      setBusy(false);
    }
  }

  async function connectApple() {
    try {
      void haptics.selection();
      setBusy(true);
      setAuthNotice(null);
      const linked = await linkAppleIdentity();
      if (linked) {
        setAppleLinkedThisSession(true);
        setAuthNotice({ kind: 'info', message: 'Your Apple account is now connected.' });
        void haptics.success();
      }
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ERR_REQUEST_CANCELED') {
        setAuthNotice({ kind: 'info', message: 'Apple account linking was canceled.' });
      } else {
        void haptics.error();
        setAuthNotice({
          kind: 'error',
          message: userMessageFromError(
            error,
            'Your Apple account could not be connected. Please try again.',
            'Apple',
          ),
        });
      }
    } finally {
      setBusy(false);
    }
  }

  async function submitAuth() {
    if (busy) return;
    try {
      void haptics.selection();
      setBusy(true);
      setAuthNotice(null);
      setAuthFieldErrors({});
      setRememberSessionPreference(rememberSession);
      if (mode === 'sign-in') {
        const parsed = signInSchema.safeParse({ email, password });
        if (!parsed.success) {
          const issue = parsed.error.issues[0];
          const field = issue?.path[0] === 'password' ? 'password' : 'email';
          setAuthFieldErrors({ [field]: issue?.message ?? 'Check this field and try again.' });
          setTimeout(
            () => (field === 'password' ? passwordInput.current : emailInput.current)?.focus(),
            0,
          );
          return;
        }
        const input = parsed.data;
        const { error } = await supabase.auth.signInWithPassword(input);
        if (error) throw error;
        void haptics.success();
      } else {
        const trimmedEmail = email.trim();
        const parsedEmail = emailSchema.safeParse(trimmedEmail);
        if (!parsedEmail.success) {
          setAuthFieldErrors({
            email: parsedEmail.error.issues[0]?.message ?? 'Enter a valid email address.',
          });
          setTimeout(() => emailInput.current?.focus(), 0);
          return;
        }
        const parsedPassword = passwordSchema.safeParse(password);
        if (!parsedPassword.success) {
          setAuthFieldErrors({
            password: parsedPassword.error.issues[0]?.message ?? 'Check the password requirements.',
          });
          setTimeout(() => passwordInput.current?.focus(), 0);
          return;
        }
        const input = {
          email: parsedEmail.data,
          password: parsedPassword.data,
          displayName: displayName.trim(),
        };
        if (input.displayName && input.displayName.length < 2) {
          setAuthFieldErrors({ displayName: 'Use at least 2 characters or leave this blank.' });
          return;
        }
        globalThis.localStorage.setItem('sds-local:post-auth-destination', 'discover');
        const { data, error } = await supabase.auth.signUp({
          email: input.email,
          password: input.password,
          options: { data: input.displayName ? { display_name: input.displayName } : {} },
        });
        if (error) throw error;
        if (!data.session) {
          setAuthNotice({
            kind: 'info',
            message: 'Check your email and use the confirmation link to finish signing up.',
          });
        } else {
          void haptics.success();
        }
      }
    } catch (error) {
      if (mode === 'sign-up') {
        globalThis.localStorage.removeItem('sds-local:post-auth-destination');
      }
      void haptics.error();
      setAuthNotice({
        kind: 'error',
        message: userMessageFromError(error, 'We could not continue. Please try again.'),
      });
      const message = error instanceof Error ? error.message : '';
      if (/email/i.test(message)) setAuthFieldErrors({ email: message });
      else if (/password|character|lowercase|uppercase|number/i.test(message)) {
        setAuthFieldErrors({ password: message });
      }
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile() {
    if (!session) return;
    try {
      setBusy(true);
      const input = customerProfileSchema.parse({ displayName, city, regionCode, postalCode });
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: input.displayName,
          city: input.city ?? null,
          region_code: input.regionCode ?? null,
          postal_code: input.postalCode ?? null,
        })
        .eq('id', session.user.id);
      if (error) throw error;
      Alert.alert('Saved', 'Your profile is up to date.');
      void haptics.success();
    } catch (error) {
      void haptics.error();
      Alert.alert(
        'Could not save',
        userMessageFromError(error, 'We could not save your profile. Please try again.'),
      );
    } finally {
      setBusy(false);
    }
  }

  async function requestPasswordReset() {
    try {
      setBusy(true);
      setAuthNotice(null);
      const input = magicLinkSchema.parse({ email });
      const { error } = await supabase.auth.resetPasswordForEmail(input.email);
      if (error) throw error;
      setEmail(input.email);
      setPassword('');
      setMode('recovery');
      setAuthNotice({
        kind: 'info',
        message:
          'Enter the 6-digit code from your email. In this local build, it appears in the local test inbox.',
      });
    } catch (error) {
      setAuthNotice({
        kind: 'error',
        message: userMessageFromError(
          error,
          'We could not send a reset code. Check the email address and try again.',
        ),
      });
    } finally {
      setBusy(false);
    }
  }

  async function requestEmailCode() {
    const signingUp = mode === 'sign-up';
    try {
      setBusy(true);
      setAuthNotice(null);
      setRememberSessionPreference(rememberSession);
      const input = magicLinkSchema.parse({ email });
      if (signingUp) globalThis.localStorage.setItem('sds-local:post-auth-destination', 'discover');
      const options = signingUp
        ? {
            shouldCreateUser: true,
            data: displayName.trim() ? { display_name: displayName.trim() } : {},
          }
        : { shouldCreateUser: false };
      const { error } = await supabase.auth.signInWithOtp({ email: input.email, options });
      if (error) throw error;
      setEmail(input.email);
      setEmailCode('');
      setMode('email-code');
      setAuthNotice({
        kind: 'info',
        message: 'Enter the 6-digit sign-in code from your email.',
      });
      setTimeout(() => emailCodeInput.current?.focus(), 0);
    } catch (error) {
      if (signingUp) globalThis.localStorage.removeItem('sds-local:post-auth-destination');
      setAuthNotice({
        kind: 'error',
        message: userMessageFromError(
          error,
          'We could not send a sign-in code. Check the email address and try again.',
        ),
      });
    } finally {
      setBusy(false);
    }
  }

  async function verifyEmailCode() {
    try {
      setBusy(true);
      setAuthNotice(null);
      const input = emailOtpSchema.parse({ email, code: emailCode });
      const { error } = await supabase.auth.verifyOtp({
        email: input.email,
        token: input.code,
        type: 'email',
      });
      if (error) throw error;
      setEmailCode('');
    } catch (error) {
      setAuthNotice({
        kind: 'error',
        message: userMessageFromError(
          error,
          'We could not sign you in. Check the code and try again.',
        ),
      });
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    try {
      setBusy(true);
      setAuthNotice(null);
      const input = passwordRecoverySchema.parse({
        email,
        code: recoveryCode,
        password,
        passwordConfirmation,
      });
      const { error: verificationError } = await supabase.auth.verifyOtp({
        email: input.email,
        token: input.code,
        type: 'recovery',
      });
      if (verificationError) throw verificationError;
      const { error: updateError } = await supabase.auth.updateUser({ password: input.password });
      if (updateError) throw updateError;
      setRecoveryCode('');
      setPassword('');
      setPasswordConfirmation('');
      setMode('sign-in');
      setAuthNotice({ kind: 'info', message: 'Password updated. You are now signed in.' });
    } catch (error) {
      setAuthNotice({
        kind: 'error',
        message: userMessageFromError(
          error,
          'We could not reset your password. Check the code and try again.',
        ),
      });
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color="#176B4D" />
      </ThemedView>
    );
  }

  if (session && accountSection === 'business-new') {
    return (
      <SwipeBackView
        enabled
        onSwipeBack={() => setAccountSection('overview')}
        underlay={
          <AccountOverviewUnderlay
            connectedMethods={connectedMethods}
            displayName={displayName}
            email={session.user.email ?? ''}
            hasBusinessAccess={hasBusinessAccess}
            location={[city, regionCode].filter(Boolean).join(', ') || 'Location not added'}
            unreadCount={notifications.unreadCount}
          />
        }
      >
        <NewBusinessWorkspace
          onBack={() => setAccountSection('overview')}
          onCreated={async (businessId, initialSection) => {
            await refreshBusinessAccess();
            setAppMode('business');
            setAccountSection('overview');
            router.replace({
              pathname: '/business',
              params: { id: businessId, ...(initialSection ? { section: initialSection } : {}) },
            });
          }}
        />
      </SwipeBackView>
    );
  }

  return (
    <SwipeBackView
      enabled={canSwipeBack}
      underlay={
        session && accountSection !== 'overview' ? (
          <AccountOverviewUnderlay
            connectedMethods={connectedMethods}
            displayName={displayName}
            email={session.user.email ?? ''}
            hasBusinessAccess={hasBusinessAccess}
            location={[city, regionCode].filter(Boolean).join(', ') || 'Location not added'}
            unreadCount={notifications.unreadCount}
          />
        ) : null
      }
      onSwipeBack={() => {
        if (session && accountSection !== 'overview') {
          setAccountSection('overview');
        } else if (!session && mode !== 'sign-in') {
          setMode('sign-in');
          setAuthNotice(null);
        }
      }}
    >
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <ScrollView
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            keyboardShouldPersistTaps="handled"
          >
            {(session || mode === 'sign-in' || mode === 'sign-up') && (
              <>
                {session && <AppChrome />}
                {session && accountSection !== 'overview' && (
                  <Pressable
                    onPress={() => setAccountSection('overview')}
                    style={styles.backButton}
                  >
                    <ThemedText type="smallBold">‹ Account</ThemedText>
                  </Pressable>
                )}
                <ThemedText type="title">
                  {session
                    ? accountSection === 'overview'
                      ? 'Account'
                      : accountSection === 'profile'
                        ? 'Profile'
                        : accountSection === 'notifications'
                          ? 'Notifications'
                          : accountSection === 'privacy-safety'
                            ? 'Privacy & Safety'
                            : accountSection === 'account-data'
                              ? 'Account & data'
                              : 'Sign-in methods'
                    : 'Welcome'}
                </ThemedText>
                <ThemedText themeColor="textSecondary">
                  {session
                    ? accountSection === 'overview'
                      ? (session.user.email ?? 'Signed-in account')
                      : accountSection === 'profile'
                        ? 'Choose how your name and location appear across SDS Local.'
                        : accountSection === 'notifications'
                          ? 'Control the updates you receive from local businesses.'
                          : accountSection === 'privacy-safety'
                            ? 'Review and restore businesses you have blocked.'
                            : accountSection === 'account-data'
                              ? 'Understand and control what happens to your account data.'
                              : 'Manage the ways you can access this account.'
                    : 'Sign in to follow businesses, set event reminders, and manage a business page.'}
                </ThemedText>
              </>
            )}

            {!isSupabaseConfigured && (
              <View style={styles.notice}>
                <ThemedText style={styles.noticeText} type="small">
                  Add the Expo Supabase environment values to connect this build.
                </ThemedText>
              </View>
            )}

            {session ? (
              <View style={styles.form}>
                {accountSection === 'overview' && (
                  <>
                    <View style={styles.profileSummary}>
                      <View style={styles.avatar}>
                        <ThemedText style={styles.avatarText} type="subtitle">
                          {(displayName || session.user.email || 'A').slice(0, 1).toUpperCase()}
                        </ThemedText>
                      </View>
                      <View style={styles.profileCopy}>
                        <ThemedText type="subtitle">{displayName || 'Your profile'}</ThemedText>
                        <ThemedText themeColor="textSecondary" type="small">
                          {[city, regionCode].filter(Boolean).join(', ') || 'Location not added'}
                        </ThemedText>
                      </View>
                    </View>

                    <View style={styles.settingsGroup}>
                      <SettingsRow
                        label="Profile"
                        detail="Name, city, and location"
                        onPress={() => setAccountSection('profile')}
                      />
                      <SettingsRow
                        label="Notifications"
                        detail={
                          notifications.unreadCount > 0
                            ? `${notifications.unreadCount} unread · preferences and alerts`
                            : 'Preferences and alerts'
                        }
                        onPress={() => setAccountSection('notifications')}
                      />
                      <SettingsRow
                        label="Privacy & Safety"
                        detail="Review blocked businesses"
                        onPress={() => setAccountSection('privacy-safety')}
                      />
                      <SettingsRow
                        label="Sign-in methods"
                        detail={
                          connectedMethods
                            ? `${connectedMethods} connected`
                            : 'Add a sign-in method'
                        }
                        onPress={() => setAccountSection('sign-in-methods')}
                      />
                      <SettingsRow
                        label="Account & data"
                        detail="Account deletion and saved data"
                        onPress={() => setAccountSection('account-data')}
                      />
                      <SettingsRow
                        label={hasBusinessAccess ? 'Business workspace' : 'Create a business'}
                        detail={
                          hasBusinessAccess
                            ? 'Manage pages, offerings, events, and staff'
                            : 'Set up a business profile for customers to discover'
                        }
                        onPress={() => {
                          if (hasBusinessAccess) {
                            setAppMode('business');
                            router.replace('/businesses');
                          } else {
                            // NativeTabs intentionally cannot navigate to hidden triggers.
                            // Keep onboarding inside the Account flow instead of routing to a
                            // hidden tab that silently ignores the press.
                            setAccountSection('business-new');
                          }
                        }}
                      />
                    </View>

                    <Pressable
                      disabled={busy}
                      onPress={() =>
                        void (async () => {
                          setGoogleLinkedThisSession(false);
                          setAppleLinkedThisSession(false);
                          await notifications.deactivate().catch(() => undefined);
                          await nearbyAlerts
                            .clearForAccount(session.user.id)
                            .catch(() => undefined);
                          clearBusinessOnboardingDraft(session.user.id);
                          globalThis.localStorage.removeItem('sds-local:post-auth-destination');
                          await clearBiometricSignInRefreshToken();
                          await supabase.auth.signOut();
                        })()
                      }
                      style={styles.signOutButton}
                    >
                      <ThemedText style={styles.signOutText} type="smallBold">
                        Sign out
                      </ThemedText>
                    </Pressable>
                  </>
                )}

                {accountSection === 'profile' && (
                  <View style={styles.editorCard}>
                    <Field
                      label="Display name (optional)"
                      value={displayName}
                      onChangeText={setDisplayName}
                      colors={colors}
                      inputRef={displayNameInput}
                      blurOnSubmit={false}
                      returnKeyType="next"
                      onSubmitEditing={() => cityInput.current?.focus()}
                    />
                    <Field
                      label="City"
                      value={city}
                      onChangeText={setCity}
                      colors={colors}
                      inputRef={cityInput}
                      blurOnSubmit={false}
                      returnKeyType="next"
                      onSubmitEditing={() => regionInput.current?.focus()}
                    />
                    <Field
                      label="State / region"
                      value={regionCode}
                      onChangeText={setRegionCode}
                      colors={colors}
                      inputRef={regionInput}
                      blurOnSubmit={false}
                      returnKeyType="next"
                      onSubmitEditing={() => postalCodeInput.current?.focus()}
                    />
                    <Field
                      label="Postal code"
                      value={postalCode}
                      onChangeText={setPostalCode}
                      colors={colors}
                      inputRef={postalCodeInput}
                      returnKeyType="done"
                      onSubmitEditing={() => void saveProfile()}
                    />
                    <PrimaryButton
                      loading={busy}
                      label={busy ? 'Saving…' : 'Save profile'}
                      disabled={busy}
                      onPress={() => void saveProfile()}
                    />
                  </View>
                )}

                {accountSection === 'account-data' && <AccountDataPanel />}

                {accountSection === 'notifications' && <NotificationSettings />}

                {accountSection === 'privacy-safety' && <BlockedBusinessesPanel />}

                {accountSection === 'sign-in-methods' && (
                  <View style={styles.editorCard}>
                    {authNotice && <AuthNotice notice={authNotice} />}
                    <View style={styles.methodRow}>
                      <View style={styles.profileCopy}>
                        <ThemedText type="smallBold">Email</ThemedText>
                        <ThemedText themeColor="textSecondary" type="small">
                          {session.user.email ?? 'No email connected'}
                        </ThemedText>
                      </View>
                      {emailLinked ? (
                        <ThemedText style={styles.connectedText} type="smallBold">
                          Connected
                        </ThemedText>
                      ) : (
                        <ThemedText themeColor="textSecondary" type="smallBold">
                          Not connected
                        </ThemedText>
                      )}
                    </View>
                    <View style={styles.methodRow}>
                      <View style={styles.profileCopy}>
                        <ThemedText type="smallBold">Google</ThemedText>
                        <ThemedText themeColor="textSecondary" type="small">
                          {googleLinked
                            ? 'Connected to this account'
                            : isGoogleAuthEnabled
                              ? 'Connect for faster sign-in'
                              : 'Coming after provider setup'}
                        </ThemedText>
                      </View>
                      {googleLinked ? (
                        <ThemedText style={styles.connectedText} type="smallBold">
                          Connected
                        </ThemedText>
                      ) : isGoogleAuthEnabled ? (
                        <Pressable
                          disabled={busy}
                          onPress={() => void connectGoogle()}
                          style={[styles.connectButton, busy && styles.disabled]}
                        >
                          <ThemedText type="smallBold">Connect</ThemedText>
                        </Pressable>
                      ) : null}
                    </View>
                    <View style={styles.methodRow}>
                      <View style={styles.profileCopy}>
                        <ThemedText type="smallBold">Apple</ThemedText>
                        <ThemedText themeColor="textSecondary" type="small">
                          {appleLinked
                            ? 'Connected to this account'
                            : appleAuthAvailable
                              ? 'Available on this iPhone or iPad'
                              : 'Available on supported Apple devices'}
                        </ThemedText>
                      </View>
                      {appleLinked && (
                        <ThemedText style={styles.connectedText} type="smallBold">
                          Connected
                        </ThemedText>
                      )}
                      {!appleLinked && appleAuthAvailable && (
                        <Pressable
                          disabled={busy || !isSupabaseConfigured}
                          onPress={() => void connectApple()}
                          style={[styles.connectButton, busy && styles.disabled]}
                        >
                          <ThemedText type="smallBold">Connect</ThemedText>
                        </Pressable>
                      )}
                    </View>
                  </View>
                )}
              </View>
            ) : (
              <>
                {(mode === 'sign-in' || mode === 'sign-up') && (
                  <View
                    style={[
                      styles.welcomeCard,
                      { backgroundColor: colors.backgroundElement, borderColor: colors.border },
                    ]}
                  >
                    <ThemedText type="smallBold">With a free account you can</ThemedText>
                    <ThemedText themeColor="textSecondary" type="small">
                      Follow businesses · Join rewards · Save reminders · Manage a business
                    </ThemedText>
                    <View style={styles.welcomeActions}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => router.replace('/explore')}
                        style={styles.guestButton}
                      >
                        <ThemedText type="smallBold">Continue browsing</ThemedText>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                          savePendingAuthIntent({ kind: 'create_business' });
                          setMode('sign-up');
                          setAuthNotice({
                            kind: 'info',
                            message: 'Create an account, then we’ll return you to business setup.',
                          });
                        }}
                        style={styles.listBusinessButton}
                      >
                        <ThemedText themeColor="accent" type="smallBold">
                          List your business
                        </ThemedText>
                      </Pressable>
                    </View>
                  </View>
                )}
                <View style={styles.form}>
                  {(mode === 'sign-in' || mode === 'sign-up') && (
                    <View style={styles.modeRow}>
                      <ModeButton
                        active={mode === 'sign-in'}
                        label="Sign in"
                        onPress={() => {
                          setMode('sign-in');
                          setAuthNotice(null);
                        }}
                      />
                      <ModeButton
                        active={mode === 'sign-up'}
                        label="Create account"
                        onPress={() => {
                          setMode('sign-up');
                          setAuthNotice(null);
                        }}
                      />
                    </View>
                  )}
                  {mode === 'recovery' && (
                    <View style={styles.recoveryHeading}>
                      <ThemedText type="subtitle">Reset your password</ThemedText>
                      <ThemedText themeColor="textSecondary">
                        Enter the 6-digit code from your email and choose a new password.
                      </ThemedText>
                    </View>
                  )}
                  {mode === 'email-code' && (
                    <View style={styles.recoveryHeading}>
                      <ThemedText type="subtitle">Check your email</ThemedText>
                      <ThemedText themeColor="textSecondary">
                        Enter the 6-digit code to finish signing in.
                      </ThemedText>
                    </View>
                  )}
                  {authNotice && <AuthNotice notice={authNotice} />}
                  {mode === 'sign-up' && (
                    <Field
                      label="Display name"
                      value={displayName}
                      onChangeText={setDisplayName}
                      colors={colors}
                      inputRef={displayNameInput}
                      blurOnSubmit={false}
                      returnKeyType="next"
                      onSubmitEditing={() => emailInput.current?.focus()}
                      error={authFieldErrors.displayName}
                    />
                  )}
                  <Field
                    label="Email"
                    value={email}
                    onChangeText={setEmail}
                    colors={colors}
                    inputRef={emailInput}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    blurOnSubmit={false}
                    returnKeyType="next"
                    onSubmitEditing={() => {
                      if (mode === 'sign-up') passwordInput.current?.focus();
                      else if (mode === 'recovery') recoveryCodeInput.current?.focus();
                      else if (mode === 'email-code') emailCodeInput.current?.focus();
                      else passwordInput.current?.focus();
                    }}
                    error={authFieldErrors.email}
                  />
                  {mode === 'email-code' && (
                    <Field
                      label="6-digit sign-in code"
                      value={emailCode}
                      onChangeText={changeEmailCode}
                      colors={colors}
                      inputRef={emailCodeInput}
                      keyboardType="number-pad"
                      maxLength={6}
                      autoComplete="one-time-code"
                      textContentType="oneTimeCode"
                      returnKeyType="done"
                      onSubmitEditing={() => void verifyEmailCode()}
                    />
                  )}
                  {mode === 'recovery' && (
                    <Field
                      label="6-digit reset code"
                      value={recoveryCode}
                      onChangeText={changeRecoveryCode}
                      colors={colors}
                      inputRef={recoveryCodeInput}
                      keyboardType="number-pad"
                      maxLength={6}
                      autoComplete="one-time-code"
                      textContentType="oneTimeCode"
                      blurOnSubmit={false}
                      returnKeyType="next"
                      onSubmitEditing={() => passwordInput.current?.focus()}
                    />
                  )}
                  {mode !== 'email-code' && (
                    <View style={styles.passwordGroup}>
                      <Field
                        label={
                          mode === 'recovery'
                            ? 'New password'
                            : mode === 'sign-up'
                              ? 'Password'
                              : 'Password'
                        }
                        value={password}
                        onChangeText={setPassword}
                        colors={colors}
                        inputRef={passwordInput}
                        secureTextEntry
                        autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                        textContentType={mode === 'sign-in' ? 'password' : 'newPassword'}
                        blurOnSubmit={mode !== 'recovery'}
                        returnKeyType={mode === 'recovery' ? 'next' : 'done'}
                        onSubmitEditing={() => {
                          if (mode === 'recovery') passwordConfirmationInput.current?.focus();
                          else void submitAuth();
                        }}
                        error={authFieldErrors.password}
                      />
                      {(mode === 'sign-up' || mode === 'recovery') && (
                        <ThemedText themeColor="textSecondary" type="small">
                          10–72 characters with uppercase, lowercase, and a number.
                        </ThemedText>
                      )}
                    </View>
                  )}
                  {mode === 'recovery' && (
                    <Field
                      label="Confirm new password"
                      value={passwordConfirmation}
                      onChangeText={setPasswordConfirmation}
                      colors={colors}
                      inputRef={passwordConfirmationInput}
                      secureTextEntry
                      autoComplete="new-password"
                      textContentType="newPassword"
                      returnKeyType="done"
                      onSubmitEditing={() => void resetPassword()}
                    />
                  )}
                  {(mode === 'sign-in' || mode === 'sign-up') && (
                    <RememberSessionToggle
                      value={rememberSession}
                      onChange={(nextValue) => {
                        setRememberSession(nextValue);
                        setRememberSessionPreference(nextValue);
                      }}
                    />
                  )}
                  {mode === 'sign-in' && (
                    <View style={styles.inlineActions}>
                      <Pressable
                        disabled={busy || !isSupabaseConfigured}
                        onPress={() => void requestEmailCode()}
                        style={styles.inlineAction}
                      >
                        <ThemedText type="smallBold">Email me a sign-in code</ThemedText>
                      </Pressable>
                      <Pressable
                        disabled={busy || !isSupabaseConfigured}
                        onPress={() => void requestPasswordReset()}
                        style={styles.inlineAction}
                      >
                        <ThemedText type="smallBold">Forgot password?</ThemedText>
                      </Pressable>
                    </View>
                  )}
                  {mode === 'recovery' ? (
                    <>
                      <PrimaryButton
                        loading={busy}
                        label={busy ? 'Updating…' : 'Update password'}
                        disabled={busy || !isSupabaseConfigured}
                        onPress={() => void resetPassword()}
                      />
                      <Pressable
                        disabled={busy}
                        onPress={() => {
                          setMode('sign-in');
                          setAuthNotice(null);
                        }}
                        style={styles.secondaryButton}
                      >
                        <ThemedText type="smallBold">Back to sign in</ThemedText>
                      </Pressable>
                    </>
                  ) : mode === 'email-code' ? (
                    <>
                      <PrimaryButton
                        loading={busy}
                        label={busy ? 'Signing in…' : 'Sign in with code'}
                        disabled={busy || !isSupabaseConfigured}
                        onPress={() => void verifyEmailCode()}
                      />
                      <Pressable
                        disabled={busy}
                        onPress={() => {
                          setMode('sign-in');
                          setAuthNotice(null);
                        }}
                        style={styles.secondaryButton}
                      >
                        <ThemedText type="smallBold">Back to sign in</ThemedText>
                      </Pressable>
                    </>
                  ) : (
                    <>
                      <PrimaryButton
                        loading={busy}
                        label={
                          busy ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'
                        }
                        disabled={busy || !isSupabaseConfigured}
                        onPress={() => void submitAuth()}
                      />
                      {(isGoogleAuthEnabled || appleAuthAvailable) && (
                        <>
                          <View style={styles.orRow}>
                            <View style={styles.orLine} />
                            <ThemedText themeColor="textSecondary" type="small">
                              or
                            </ThemedText>
                            <View style={styles.orLine} />
                          </View>
                          {isGoogleAuthEnabled && (
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={
                                mode === 'sign-up' ? 'Sign up with Google' : 'Sign in with Google'
                              }
                              disabled={busy || !isSupabaseConfigured}
                              onPress={() => void continueWithGoogle()}
                              style={[styles.googleButton, busy && styles.disabled]}
                            >
                              <GoogleMark />
                              <ThemedText style={styles.googleButtonText} type="smallBold">
                                {mode === 'sign-up' ? 'Sign up with Google' : 'Sign in with Google'}
                              </ThemedText>
                            </Pressable>
                          )}
                          {appleAuthAvailable && (
                            <AppleAuthentication.AppleAuthenticationButton
                              buttonStyle={
                                AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE
                              }
                              buttonType={
                                mode === 'sign-up'
                                  ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
                                  : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                              }
                              cornerRadius={12}
                              onPress={() => {
                                if (!busy && isSupabaseConfigured) void continueWithApple();
                              }}
                              style={[styles.appleButton, busy && styles.disabled]}
                            />
                          )}
                        </>
                      )}
                      {mode === 'sign-up' && email.trim().length > 0 && (
                        <Pressable
                          disabled={busy || !isSupabaseConfigured}
                          onPress={() => void requestEmailCode()}
                          style={styles.secondaryButton}
                        >
                          <ThemedText type="smallBold">Create account with email code</ThemedText>
                        </Pressable>
                      )}
                    </>
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    </SwipeBackView>
  );
}

interface FieldProps extends React.ComponentProps<typeof TextInput> {
  readonly label: string;
  readonly error?: string | undefined;
  readonly inputRef?: React.Ref<TextInput>;
  readonly colors: typeof Colors.light | typeof Colors.dark;
}

function AuthNotice({ notice }: { readonly notice: AuthNoticeState }) {
  return <StateNotice message={notice.message} kind={notice.kind} />;
}

function RememberSessionToggle({
  value,
  onChange,
}: {
  readonly value: boolean;
  readonly onChange: (value: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      onPress={() => {
        void haptics.selection();
        onChange(!value);
      }}
      style={styles.rememberSession}
    >
      <View style={[styles.rememberBox, value && styles.rememberBoxChecked]}>
        {value && <ThemedText style={styles.rememberCheck}>✓</ThemedText>}
      </View>
      <View style={styles.rememberCopy}>
        <ThemedText type="smallBold">Stay signed in on this device</ThemedText>
        <ThemedText themeColor="textSecondary" type="small">
          Keeps you signed in when you close the app.
        </ThemedText>
      </View>
    </Pressable>
  );
}

function AccountOverviewUnderlay({
  connectedMethods,
  displayName,
  email,
  hasBusinessAccess,
  location,
  unreadCount,
}: {
  readonly connectedMethods: string;
  readonly displayName: string;
  readonly email: string;
  readonly hasBusinessAccess: boolean;
  readonly location: string;
  readonly unreadCount: number;
}) {
  const bottomPadding = useScreenBottomPadding();
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
          scrollEnabled={false}
        >
          <AppChrome />
          <ThemedText type="title">Account</ThemedText>
          <ThemedText themeColor="textSecondary">{email || 'Signed-in account'}</ThemedText>
          <View style={styles.form}>
            <View style={styles.profileSummary}>
              <View style={styles.avatar}>
                <ThemedText style={styles.avatarText} type="subtitle">
                  {(displayName || email || 'A').slice(0, 1).toUpperCase()}
                </ThemedText>
              </View>
              <View style={styles.profileCopy}>
                <ThemedText type="subtitle">{displayName || 'Your profile'}</ThemedText>
                <ThemedText themeColor="textSecondary" type="small">
                  {location}
                </ThemedText>
              </View>
            </View>
            <View style={styles.settingsGroup}>
              <SettingsRow
                label="Profile"
                detail="Name, city, and location"
                onPress={() => undefined}
              />
              <SettingsRow
                label="Notifications"
                detail={
                  unreadCount > 0
                    ? `${unreadCount} unread · preferences and alerts`
                    : 'Preferences and alerts'
                }
                onPress={() => undefined}
              />
              <SettingsRow
                label="Privacy & Safety"
                detail="Review blocked businesses"
                onPress={() => undefined}
              />
              <SettingsRow
                label="Sign-in methods"
                detail={connectedMethods ? `${connectedMethods} connected` : 'Add a sign-in method'}
                onPress={() => undefined}
              />
              <SettingsRow
                label="Account & data"
                detail="Account deletion and saved data"
                onPress={() => undefined}
              />
              <SettingsRow
                label={hasBusinessAccess ? 'Business workspace' : 'Create a business'}
                detail={
                  hasBusinessAccess
                    ? 'Manage pages, offerings, events, and staff'
                    : 'Set up a business profile for customers to discover'
                }
                onPress={() => undefined}
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function SettingsRow({
  label,
  detail,
  onPress,
}: {
  readonly label: string;
  readonly detail: string;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}
    >
      <View style={styles.profileCopy}>
        <ThemedText type="smallBold">{label}</ThemedText>
        <ThemedText themeColor="textSecondary" type="small">
          {detail}
        </ThemedText>
      </View>
      <ThemedText themeColor="textSecondary">›</ThemedText>
    </Pressable>
  );
}

function Field({
  label,
  colors,
  inputRef,
  error,
  secureTextEntry = false,
  style,
  ...props
}: FieldProps) {
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View style={styles.inputWrapper}>
        <TextInput
          {...props}
          ref={inputRef}
          accessibilityLabel={label}
          accessibilityHint={error}
          secureTextEntry={secureTextEntry && !passwordVisible}
          placeholderTextColor={colors.textSecondary}
          style={[
            styles.input,
            secureTextEntry && styles.passwordInput,
            {
              borderColor: error ? colors.destructive : colors.inputBorder,
              color: colors.text,
              backgroundColor: colors.background,
            },
            style,
          ]}
        />
        {secureTextEntry && (
          <Pressable
            accessibilityLabel={`${passwordVisible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setPasswordVisible((visible) => !visible)}
            style={styles.passwordToggle}
          >
            <ThemedText type="smallBold">{passwordVisible ? 'Hide' : 'Show'}</ThemedText>
          </Pressable>
        )}
      </View>
      {error && (
        <ThemedText
          accessibilityLiveRegion="polite"
          style={[styles.fieldError, { color: colors.errorText }]}
          type="small"
        >
          {error}
        </ThemedText>
      )}
    </View>
  );
}

function PrimaryButton({
  label,
  disabled,
  onPress,
  loading = false,
}: {
  readonly label: string;
  readonly loading?: boolean;
  readonly disabled: boolean;
  readonly onPress: () => void;
}) {
  return (
    <AppButton
      label={label}
      disabled={disabled}
      loading={loading}
      onPress={() => {
        void haptics.medium();
        onPress();
      }}
    />
  );
}

function ModeButton({
  active,
  label,
  onPress,
}: {
  readonly active: boolean;
  readonly label: string;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={() => {
        void haptics.selection();
        onPress();
      }}
      style={[styles.modeButton, active && styles.modeButtonActive]}
    >
      <ThemedText style={active ? styles.modeButtonActiveText : undefined} type="smallBold">
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: {
    padding: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  notice: {
    marginTop: Spacing.three,
    borderRadius: 12,
    padding: Spacing.three,
    backgroundColor: '#FFF0C7',
  },
  noticeText: { color: '#3D3100' },
  form: { marginTop: Spacing.four, gap: Spacing.three },
  welcomeCard: {
    marginTop: Spacing.three,
    borderWidth: 1,
    borderRadius: 18,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  welcomeActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  guestButton: {
    minHeight: 46,
    flex: 1,
    borderWidth: 1,
    borderColor: '#718078',
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  listBusinessButton: { minHeight: 46, justifyContent: 'center', paddingHorizontal: Spacing.two },
  field: { gap: Spacing.one },
  fieldError: { color: '#A03434' },
  passwordGroup: { gap: Spacing.one },
  inputWrapper: { position: 'relative' },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14 },
  passwordInput: { paddingRight: 72 },
  passwordToggle: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  authNotice: { borderRadius: 12, borderWidth: 1, padding: Spacing.three },
  authNoticeError: { backgroundColor: '#F8E6E6', borderColor: '#C86A6A' },
  authNoticeInfo: { backgroundColor: '#E7F0EA', borderColor: '#8EB49F' },
  authNoticeErrorText: { color: '#761F1F' },
  authNoticeInfoText: { color: '#164E38' },
  backButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
  },
  profileSummary: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#176B4D',
  },
  avatarText: { color: '#FFFFFF' },
  profileCopy: { flex: 1, gap: 2 },
  settingsGroup: {
    overflow: 'hidden',
    borderRadius: 20,
    backgroundColor: 'rgba(120,140,128,0.10)',
  },
  settingsRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#718078',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  pressed: { opacity: 0.65 },
  editorCard: {
    gap: Spacing.three,
    borderRadius: 20,
    padding: Spacing.three,
    backgroundColor: 'rgba(120,140,128,0.10)',
  },
  methodRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#718078',
    paddingVertical: Spacing.two,
  },
  connectButton: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#718078',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  connectedText: {
    color: '#164E38',
    backgroundColor: '#E4F4EC',
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  signOutButton: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A44A4A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: { color: '#D16464' },
  primaryButton: {
    minHeight: 50,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#176B4D',
    paddingHorizontal: 18,
  },
  primaryButtonText: { color: '#FFFFFF' },
  secondaryButton: {
    minHeight: 48,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFCAC3',
  },
  disabled: { opacity: 0.55 },
  modeRow: { flexDirection: 'row', gap: Spacing.two },
  modeButton: { flex: 1, alignItems: 'center', padding: Spacing.two, borderRadius: 12 },
  modeButtonActive: { backgroundColor: '#DCEAE2' },
  modeButtonActiveText: { color: '#103D2D' },
  recoveryHeading: { gap: Spacing.one },
  inlineActions: { gap: Spacing.two },
  inlineAction: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#718078',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  rememberSession: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  rememberBox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#718078',
  },
  rememberBoxChecked: { borderColor: '#176B4D', backgroundColor: '#176B4D' },
  rememberCheck: { color: '#FFFFFF', lineHeight: 22 },
  rememberCopy: { flex: 1, gap: 2 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  orLine: { flex: 1, height: 1, backgroundColor: '#707772' },
  googleButton: {
    width: '100%',
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderColor: '#747775',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  googleButtonText: { color: '#1F1F1F' },
  appleButton: { width: '100%', height: 50 },
});
