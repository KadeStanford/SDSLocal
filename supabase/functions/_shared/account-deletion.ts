export const requiredDeletionPhrase = 'DELETE';

export interface StorageTarget {
  readonly bucket: 'business-media' | 'media-staging';
  readonly path: string;
}

export function bearerToken(header: string | null) {
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

export function parseDeletionConfirmation(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const body = value as Record<string, unknown>;
  return Object.keys(body).length === 1 && body.confirmation === requiredDeletionPhrase;
}

export function normalizeStorageTargets(value: unknown, userId: string) {
  if (!Array.isArray(value)) return [];
  const unique = new Map<string, StorageTarget>();
  for (const candidate of value) {
    if (!candidate || typeof candidate !== 'object') continue;
    const item = candidate as Record<string, unknown>;
    if (
      (item.bucket !== 'business-media' && item.bucket !== 'media-staging') ||
      typeof item.path !== 'string' ||
      item.path.length === 0 ||
      (item.bucket === 'media-staging' && !item.path.startsWith(`${userId}/`))
    ) {
      continue;
    }
    unique.set(`${item.bucket}:${item.path}`, {
      bucket: item.bucket,
      path: item.path,
    });
  }
  return [...unique.values()];
}

export function mergeStorageTargets(
  current: unknown,
  additions: readonly StorageTarget[],
  userId: string,
) {
  return normalizeStorageTargets(
    [...normalizeStorageTargets(current, userId), ...additions],
    userId,
  );
}

export function customerDeletionError(status: number) {
  if (status === 401) return 'Your session is invalid or expired. Please sign in again.';
  if (status === 400) return 'Type DELETE to confirm account deletion.';
  return 'Account deletion did not complete. Your account is still available. Please try again.';
}
