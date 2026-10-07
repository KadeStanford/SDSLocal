import { afterEach, expect, it, vi } from 'vitest';
import { readGuestOrderAccess } from './square-commerce';

vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));
vi.mock('expo-secure-store', () => ({ getItemAsync: vi.fn(), setItemAsync: vi.fn() }));
vi.mock('expo-crypto', () => ({ getRandomBytesAsync: vi.fn() }));
vi.mock('expo-web-browser', () => ({ openBrowserAsync: vi.fn() }));
vi.mock('expo-linking', () => ({ addEventListener: vi.fn() }));
vi.mock('./supabase', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: null } }) } },
}));

const access = {
  businessId: 'local-cafe',
  idempotencyKey: 'local-key',
  statusToken: 'a'.repeat(64),
  orderId: 'guest-order',
};
afterEach(() => vi.unstubAllGlobals());

it('treats a malformed guest index as absent when the active checkout has no order yet', async () => {
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => (key === 'sds.square.guest-orders.v1' ? '{broken' : null),
  });
  await expect(readGuestOrderAccess()).resolves.toEqual([]);
});

it('recovers the recent guest proof when the index store cannot be read or repaired', async () => {
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => {
      if (key === 'sds.square.guest-orders.v1') throw new Error('Index unavailable');
      return key === 'sds.square.active-order' ? JSON.stringify(access) : null;
    },
    setItem: () => {
      throw new Error('Index write unavailable');
    },
  });
  await expect(readGuestOrderAccess()).resolves.toEqual([access]);
});

it('does not promote an indexed account proof or a malformed proof into guest access', async () => {
  const values = new Map([
    ['sds.square.guest-orders.v1', JSON.stringify(['account-order', 'invalid-order'])],
    [
      'sds.square.active-order.account-order',
      JSON.stringify({ ...access, orderId: 'account-order', customerId: 'another-account' }),
    ],
    [
      'sds.square.active-order.invalid-order',
      JSON.stringify({ ...access, orderId: 'invalid-order', statusToken: 'invalid' }),
    ],
  ]);
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null });
  await expect(readGuestOrderAccess()).resolves.toEqual([]);
});
