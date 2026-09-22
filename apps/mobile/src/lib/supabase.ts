import 'react-native-url-polyfill/auto';
import './sqlite-storage';

import { createPublicSupabaseClient, resolveDeviceDevelopmentUrl } from '@sds/api-client';
import Constants from 'expo-constants';
import { AppState, Platform } from 'react-native';

import { authStorage } from '@/lib/auth-storage';

const appEnvironment = process.env.EXPO_PUBLIC_APP_ENV ?? 'development';
const isStaging = appEnvironment === 'staging';
const configuredUrl = isStaging
  ? process.env.EXPO_PUBLIC_STAGING_SUPABASE_URL
  : process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = isStaging
  ? process.env.EXPO_PUBLIC_STAGING_SUPABASE_ANON_KEY
  : process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const resolvedUrl =
  configuredUrl ??
  (isStaging ? 'https://staging-config-missing.invalid' : 'http://127.0.0.1:54321');
const resolvedAnonKey =
  anonKey ?? (isStaging ? 'staging-config-missing-key' : 'local-build-placeholder-key');

function metroHostname() {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) return hostUri.replace(/^\w+:\/\//, '').split(/[/:]/)[0] ?? null;

  const linkingUri = Constants.linkingUri;
  const developmentUrl = linkingUri.match(/[?&]url=([^&]+)/)?.[1];
  if (!developmentUrl) return null;
  try {
    return new URL(decodeURIComponent(developmentUrl)).hostname;
  } catch {
    return null;
  }
}

export function resolveSupabaseUrl(value: string) {
  if (Platform.OS === 'web' || appEnvironment !== 'development') return value;
  return resolveDeviceDevelopmentUrl(value, metroHostname());
}

const url = resolveSupabaseUrl(resolvedUrl);

export const isSupabaseConfigured = Boolean(
  isStaging
    ? process.env.EXPO_PUBLIC_STAGING_SUPABASE_URL &&
        process.env.EXPO_PUBLIC_STAGING_SUPABASE_ANON_KEY
    : process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
);

export const supabase = createPublicSupabaseClient({
  url,
  anonKey: resolvedAnonKey,
  allowInsecureLocalNetwork: appEnvironment === 'development',
  storage: authStorage,
});

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
