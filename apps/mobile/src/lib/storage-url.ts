import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

function isLoopback(hostname: string) {
  return hostname === 'localhost' || hostname === '::1' || hostname.startsWith('127.');
}

export function storagePublicUrl(storagePath: string) {
  const { data } = supabase.storage.from('business-media').getPublicUrl(storagePath);
  if (Platform.OS === 'web' || !__DEV__) return data.publicUrl;

  try {
    const url = new URL(data.publicUrl);
    if (!isLoopback(url.hostname)) return data.publicUrl;
    const metroHost = (Constants.expoConfig?.hostUri ?? Constants.linkingUri)
      ?.replace(/^\w+:\/\//, '')
      .split(':')[0];
    if (!metroHost || isLoopback(metroHost)) return data.publicUrl;
    url.hostname = metroHost;
    return url.toString();
  } catch {
    return data.publicUrl;
  }
}
