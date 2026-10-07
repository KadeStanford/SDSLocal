import { expect, it, vi } from 'vitest';
import { SquareService } from './square-service';
import { StripeService } from './stripe-service';
import {
  newPickupShortCode,
  normalizePickupShortCode,
  pickupShortCodeHash,
} from './pickup-short-code';

const business = '30000000-0000-4000-8000-000000000001';
const orderId = '20000000-0000-4000-8000-000000000001';
function fixture(provider: 'square' | 'stripe' = 'square') {
  let row: any = null;
  const upsert = vi.fn(async (value: any) => {
    row = value;
    return { data: null, error: null };
  });
  const eq = vi.fn();
  const db: any = {
    from: () => ({
      upsert,
      select: () => ({
        eq: (field: string, value: string) => {
          eq(field, value);
          return {
            maybeSingle: async () => ({ data: row?.[field] === value ? row : null, error: null }),
          };
        },
      }),
    }),
    rpc: vi.fn(async () => ({ data: { completed: true, alreadyConfirmed: false }, error: null })),
  };
  const service =
    provider === 'stripe' ? new StripeService(db, {} as never) : new SquareService(db, {} as never);
  vi.spyOn(service, 'operator').mockResolvedValue({ canRefund: false, canManage: false });
  vi.spyOn(service, 'rollout').mockResolvedValue(undefined);
  vi.spyOn(service, 'authorizeOrder').mockResolvedValue({
    id: orderId,
    business_id: business,
    status: 'ready',
    paid_at: '2026-09-29',
    square_payment_id: 'paid',
  });
  vi.spyOn(service, 'orderProjection').mockResolvedValue({ id: orderId });
  return {
    service,
    db,
    upsert,
    eq,
    get row() {
      return row;
    },
  };
}
it('generates unambiguous codes and accepts spoken groups in either case', () => {
  for (let i = 0; i < 100; i++) expect(newPickupShortCode()).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
  expect(normalizePickupShortCode('abcd-2345')).toBe('ABCD2345');
  expect(() => normalizePickupShortCode('123456')).toThrow();
  expect(() => normalizePickupShortCode('OOOO IIII')).toThrow();
});
it.each(['square', 'stripe'] as const)(
  '%s stores only a business-scoped hash and supports both preview and atomic confirmation',
  async (provider) => {
    const f = fixture(provider);
    const issued = await f.service.pickupCode(orderId, 'customer', null);
    expect(f.row.manual_hash).toBe(await pickupShortCodeHash(business, issued.manualCode));
    expect(JSON.stringify(f.row)).not.toContain(issued.manualCode);
    const spoken = issued.manualCode.slice(0, 4) + ' ' + issued.manualCode.slice(4);
    const preview = await f.service.pickupScan(business, 'staff', { code: spoken.toLowerCase() });
    expect(preview.order).toEqual({ id: orderId });
    expect(f.db.rpc).not.toHaveBeenCalled();
    await f.service.pickupScan(business, 'staff', { code: spoken, confirm: true });
    expect(f.db.rpc).toHaveBeenCalledWith('square_confirm_pickup', {
      p_order: orderId,
      p_actor: 'staff',
      p_business: business,
      p_hash: f.row.token_hash,
    });
  },
);
it('rejects wrong-business and rotated codes without exposing an order', async () => {
  const f = fixture();
  const first = await f.service.pickupCode(orderId, 'customer', null);
  await expect(
    f.service.pickupScan('40000000-0000-4000-8000-000000000001', 'staff', {
      code: first.manualCode,
      confirm: true,
    }),
  ).rejects.toMatchObject({ code: 'INVALID_PICKUP_CODE' });
  await f.service.pickupCode(orderId, 'customer', null);
  await expect(
    f.service.pickupScan(business, 'staff', { code: first.manualCode, confirm: true }),
  ).rejects.toMatchObject({ code: 'INVALID_PICKUP_CODE' });
  expect(f.db.rpc).not.toHaveBeenCalled();
});
it('rejects expired preview and checks staff access before looking up a code', async () => {
  const f = fixture();
  const issued = await f.service.pickupCode(orderId, 'customer', null);
  f.row.expires_at = '2000-01-01';
  await expect(
    f.service.pickupScan(business, 'staff', { code: issued.manualCode }),
  ).rejects.toMatchObject({ code: 'INVALID_PICKUP_CODE' });
  f.eq.mockClear();
  vi.mocked(f.service.operator).mockRejectedValue(new Error('Denied'));
  await expect(f.service.pickupScan(business, null, { code: issued.manualCode })).rejects.toThrow(
    'Denied',
  );
  expect(f.eq).not.toHaveBeenCalled();
});
it('retries collisions and fails closed if no unique code can be stored', async () => {
  const f = fixture();
  f.upsert.mockResolvedValue({
    data: null,
    error: { code: '23505', message: 'collision' },
  } as never);
  await expect(f.service.pickupCode(orderId, 'customer', null)).rejects.toMatchObject({
    code: 'PICKUP_CODE_BUSY',
  });
  expect(f.upsert).toHaveBeenCalledTimes(4);
});
