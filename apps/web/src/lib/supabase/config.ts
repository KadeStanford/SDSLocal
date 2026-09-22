export function getSupabaseConfig() {
  const isStaging = process.env.NEXT_PUBLIC_APP_ENV === 'staging';
  const publicUrl = isStaging
    ? process.env.NEXT_PUBLIC_STAGING_SUPABASE_URL
    : process.env.NEXT_PUBLIC_SUPABASE_URL;
  // The internal Kong URL is only valid for the local Supabase stack. When
  // this web container is pointed at staging, server components must use the
  // hosted staging URL instead of silently reading the local database.
  const url =
    typeof window === 'undefined' && !isStaging
      ? (process.env.SUPABASE_INTERNAL_URL ?? publicUrl)
      : publicUrl;
  const key = isStaging
    ? process.env.NEXT_PUBLIC_STAGING_SUPABASE_PUBLISHABLE_KEY
    : (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
  }

  return { url, key };
}

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}

function isLoopbackHost(hostname: string) {
  return /^(localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0|\[::1\])$/i.test(hostname);
}

/** Base URL for links that must open on another device (invite/share links). */
export function getShareSiteUrl() {
  const candidates = [process.env.NEXT_PUBLIC_SHARE_BASE_URL, process.env.NEXT_PUBLIC_SITE_URL];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const parsed = new URL(candidate);
      if (
        (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
        !isLoopbackHost(parsed.hostname)
      ) {
        return candidate;
      }
    } catch {
      // Continue to the next configured URL.
    }
  }

  const hostIp = process.env.EXPO_HOST_IP;
  if (hostIp && !isLoopbackHost(hostIp)) return `http://${hostIp}:3000`;
  throw new Error(
    'A reachable LAN or public share URL is required; refusing to generate localhost links.',
  );
}
