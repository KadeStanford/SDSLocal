import { describe, expect, it } from 'vitest';
import { themeColors, typography, minimumTouchTarget } from '@sds/design-tokens';
import {
  businessAssetPath,
  businessMonogram,
  logoAccessibilityLabel,
  logoImagePolicy,
  logoSource,
} from './business-identity';
import { bottomContentPadding, buttonPresentation, dataDisplayState } from './ui-presentation';
import {
  buildUpcomingEventItems,
  businessResultCountLabel,
  businessPageSectionOrder,
} from './discovery-core';

const photo = (role: string, status = 'ready', storage_path = `${role}.png`) => ({
  role,
  media_assets: { status, storage_path },
});

describe('business identity', () => {
  it('keeps cover and logo roles separate, skipping unavailable assets', () => {
    const photos = [
      photo('cover'),
      photo('logo', 'processing'),
      photo('logo', 'ready', 'brand/wide.png'),
    ];
    expect(businessAssetPath(photos, 'cover')).toBe('cover.png');
    expect(businessAssetPath(photos, 'logo')).toBe('brand/wide.png');
    expect(businessAssetPath([photo('cover')], 'logo')).toBeNull();
  });
  it('handles empty and array-shaped media relations', () => {
    expect(businessAssetPath(null, 'logo')).toBeNull();
    expect(businessAssetPath([{ role: 'logo', media_assets: null }], 'logo')).toBeNull();
    expect(
      businessAssetPath(
        [
          {
            role: 'logo',
            media_assets: [photo('logo', 'failed').media_assets, photo('logo').media_assets],
          },
        ],
        'logo',
      ),
    ).toBe('logo.png');
  });
  it('preserves signed/transformed URLs and falls back only for the failed source', () => {
    const uri = 'https://example.test/render/logo.png?token=abc&width=100';
    expect(logoSource(uri, null)).toBe(uri);
    expect(logoSource(uri, uri)).toBeNull();
    expect(logoSource(`${uri}&v=2`, uri)).toBe(`${uri}&v=2`);
    expect(logoSource('', null)).toBeNull();
  });
  it.each([
    ['Bayou & Bloom Cafe', 'BB'],
    ['  Café   Étoile ', 'CÉ'],
    ['一 店', '一店'],
    ['Bakery', 'B'],
    [' & ', ''],
  ])('creates a restrained monogram for %s', (name, expected) => {
    expect(businessMonogram(name)).toBe(expected);
  });
  it.each(['transparent', 'wide', 'tall', 'square'])(
    'contains the whole %s logo without crop or animated flash',
    () => {
      expect(logoImagePolicy).toEqual({
        contentFit: 'contain',
        cachePolicy: 'memory-disk',
        transition: 0,
      });
    },
  );
  it('labels standalone identity while hiding duplicate logo announcements', () => {
    expect(logoAccessibilityLabel('Bayou & Bloom')).toBe('Bayou & Bloom logo');
    expect(logoAccessibilityLabel('Bayou & Bloom', true)).toBeUndefined();
    expect(logoAccessibilityLabel('')).toBe('Business logo');
  });
  it('carries host photos into upcoming events without changing chronology', () => {
    const photos = [photo('logo')];
    const events = buildUpcomingEventItems(
      [
        {
          id: 'e',
          business_id: 'b',
          title: 'Brunch',
          starts_at: '2026-10-02T10:00:00Z',
          is_published: true,
          publish_at: null,
          archived_at: null,
        },
      ],
      [{ id: 'b', name: 'Cafe', business_photos: photos }],
      new Date('2026-10-01'),
    );
    expect(events[0]).toMatchObject({
      businessName: 'Cafe',
      businessPhotos: photos,
      title: 'Brunch',
    });
  });
});

function luminance(hex: string) {
  const rgb = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((value) => parseInt(value, 16) / 255)
    .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722;
}
function contrast(a: string, b: string) {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

describe.each(['light', 'dark'] as const)('%s design language', (scheme) => {
  const colors = themeColors[scheme];
  it('has matching semantic roles in both themes', () => {
    expect(Object.keys(themeColors.light).sort()).toEqual(Object.keys(themeColors.dark).sort());
    for (const role of [
      'background',
      'backgroundElement',
      'surfaceElevated',
      'backgroundSelected',
      'border',
      'divider',
      'text',
      'textSecondary',
      'textMuted',
      'accent',
      'accentPressed',
      'onAccent',
      'successText',
      'warningText',
      'destructive',
      'infoText',
      'backdrop',
      'skeleton',
    ])
      expect(colors).toHaveProperty(role);
  });
  it('meets normal-text contrast for semantic foreground/background pairs', () => {
    for (const surface of [colors.background, colors.backgroundElement, colors.surfaceElevated]) {
      for (const text of [
        colors.text,
        colors.textSecondary,
        colors.textMuted,
        colors.accent,
        colors.destructive,
      ])
        expect(contrast(text, surface)).toBeGreaterThanOrEqual(4.5);
    }
    for (const [foreground, background] of [
      [colors.onAccent, colors.accent],
      [colors.onAccent, colors.accentPressed],
      [colors.onAction, colors.actionPrimary],
      [colors.onAction, colors.actionPressed],
      [colors.successText, colors.successSurface],
      [colors.warningText, colors.warningSurface],
      [colors.errorText, colors.errorSurface],
      [colors.infoText, colors.infoSurface],
    ])
      expect(contrast(foreground!, background!)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.inputBorder, colors.backgroundElement)).toBeGreaterThanOrEqual(3);
  });
  it.each(['primary', 'secondary', 'tertiary', 'destructive'] as const)(
    'exposes %s action states without faded disabled text',
    (variant) => {
      const normal = buttonPresentation(colors, variant);
      expect(normal.disabled).toBe(false);
      const busy = buttonPresentation(colors, variant, false, true);
      expect(busy.accessibilityState).toEqual({ disabled: true, busy: true });
      const disabled = buttonPresentation(colors, variant, true);
      expect(disabled.disabled).toBe(true);
      expect(contrast(disabled.color, disabled.backgroundColor)).toBeGreaterThanOrEqual(4.5);
    },
  );
});

describe('layout and state rules', () => {
  it('uses safe area plus measured overlay plus buffer without a model-specific constant', () => {
    expect(bottomContentPadding(34, 72)).toBe(122);
    expect(bottomContentPadding(0, 0)).toBe(16);
    expect(bottomContentPadding(24, 0)).toBe(40);
    expect(bottomContentPadding(-5, -10)).toBe(16);
    expect(minimumTouchTarget).toBeGreaterThanOrEqual(44);
    expect(typography.body.fontSize).toBe(16);
  });
  it('does not show empty data while loading or replace retained content on refresh error', () => {
    expect(dataDisplayState(true, 0, null)).toBe('loading');
    expect(dataDisplayState(false, 0, null)).toBe('empty');
    expect(dataDisplayState(false, 0, 'offline')).toBe('error');
    expect(dataDisplayState(false, 3, 'offline')).toBe('content');
  });
  it('keeps result counts honest and preserves recent public-page ordering', () => {
    expect(businessResultCountLabel(1)).toBe('1 result');
    expect(businessResultCountLabel(7)).toBe('7 results');
    expect(businessResultCountLabel(0, true)).toBeNull();
    for (const type of ['food_drink', 'services', 'mobile']) {
      const order = businessPageSectionOrder(type);
      expect(order.indexOf('about')).toBeLessThan(order.indexOf('offerings'));
      expect(order.indexOf('events')).toBeLessThan(order.indexOf('rewards'));
    }
  });
});
