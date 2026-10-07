const loopbackHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

export const publicSharingUnavailableCopy = {
  title: 'Public sharing is temporarily unavailable',
  body: 'Try again later. Parish Pass needs a secure public business link before QR materials can be created.',
} as const;

export function normalizePublicBaseUrl(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.toLowerCase();
    if (
      url.protocol !== 'https:' ||
      loopbackHosts.has(hostname) ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local')
    ) {
      return null;
    }
    return url.toString().replace(/\/+$/, '');
  } catch {
    return null;
  }
}

/** A shareable URL must be reachable from another device; never emit localhost links. */
export function publicShareBaseUrl() {
  return (
    normalizePublicBaseUrl(process.env.EXPO_PUBLIC_SHARE_BASE_URL) ??
    normalizePublicBaseUrl(process.env.EXPO_PUBLIC_SITE_URL)
  );
}

export function buildBusinessPublicUrl(slug: string, baseUrl: string | null) {
  if (!baseUrl || !slug.trim()) return null;
  return `${baseUrl}/b/${encodeURIComponent(slug.trim())}`;
}

export function getBusinessPublicLinkState(slug: string, baseUrl: string | null) {
  const url = buildBusinessPublicUrl(slug, baseUrl);
  return url
    ? ({ available: true, url } as const)
    : ({ available: false, ...publicSharingUnavailableCopy } as const);
}

export function businessPublicUrl(slug: string) {
  return buildBusinessPublicUrl(slug, publicShareBaseUrl());
}
