import { describe, expect, it, vi } from 'vitest';
import { SquareService } from './square-service';
import { hash } from './square-security';
import { pickupShortCodeHash } from './pickup-short-code';

const orderId = '20000000-0000-4000-8000-000000000001';
const businessId = '30000000-0000-4000-8000-000000000001';
const token = 'a'.repeat(64);
function fixture() {
  const writes = vi.fn(async () => ({ data: null, error: null }));
  const rpc = vi.fn(async () => ({ data: { completed: true }, error: null }));
  const service = new SquareService(
    { from: () => ({ upsert: writes }), rpc } as never,
    {} as never,
  );
  vi.spyOn(service, 'rollout').mockResolvedValue(undefined);
  vi.spyOn(service, 'operator').mockResolvedValue({ canRefund: false, canManage: false });
  vi.spyOn(service, 'authorizeOrder').mockResolvedValue({
    id: orderId,
    business_id: businessId,
    status: 'ready',
    paid_at: '2026-09-20',
    square_payment_id: 'payment',
  });
  return { service, writes, rpc };
}
describe('pickup QR boundary', () => {
  it('stores only a hash and issues a short-lived pickup-only secret after customer authorization', async () => {
    const { service, writes } = fixture();
    const result = await service.pickupCode(orderId, 'customer', token);
    expect(service.authorizeOrder).toHaveBeenCalledWith(orderId, 'customer', token);
    const parts = result.code.split(':');
    expect(parts.slice(0, 2)).toEqual(['sds-pickup', orderId]);
    expect(parts[2]).toMatch(/^[a-f0-9]{64}$/);
    expect(writes).toHaveBeenCalledWith({
      order_id: orderId,
      token_hash: await hash(parts[2]!),
      manual_hash: await pickupShortCodeHash(businessId, result.manualCode),
      expires_at: result.expiresAt,
    });
    expect(Date.parse(result.expiresAt) - Date.now()).toBeLessThanOrEqual(300000);
    expect(result.code).not.toContain(token);
  });
  it.each(['placed', 'preparing', 'completed', 'refunded', 'checkout_pending'])(
    'does not issue a code for %s',
    async (status) => {
      const { service, writes } = fixture();
      vi.mocked(service.authorizeOrder).mockResolvedValue({
        business_id: businessId,
        status,
        paid_at: 'paid',
        square_payment_id: 'payment',
      });
      await expect(service.pickupCode(orderId, 'customer', token)).rejects.toMatchObject({
        code: 'PICKUP_NOT_READY',
      });
      expect(writes).not.toHaveBeenCalled();
    },
  );
  it('does not issue a secret when customer access fails', async () => {
    const { service, writes } = fixture();
    vi.mocked(service.authorizeOrder).mockRejectedValue(new Error('Denied'));
    await expect(service.pickupCode(orderId, 'other', null)).rejects.toThrow('Denied');
    expect(writes).not.toHaveBeenCalled();
  });
  it('rejects reward QR payloads and anonymous/cross-business staff before committing', async () => {
    const { service, rpc } = fixture();
    await expect(
      service.pickupScan(businessId, 'staff', { code: 'eyJ.loyalty.signature', confirm: true }),
    ).rejects.toThrow();
    vi.mocked(service.operator).mockRejectedValue(new Error('Staff required'));
    await expect(
      service.pickupScan(businessId, null, {
        code: `sds-pickup:${orderId}:${token}`,
        confirm: true,
      }),
    ).rejects.toThrow('Staff required');
    expect(rpc).not.toHaveBeenCalled();
  });
  it('passes only verified staff identity and a hashed code to the atomic transaction', async () => {
    const { service, rpc } = fixture();
    await service.pickupScan(businessId, 'verified-staff', {
      code: `sds-pickup:${orderId}:${token}`,
      confirm: true,
      userId: 'forged',
      points: 100000,
    });
    expect(rpc).toHaveBeenCalledExactlyOnceWith('square_confirm_pickup', {
      p_order: orderId,
      p_actor: 'verified-staff',
      p_business: businessId,
      p_hash: await hash(token),
    });
  });
  it('blocks the old completion shortcut so pickup cannot bypass confirmation', async () => {
    const { service, rpc } = fixture();
    await expect(
      service.orderAction(orderId, 'staff', { next: 'completed', version: 1 }),
    ).rejects.toMatchObject({ code: 'PICKUP_CODE_REQUIRED' });
    expect(rpc).not.toHaveBeenCalled();
  });
});
