import { describe, expect, it } from 'vitest';
import { brandColor, readableTextColor } from './color-contrast';

describe('merchant color fields', () => {
  it('normalizes short, bare and padded hex colors and rejects invalid CSS', () => {
    expect(brandColor(' #abc ')).toBe('#aabbcc');
    expect(brandColor('E2B75E')).toBe('#E2B75E');
    expect(brandColor('transparent')).toBe('#176B4D');
    expect(brandColor('url(invalid)')).toBe('#176B4D');
  });
  it.each(['#71334D', '#E2B75E', '#254A78', '#ffffff', '#000000', '#888888'])(
    'keeps text readable on %s',
    (value) => {
      const hex = brandColor(value).slice(1);
      const linear = [0, 2, 4].map((index) => {
        const channel = parseInt(hex.slice(index, index + 2), 16) / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      const luminance = linear[0]! * 0.2126 + linear[1]! * 0.7152 + linear[2]! * 0.0722;
      const contrast =
        readableTextColor(value) === '#FFFFFF'
          ? 1.05 / (luminance + 0.05)
          : (luminance + 0.05) / 0.05;
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    },
  );
});
