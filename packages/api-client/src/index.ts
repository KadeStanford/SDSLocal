import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface PublicSupabaseConfig {
  readonly url: string;
  readonly anonKey: string;
  readonly allowInsecureLocalNetwork?: boolean;
}

function isLoopbackHost(hostname: string) {
  return hostname === 'localhost' || hostname === '::1' || hostname.startsWith('127.');
}

/**
 * Replaces a computer-only loopback hostname with the LAN hostname supplied by
 * the native development runtime. Production and already-routable URLs are left alone.
 */
export function resolveDeviceDevelopmentUrl(value: string, deviceHost: string | null) {
  try {
    const parsed = new URL(value);
    if (!isLoopbackHost(parsed.hostname) || !deviceHost || isLoopbackHost(deviceHost)) return value;
    parsed.hostname = deviceHost;
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return value;
  }
}

function isPrivateNetworkHost(hostname: string) {
  if (isLoopbackHost(hostname)) return true;

  const octets = hostname.split('.').map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet))) return false;

  const [first, second] = octets as [number, number, number, number];
  return (
    first === 10 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

export function createPublicSupabaseClient(config: PublicSupabaseConfig): SupabaseClient {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(config.url);
  } catch {
    throw new Error('Supabase URL must be a valid HTTP or HTTPS URL.');
  }

  const secure = parsedUrl.protocol === 'https:';
  const localDevelopment =
    parsedUrl.protocol === 'http:' &&
    isPrivateNetworkHost(parsedUrl.hostname) &&
    (parsedUrl.hostname === 'localhost' ||
      parsedUrl.hostname === '::1' ||
      parsedUrl.hostname.startsWith('127.') ||
      config.allowInsecureLocalNetwork === true);

  if (!secure && !localDevelopment) {
    throw new Error('Supabase URL must use HTTPS outside local development.');
  }

  return createClient(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}
