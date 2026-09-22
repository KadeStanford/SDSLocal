export type DirectionsPlatform = 'ios' | 'android' | 'web';

export interface DirectionsLocation {
  readonly latitude?: number | null;
  readonly longitude?: number | null;
  readonly address?: string | null;
  readonly label?: string | null;
}

function validCoordinates(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
) {
  return (
    typeof latitude === 'number' &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === 'number' &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function normalizeWebsiteUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function buildDirectionsUrl(platform: DirectionsPlatform, location: DirectionsLocation) {
  const address = location.address?.trim() || null;
  const label = location.label?.trim() || address || 'Destination';
  const hasCoordinates = validCoordinates(location.latitude, location.longitude);
  if (!hasCoordinates && !address) return null;
  const destination = hasCoordinates
    ? `${location.latitude},${location.longitude}`
    : (address as string);

  if (platform === 'ios') {
    return `https://maps.apple.com/?daddr=${encodeURIComponent(destination)}&q=${encodeURIComponent(label)}`;
  }
  if (platform === 'android') {
    return hasCoordinates
      ? `geo:${location.latitude},${location.longitude}?q=${encodeURIComponent(`${destination}(${label})`)}`
      : `geo:0,0?q=${encodeURIComponent(address as string)}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}
