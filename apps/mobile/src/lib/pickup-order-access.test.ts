import { readOrderAccess, saveOrderAccess } from './square-commerce';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));
vi.mock('expo-secure-store', () => ({ getItemAsync: vi.fn(), setItemAsync: vi.fn() }));
vi.mock('expo-crypto', () => ({
  getRandomBytesAsync: async () => new Uint8Array(32).fill(1),
  randomUUID: () => 'new-key',
}));
vi.mock('expo-web-browser', () => ({ openBrowserAsync: vi.fn(), dismissBrowser: vi.fn() }));
vi.mock('expo-linking', () => ({
  addEventListener: () => ({ remove: vi.fn() }),
  openURL: vi.fn(),
}));
vi.mock('./supabase', () => ({ supabase: {} }));

const first = {
  businessId: 'cafe',
  idempotencyKey: 'first-key',
  statusToken: 'a'.repeat(64),
  quoteId: 'quote',
  quoteExpiresAt: '2026-09-20T12:05:00Z',
};
describe('durable checkout recovery', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
  it('retains each business pending checkout key when another business opens', async () => {
    await saveOrderAccess(first);
    await saveOrderAccess({ ...first, businessId: 'other', idempotencyKey: 'other-key' });
    expect(await readOrderAccess(undefined, 'cafe')).toEqual(first);
    expect((await readOrderAccess())?.businessId).toBe('other');
    expect(await readOrderAccess(undefined, 'unknown')).toBeNull();
  });
  it('stores order-specific recovery independently of the current order', async () => {
    await saveOrderAccess({ ...first, orderId: 'order-a' });
    await saveOrderAccess({ ...first, businessId: 'other', orderId: 'order-b' });
    expect((await readOrderAccess('order-a'))?.businessId).toBe('cafe');
  });
  it('migrates older pending access with a one-time conservative wait', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-20T12:00:00Z'));
    const legacy = {
      businessId: 'cafe',
      idempotencyKey: 'old-key',
      statusToken: 'b'.repeat(64),
      quoteId: 'old-quote',
    };
    localStorage.setItem('sds.square.active-order', JSON.stringify(legacy));
    const saved = await readOrderAccess(undefined, 'cafe');
    expect(saved?.quoteExpiresAt).toBe('2026-09-20T12:06:00.000Z');
    vi.setSystemTime(new Date('2026-09-20T12:04:00Z'));
    expect((await readOrderAccess(undefined, 'cafe'))?.quoteExpiresAt).toBe(saved?.quoteExpiresAt);
    expect(saved?.idempotencyKey).toBe('old-key');
  });
  it('treats malformed storage as absent, without exposing its contents', async () => {
    localStorage.setItem('sds.square.active-order', 'invalid');
    expect(await readOrderAccess()).toBeNull();
    localStorage.setItem(
      'sds.square.active-order',
      JSON.stringify({ ...first, statusToken: 'invalid' }),
    );
    expect(await readOrderAccess()).toBeNull();
  });
});

it('indexes multiple guest orders without storing access proofs in the index', async () => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
  await saveOrderAccess({ ...first, orderId: 'guest-a' });
  await saveOrderAccess({ ...first, orderId: 'guest-b' });
  const { readGuestOrderAccess } = await import('./square-commerce');
  expect((await readGuestOrderAccess()).map((o) => o.orderId)).toEqual(['guest-b', 'guest-a']);
  expect(values.get('sds.square.guest-orders.v1')).not.toContain(first.statusToken);
  vi.unstubAllGlobals();
});

it('isolates account access from another signed-in customer and excludes it from guest history', async () => {
  const { supabase } = await import('./supabase');
  const getSession = vi.fn().mockResolvedValue({ data: { session: { user: { id: 'alice' } } } });
  Object.assign(supabase, { auth: { getSession } });
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
  await saveOrderAccess({ ...first, orderId: 'account-a', customerId: 'alice' });
  expect((await readOrderAccess('account-a'))?.orderId).toBe('account-a');
  getSession.mockResolvedValue({ data: { session: { user: { id: 'bob' } } } });
  expect(await readOrderAccess('account-a')).toBeNull();
  const { readGuestOrderAccess } = await import('./square-commerce');
  expect(await readGuestOrderAccess()).toEqual([]);
  vi.unstubAllGlobals();
});
