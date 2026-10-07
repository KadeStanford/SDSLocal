import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ParishSplash } from './parish-splash';

const h = vi.hoisted(() => ({
  reduced: false as boolean | null,
  values: [false, false],
  index: 0,
  effects: [] as (() => void | (() => void))[],
  layout: undefined as undefined | (() => void),
  hide: vi.fn(async () => {}),
  callbacks: [] as ((done: boolean) => void)[],
}));
vi.mock('react', async () => ({
  ...(await vi.importActual<typeof import('react')>('react')),
  useState: () => {
    const index = h.index++;
    return [
      h.values[index],
      (value: boolean) => {
        h.values[index] = value;
      },
    ];
  },
  useEffect: (effect: () => void | (() => void)) => {
    h.effects.push(effect);
  },
}));
vi.mock('react-native', () => ({
  StyleSheet: { create: (styles: object) => styles },
  View: ({ children, onLayout }: { children: ReactNode; onLayout?: () => void }) => {
    if (onLayout) h.layout = onLayout;
    return createElement('div', null, children);
  },
}));
vi.mock('react-native-reanimated', () => ({
  default: {
    View: ({ children }: { children: ReactNode }) => createElement('div', null, children),
  },
  Easing: { cubic: () => {}, out: (value: unknown) => value },
  Keyframe: class {
    duration() {
      return this;
    }
    delay() {
      return this;
    }
    withCallback(callback: (done: boolean) => void) {
      h.callbacks.push(callback);
      return this;
    }
  },
}));
vi.mock('react-native-worklets', () => ({
  scheduleOnRN: (fn: (value: boolean) => void, value: boolean) => fn(value),
}));
vi.mock('expo-splash-screen', () => ({ hideAsync: h.hide }));
vi.mock('@/hooks/use-reduced-motion', () => ({ useReducedMotionPreference: () => h.reduced }));
vi.mock('./parish-brand', () => ({
  ParishMark: () => null,
  ParishPalette: { evergreen: '#102D25', ivory: '#F4F2E9', mint: '#89C9A2' },
}));
vi.mock('./themed-text', () => ({
  ThemedText: ({ children }: { children: ReactNode }) => createElement('span', null, children),
}));

function render() {
  h.index = 0;
  h.effects = [];
  return renderToStaticMarkup(<ParishSplash />);
}
beforeEach(() => {
  vi.useFakeTimers();
  h.values = [false, false];
  h.reduced = false;
  h.callbacks = [];
  h.layout = undefined;
  h.hide.mockReset().mockResolvedValue(undefined);
});
afterEach(() => vi.useRealTimers());

it('hands off from native splash after layout and exits when animation completes', async () => {
  expect(render()).toContain('Parish Pass');
  h.layout?.();
  await vi.runAllTicks();
  await Promise.resolve();
  await Promise.resolve();
  expect(h.hide).toHaveBeenCalledOnce();
  expect(h.values[0]).toBe(true);
  render();
  expect(h.callbacks).toHaveLength(1);
  h.callbacks[0]?.(true);
  expect(render()).toBe('');
});
it('removes an interrupted overlay using its bounded fallback', () => {
  h.values[0] = true;
  render();
  const cleanups = h.effects.map((effect) => effect());
  vi.advanceTimersByTime(1650);
  expect(render()).toBe('');
  cleanups.forEach((cleanup) => cleanup?.());
});
it('skips animation for Reduce Motion', () => {
  h.values[0] = true;
  h.reduced = true;
  expect(render()).toBe('');
  expect(h.callbacks).toHaveLength(0);
});
it('does not wait indefinitely for an unresolved accessibility preference', () => {
  h.values[0] = true;
  h.reduced = null;
  render();
  h.effects.forEach((effect) => effect());
  vi.advanceTimersByTime(200);
  expect(render()).toBe('');
  expect(h.callbacks).toHaveLength(0);
});
it('continues startup if native hide rejects', async () => {
  h.hide.mockRejectedValue(new Error('already hidden'));
  render();
  h.layout?.();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  expect(h.values[0]).toBe(true);
});
