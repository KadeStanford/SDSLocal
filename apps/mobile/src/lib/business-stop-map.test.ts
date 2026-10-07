import { describe, expect, it } from 'vitest';
import { groupMapStops, stopMapCamera } from './business-stop-map';
const stop = (latitude: number, longitude: number, id = 'stop') => ({
  id,
  title: id,
  latitude,
  longitude,
});
describe('mobile stop map', () => {
  it('groups repeat visits without losing their count', () => {
    const groups = groupMapStops([
      stop(30.5059, -90.4742),
      stop(30.5059, -90.4742, 'return'),
      stop(30.508, -90.48, 'market'),
      stop(NaN, 0),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0]?.visits).toBe(2);
  });
  it('centers on all locations, not the first stop, and zooms out for distant stops', () => {
    const nearby = stopMapCamera([stop(30.5059, -90.4742), stop(30.508, -90.48)]);
    const spread = stopMapCamera([stop(30.5059, -90.4742), stop(31.8, -91.5)]);
    expect(nearby.coordinates.longitude).toBeCloseTo(-90.4771);
    expect(spread.coordinates.latitude).toBeGreaterThan(31);
    expect(spread.zoom).toBeLessThan(nearby.zoom);
  });
  it('keeps a useful zoom for repeat visits and handles the date line', () => {
    expect(stopMapCamera([stop(30, -90), stop(30, -90)]).zoom).toBe(14);
    const camera = stopMapCamera([stop(0, 179.8), stop(0, -179.8)]);
    expect(Math.abs(camera.coordinates.longitude)).toBeCloseTo(180);
    expect(camera.zoom).toBeGreaterThan(7);
  });
});
