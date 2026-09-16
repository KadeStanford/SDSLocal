import 'react-native-url-polyfill/auto';
import 'expo-sqlite/localStorage/install';

import { createPublicSupabaseClient, resolveDeviceDevelopmentUrl } from '@sds/api-client';
import Constants from 'expo-constants';
import { AppState, Platform } from 'react-native';

const configuredUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'local-build-placeholder-key';

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
  if (Platform.OS === 'web' || process.env.EXPO_PUBLIC_APP_ENV !== 'development') return value;
  return resolveDeviceDevelopmentUrl(value, metroHostname());
}

const url = resolveSupabaseUrl(configuredUrl);

export const isSupabaseConfigured = Boolean(
  process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
);

export const supabase = createPublicSupabaseClient({
  url,
  anonKey,
  allowInsecureLocalNetwork: process.env.EXPO_PUBLIC_APP_ENV === 'development',
});

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
