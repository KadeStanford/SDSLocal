import {
  customerProfileSchema,
  emailOtpSchema,
  magicLinkSchema,
  passwordRecoverySchema,
  signInSchema,
  signUpSchema,
} from '@sds/validation';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { NotificationSettings } from '@/components/notification-settings';
import { ModeSwitch } from '@/components/mode-switch';
import { Colors, Spacing } from '@/constants/theme';
import { linkGoogleIdentity, signInWithGoogle } from '@/lib/mobile-oauth';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { userMessageFromError } from '@/lib/user-error';
import { useAuth } from '@/providers/auth-provider';
import { useNotifications } from '@/providers/notification-provider';

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

export default function AccountScreen() {
  const { session, loading } = useAuth();
  const notifications = useNotifications();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [mode, setMode] = useState<'sign-in' | 'sign-up' | 'email-code' | 'recovery'>('sign-in');
  const [accountSection, setAccountSection] = useState<
    'overview' | 'profile' | 'notifications' | 'sign-in-methods'
  >('overview');
  const [busy, setBusy] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [googleLinkedThisSession, setGoogleLinkedThisSession] = useState(false);
  const [authNotice, setAuthNotice] = useState<AuthNoticeState | null>(null);
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
    if (!session) return;
    void supabase
      .from('profiles')
      .select('display_name, city, region_code, postal_code')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        const profile = data as ProfileRow | null;
        if (!profile) return;
        setDisplayName(profile.display_name ?? '');
        setCity(profile.city ?? '');
        setRegionCode(profile.region_code ?? '');
        setPostalCode(profile.postal_code ?? '');
      });
  }, [session]);

  const googleLinked =
    googleLinkedThisSession ||
    (session?.user.identities?.some((identity) => identity.provider === 'google') ?? false);

  async function continueWithGoogle() {
    try {
      setBusy(true);
      setAuthNotice(null);
      const completed = await signInWithGoogle();
      if (!completed) {
        setAuthNotice({ kind: 'info', message: 'Google sign-in was canceled.' });
      }
    } catch (error) {
      setAuthNotice({
        kind: 'error',
        message: userMessageFromError(
          error,
          'Google sign-in could not be completed. Please use email sign-in for now.',
        ),
      });
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
      }
    } catch (error) {
      setAuthNotice({
        kind: 'error',
        message: userMessageFromError(
          error,
          'Your Google account could not be connected. Please try again.',
        ),
      });
    } finally {
      setBusy(false);
    }
  }

  async function submitAuth() {
    try {
      setBusy(true);
      setAuthNotice(null);
      if (mode === 'sign-in') {
        const input = signInSchema.parse({ email, password });
        const { error } = await supabase.auth.signInWithPassword(input);
        if (error) throw error;
      } else {
        const input = signUpSchema.parse({ displayName, email, password });
        const { data, error } = await supabase.auth.signUp({
          email: input.email,
          password: input.password,
          options: { data: { display_name: input.displayName } },
        });
        if (error) throw error;
        if (!data.session) {
          setAuthNotice({
            kind: 'info',
            message: 'Check your email and use the confirmation link to finish signing up.',
          });
        }
      }
    } catch (error) {
      setAuthNotice({
        kind: 'error',
        message: userMessageFromError(error, 'We could not continue. Please try again.'),
      });
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
    } catch (error) {
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
    try {
      setBusy(true);
      setAuthNotice(null);
      const input = magicLinkSchema.parse({ email });
      const signingUp = mode === 'sign-up';
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

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          contentContainerStyle={styles.content}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
        >
          {(session || mode === 'sign-in' || mode === 'sign-up') && (
            <>
              {session && accountSection !== 'overview' && (
                <Pressable onPress={() => setAccountSection('overview')} style={styles.backButton}>
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
                        : 'Sign-in methods'
                  : 'Welcome'}
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                {session
                  ? accountSection === 'overview'
                    ? session.user.email
                    : accountSection === 'profile'
                      ? 'Choose how your name and location appear across SDS Local.'
                      : accountSection === 'notifications'
                        ? 'Control the updates you receive from local businesses.'
                        : 'Manage the ways you can access this account.'
                  : 'Sign in to follow businesses, save events, and manage a business page.'}
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

                  <View style={styles.modeCard}>
                    <View style={styles.cardHeading}>
                      <ThemedText type="smallBold">USING SDS LOCAL AS</ThemedText>
                      <ThemedText themeColor="textSecondary" type="small">
                        Switch views without changing accounts.
                      </ThemedText>
                    </View>
                    <ModeSwitch />
                  </View>

                  <View style={styles.settingsGroup}>
                    <SettingsRow
                      label="Profile"
                      detail="Name, city, and location"
                      onPress={() => setAccountSection('profile')}
                    />
                    <SettingsRow
                      label="Notifications"
                      detail="Business and rewards updates"
                      onPress={() => setAccountSection('notifications')}
                    />
                    <SettingsRow
                      label="Sign-in methods"
                      detail={googleLinked ? 'Email and Google connected' : 'Email connected'}
                      onPress={() => setAccountSection('sign-in-methods')}
                    />
                  </View>

                  <Pressable
                    disabled={busy}
                    onPress={() =>
                      void notifications
                        .deactivate()
                        .catch(() => undefined)
                        .then(() => supabase.auth.signOut())
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
                    label="Display name"
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
                    label={busy ? 'Saving…' : 'Save profile'}
                    disabled={busy}
                    onPress={() => void saveProfile()}
                  />
                </View>
              )}

              {accountSection === 'notifications' && <NotificationSettings />}

              {accountSection === 'sign-in-methods' && (
                <View style={styles.editorCard}>
                  {authNotice && <AuthNotice notice={authNotice} />}
                  <View style={styles.methodRow}>
                    <View style={styles.profileCopy}>
                      <ThemedText type="smallBold">Email</ThemedText>
                      <ThemedText themeColor="textSecondary" type="small">
                        {session.user.email ?? 'Connected'}
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.connectedText} type="smallBold">
                      Connected
                    </ThemedText>
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
                </View>
              )}
            </View>
          ) : (
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
                onSubmitEditing={() =>
                  mode === 'recovery'
                    ? recoveryCodeInput.current?.focus()
                    : mode === 'email-code'
                      ? emailCodeInput.current?.focus()
                      : passwordInput.current?.focus()
                }
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
                <Field
                  label={mode === 'recovery' ? 'New password' : 'Password'}
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
                />
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
                    label={
                      busy ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'
                    }
                    disabled={busy || !isSupabaseConfigured}
                    onPress={() => void submitAuth()}
                  />
                  {isGoogleAuthEnabled && (
                    <>
                      <View style={styles.orRow}>
                        <View style={styles.orLine} />
                        <ThemedText themeColor="textSecondary" type="small">
                          or
                        </ThemedText>
                        <View style={styles.orLine} />
                      </View>
                      <Pressable
                        disabled={busy || !isSupabaseConfigured}
                        onPress={() => void continueWithGoogle()}
                        style={[styles.googleButton, busy && styles.disabled]}
                      >
                        <ThemedText type="smallBold">Continue with Google</ThemedText>
                      </Pressable>
                    </>
                  )}
                  {mode === 'sign-up' && (
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
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

interface FieldProps extends React.ComponentProps<typeof TextInput> {
  readonly label: string;
  readonly inputRef?: React.Ref<TextInput>;
  readonly colors: {
    readonly textSecondary: string;
    readonly backgroundElement: string;
    readonly text: string;
    readonly background: string;
  };
}

function AuthNotice({ notice }: { readonly notice: AuthNoticeState }) {
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[
        styles.authNotice,
        notice.kind === 'error' ? styles.authNoticeError : styles.authNoticeInfo,
      ]}
    >
      <ThemedText
        style={notice.kind === 'error' ? styles.authNoticeErrorText : styles.authNoticeInfoText}
        type="smallBold"
      >
        {notice.message}
      </ThemedText>
    </View>
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

function Field({ label, colors, inputRef, secureTextEntry = false, style, ...props }: FieldProps) {
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View style={styles.inputWrapper}>
        <TextInput
          {...props}
          ref={inputRef}
          secureTextEntry={secureTextEntry && !passwordVisible}
          placeholderTextColor={colors.textSecondary}
          style={[
            styles.input,
            secureTextEntry && styles.passwordInput,
            {
              borderColor: colors.backgroundElement,
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
    </View>
  );
}

function PrimaryButton({
  label,
  disabled,
  onPress,
}: {
  readonly label: string;
  readonly disabled: boolean;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[styles.primaryButton, disabled && styles.disabled]}
    >
      <ThemedText style={styles.primaryButtonText} type="smallBold">
        {label}
      </ThemedText>
    </Pressable>
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
    <Pressable onPress={onPress} style={[styles.modeButton, active && styles.modeButtonActive]}>
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
    paddingBottom: 130,
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
  field: { gap: Spacing.one },
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
  backButton: { alignSelf: 'flex-start', paddingVertical: Spacing.one },
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
  modeCard: {
    gap: Spacing.three,
    borderRadius: 20,
    padding: Spacing.three,
    backgroundColor: 'rgba(120,140,128,0.10)',
  },
  cardHeading: { gap: Spacing.one },
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
    minHeight: 40,
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
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#176B4D',
    paddingHorizontal: 18,
  },
  primaryButtonText: { color: '#FFFFFF' },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 24,
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
  inlineActions: { alignItems: 'flex-end', gap: Spacing.one },
  inlineAction: { paddingVertical: Spacing.one },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  orLine: { flex: 1, height: 1, backgroundColor: '#707772' },
  googleButton: {
    minHeight: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFCAC3',
    paddingHorizontal: 18,
  },
});
