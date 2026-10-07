import { describe, expect, it, vi } from 'vitest';
import { requireBusinessFeature, requireCommerceSetupFeature } from './business-feature-access';

const businessId = '00000000-0000-4000-8000-000000000001';
describe('commerce subscription boundary', () => {
  it('uses the business identifier, not a caller-provided plan', async () => {
    const db = { rpc: vi.fn().mockResolvedValue({ error: null }) };
    await requireCommerceSetupFeature(db, { action: 'settings', businessId, plan: 'pro' });
    expect(db.rpc).toHaveBeenCalledWith('assert_business_feature', {
      p_business_id: businessId,
      p_feature: 'pickup_ordering',
    });
  });
  it('distinguishes a denied feature from failed verification', async () => {
    const db = {
      rpc: vi.fn().mockResolvedValue({ error: { details: 'BUSINESS_FEATURE_REQUIRED' } }),
    };
    await expect(requireBusinessFeature(db, businessId, 'pickup_ordering')).rejects.toMatchObject({
      status: 403,
      code: 'BUSINESS_FEATURE_REQUIRED',
    });
    db.rpc.mockResolvedValue({ error: { code: 'PGRST202' } });
    await expect(requireBusinessFeature(db, businessId, 'pickup_ordering')).rejects.toMatchObject({
      status: 503,
    });
  });
  it.each([
    'refund',
    'disconnect',
    'resume',
    'resume_payment',
    'status',
    'queue',
    'order_action',
    'appointment_customer_reschedule',
    'appointment_owner_refund',
    'appointment_owner_action',
    'appointment_owner_setup',
    'customer_order_request',
  ])('does not lock existing obligations behind %s checks', async (action) => {
    const db = { rpc: vi.fn() };
    await requireCommerceSetupFeature(db, { action, businessId });
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it('checks appointment configuration against appointment access', async () => {
    const db = { rpc: vi.fn().mockResolvedValue({ error: null }) };
    await requireCommerceSetupFeature(db, { action: 'appointment_owner_setup_save', businessId });
    expect(db.rpc).toHaveBeenCalledWith('assert_business_feature', {
      p_business_id: businessId,
      p_feature: 'appointments',
    });
  });
});
