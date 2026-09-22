export interface IdentityPhoto {
  readonly role: string;
  readonly media_assets:
    | { readonly storage_path: string; readonly status: string }
    | readonly { readonly storage_path: string; readonly status: string }[]
    | null;
}

/** Select only a ready asset of the requested role; a cover is never a logo. */
export function businessAssetPath(
  photos: readonly IdentityPhoto[] | null | undefined,
  role: 'logo' | 'cover',
): string | null {
  for (const photo of photos ?? []) {
    if (photo.role !== role) continue;
    const assets = Array.isArray(photo.media_assets) ? photo.media_assets : [photo.media_assets];
    const asset = assets.find((item) => item?.status === 'ready' && item.storage_path.trim());
    if (asset) return asset.storage_path;
  }
  return null;
}

export function businessMonogram(name: string): string {
  const words = name
    .trim()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => Array.from(word)[0])
    .join('')
    .toLocaleUpperCase();
}

export function logoAccessibilityLabel(name: string, decorative = false) {
  return decorative ? undefined : `${name.trim() || 'Business'} logo`;
}

export function logoSource(uri: string | null | undefined, failedUri: string | null) {
  const source = uri?.trim() || null;
  return source && source !== failedUri ? source : null;
}

export const logoImagePolicy = {
  contentFit: 'contain',
  cachePolicy: 'memory-disk',
  transition: 0,
} as const;
