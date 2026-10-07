import type { BusinessLocationMapStop } from '@/components/business-location-map';
export function groupMapStops(stops: readonly BusinessLocationMapStop[]) {
  const groups = new Map<string, BusinessLocationMapStop & { visits: number }>();
  for (const stop of stops) {
    if (
      !Number.isFinite(stop.latitude) ||
      Math.abs(stop.latitude) > 90 ||
      !Number.isFinite(stop.longitude) ||
      Math.abs(stop.longitude) > 180
    )
      continue;
    const key = `${stop.latitude.toFixed(5)},${stop.longitude.toFixed(5)}`;
    const existing = groups.get(key);
    if (existing) existing.visits++;
    else groups.set(key, { ...stop, visits: 1 });
  }
  return [...groups.values()];
}
/** Web Mercator bounds with padding for a compact 190px map; handles the date line. */
export function stopMapCamera(
  stops: readonly Pick<BusinessLocationMapStop, 'latitude' | 'longitude'>[],
) {
  if (!stops.length) return { coordinates: { latitude: 30.5044, longitude: -90.4809 }, zoom: 12 };
  const lats = stops.map((stop) => Math.max(-85, Math.min(85, stop.latitude)));
  const lngs = stops.map((stop) => (stop.longitude + 360) % 360).sort((a, b) => a - b);
  let gap = -1,
    start = 0;
  for (let i = 0; i < lngs.length; i++) {
    const next = i === lngs.length - 1 ? lngs[0]! + 360 : lngs[i + 1]!;
    if (next - lngs[i]! > gap) {
      gap = next - lngs[i]!;
      start = next % 360;
    }
  }
  const lngSpan = 360 - gap;
  const mercator = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  const minY = mercator(Math.min(...lats)),
    maxY = mercator(Math.max(...lats));
  const latitude = ((2 * Math.atan(Math.exp((minY + maxY) / 2)) - Math.PI / 2) * 180) / Math.PI;
  const longitude = ((start + lngSpan / 2 + 180) % 360) - 180;
  const fraction = Math.max(lngSpan / 360, (maxY - minY) / (2 * Math.PI), 0.00001);
  const zoom = Math.max(1, Math.min(14, Math.log2(130 / (256 * fraction))));
  return { coordinates: { latitude, longitude }, zoom };
}
