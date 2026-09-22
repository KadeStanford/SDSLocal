import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

const redirectTo = 'sdslocal://auth/callback';
const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? '';
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() ?? '';

WebBrowser.maybeCompleteAuthSession();

function callbackParameters(url: string) {
  const parsed = new URL(url);
  const parameters = new URLSearchParams(parsed.search);
  const fragment = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash;
  new URLSearchParams(fragment).forEach((value, key) => parameters.set(key, value));
  return parameters;
}

async function completeOAuth(url: string, flowId?: string | null) {
  const parameters = callbackParameters(url);
  const description = parameters.get('error_description');
  if (description) throw new Error(description);

  const code = parameters.get('code');
  if (code) {
    const response = flowId
      ? await supabase.auth.exchangeCodeForSession(code, { flowId })
      : await supabase.auth.exchangeCodeForSession(code);
    if (response.error) throw response.error;
    return;
  }

  const accessToken = parameters.get('access_token');
  const refreshToken = parameters.get('refresh_token');
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
  }
}

async function openOAuth(url: string, flowId?: string | null) {
  const result = await WebBrowser.openAuthSessionAsync(url, redirectTo, {
    preferEphemeralSession: false,
  });
  if (result.type !== 'success') return false;
  await completeOAuth(result.url, flowId);
  return true;
}

async function requestAppleCredential() {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  if (!credential.identityToken) {
    throw new Error('Apple sign-in did not return an identity token.');
  }

  return { credential, identityToken: credential.identityToken, rawNonce };
}

let nativeGoogleConfigured = false;
type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin').GoogleSignin;
let googleSigninModule: GoogleSigninModule | null = null;

function googleSignin() {
  if (googleSigninModule) return googleSigninModule;
  try {
    // Loading lazily keeps Expo Go and web builds usable. The native module is
    // present in the custom development/production builds that enable Google.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    googleSigninModule = require('@react-native-google-signin/google-signin')
      .GoogleSignin as GoogleSigninModule;
    return googleSigninModule;
  } catch {
    throw new Error(
      'Google sign-in needs a custom native build with @react-native-google-signin/google-signin installed.',
    );
  }
}

function ensureNativeGoogleConfiguration() {
  if (Platform.OS === 'ios' && !googleIosClientId) {
    throw new Error(
      'Google sign-in needs the iOS client ID in EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID before this build can use it.',
    );
  }
  if (!googleWebClientId) {
    throw new Error(
      'Google sign-in needs the Web client ID in EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID before this build can use it.',
    );
  }
  if (nativeGoogleConfigured) return;
  googleSignin().configure({
    webClientId: googleWebClientId,
    ...(googleIosClientId ? { iosClientId: googleIosClientId } : {}),
    offlineAccess: false,
  });
  nativeGoogleConfigured = true;
}

interface NativeGoogleCredentials {
  readonly idToken: string;
  readonly accessToken: string | null;
}

async function requestNativeGoogleCredentials(): Promise<NativeGoogleCredentials | null> {
  ensureNativeGoogleConfiguration();
  if (Platform.OS === 'android') {
    await googleSignin().hasPlayServices({ showPlayServicesUpdateDialog: true });
  }
  const response = await googleSignin().signIn();
  if (response.type === 'cancelled') return null;
  const idToken = response.data.idToken;
  if (!idToken) throw new Error('Google sign-in did not return an identity token.');

  // Google can include an `at_hash` claim in the ID token. Supabase needs the
  // matching access token in that case, and the native SDK exposes it through
  // getTokens() after the sign-in sheet completes. Keep the ID-token path
  // usable if a platform does not return an access token.
  let accessToken: string | null = null;
  try {
    accessToken = (await googleSignin().getTokens()).accessToken || null;
  } catch {
    // The ID token is still sufficient for providers/tokens without at_hash.
  }
  return { idToken, accessToken };
}

export async function signInWithGoogle() {
  if (Platform.OS !== 'web') {
    const credentials = await requestNativeGoogleCredentials();
    if (!credentials) return false;
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: credentials.idToken,
      ...(credentials.accessToken ? { access_token: credentials.accessToken } : {}),
    });
    if (error) throw error;
    return Boolean(data.session);
  }
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error('Google sign-in is unavailable.');
  return openOAuth(data.url, data.flowId);
}

export async function linkGoogleIdentity() {
  if (Platform.OS !== 'web') {
    const credentials = await requestNativeGoogleCredentials();
    if (!credentials) return false;
    const { error } = await supabase.auth.linkIdentity({
      provider: 'google',
      token: credentials.idToken,
      ...(credentials.accessToken ? { access_token: credentials.accessToken } : {}),
    });
    if (error) throw error;
    const { data: identities, error: identitiesError } = await supabase.auth.getUserIdentities();
    if (identitiesError) throw identitiesError;
    return identities.identities.some((identity) => identity.provider === 'google');
  }
  const { data, error } = await supabase.auth.linkIdentity({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error('Google account linking is unavailable.');
  const completed = await openOAuth(data.url, data.flowId);
  if (!completed) return false;

  const { data: identities, error: identitiesError } = await supabase.auth.getUserIdentities();
  if (identitiesError) throw identitiesError;
  return identities.identities.some((identity) => identity.provider === 'google');
}

/** Link Apple to an already-authenticated account using native Sign in with Apple. */
export async function linkAppleIdentity() {
  const { identityToken, rawNonce } = await requestAppleCredential();
  const { error } = await supabase.auth.linkIdentity({
    provider: 'apple',
    token: identityToken,
    nonce: rawNonce,
  });
  if (error) throw error;

  const { data: identities, error: identitiesError } = await supabase.auth.getUserIdentities();
  if (identitiesError) throw identitiesError;
  return identities.identities.some((identity) => identity.provider === 'apple');
}

export async function isAppleAuthAvailable() {
  return AppleAuthentication.isAvailableAsync();
}

/**
 * Complete native Sign in with Apple through Supabase. Apple only returns a
 * person's name on the first authorization, so save it immediately when it is
 * present rather than relying on the identity token to contain it.
 */
export async function signInWithApple() {
  const { credential, identityToken, rawNonce } = await requestAppleCredential();

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: identityToken,
    nonce: rawNonce,
  });
  if (error) throw error;

  const fullName = credential.fullName
    ? AppleAuthentication.formatFullName(credential.fullName, 'default').trim()
    : '';
  if (data.user && fullName && !data.user.user_metadata.display_name) {
    // Profile creation is handled by the database trigger. These best-effort
    // updates fill the display name for a brand-new Apple account without
    // making a successful sign-in fail if profile syncing is temporarily slow.
    await supabase.auth
      .updateUser({ data: { display_name: fullName, full_name: fullName } })
      .catch(() => undefined);
    try {
      await supabase
        .from('profiles')
        .update({ display_name: fullName })
        .eq('id', data.user.id)
        .is('display_name', null);
    } catch {
      // The auth session is still valid if the optional profile update fails.
    }
  }

  return data;
}
