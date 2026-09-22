import { describe, expect, it, vi } from 'vitest';

import {
  createBlockRow,
  createReportPayload,
  createSubmissionGuard,
  customerAlertEntityKey,
  filterBlockedCustomerAlerts,
  filterBlockedBusinesses,
  filterBlockedEvents,
  removeBlockedBusinessId,
  shouldShowSafetyControls,
} from './customer-safety-core';

const userId = '90000000-0000-4000-8000-000000000003';
const businessId = '11111111-1111-4111-8111-111111111111';
const targetId = '22222222-2222-4222-8222-222222222222';

describe('customer reports and blocks', () => {
  it.each([
    [
      { type: 'business' as const, businessId, label: 'Bayou & Bloom' },
      { target_type: 'business', business_id: businessId, event_id: null, offering_item_id: null },
    ],
    [
      { type: 'event' as const, businessId, eventId: targetId, label: 'Coffee flight' },
      { target_type: 'event', business_id: null, event_id: targetId, offering_item_id: null },
    ],
    [
      { type: 'offering_item' as const, businessId, offeringItemId: targetId, label: 'Latte' },
      {
        target_type: 'offering_item',
        business_id: null,
        event_id: null,
        offering_item_id: targetId,
      },
    ],
  ])('creates a valid report payload for each target', (target, expected) => {
    expect(createReportPayload(userId, target, 'safety_concern', 'Details')).toMatchObject({
      reporter_id: userId,
      reason: 'Safety concern',
      details: 'Details',
      status: 'open',
      ...expected,
    });
  });

  it('creates current-customer block rows and filters businesses and events', () => {
    expect(createBlockRow(userId, businessId)).toEqual({
      customer_id: userId,
      business_id: businessId,
    });
    const blocked = new Set([businessId]);
    expect(filterBlockedBusinesses([{ id: businessId }, { id: targetId }], blocked)).toEqual([
      { id: targetId },
    ]);
    expect(
      filterBlockedEvents(
        [
          { id: 'one', business: { id: businessId } },
          { id: 'two', business: { id: targetId } },
        ],
        blocked,
      ),
    ).toEqual([{ id: 'two', business: { id: targetId } }]);
  });

  it('prevents a second report submission while the first is pending', async () => {
    const guard = createSubmissionGuard();
    let resolveFirst!: (value: string) => void;
    const first = guard(() => new Promise<string>((resolve) => (resolveFirst = resolve)));
    const duplicate = guard(vi.fn(async () => 'duplicate'));
    await expect(duplicate).resolves.toBeNull();
    resolveFirst('sent');
    await expect(first).resolves.toBe('sent');
  });

  it('suppresses ordinary safety controls on owner previews', () => {
    expect(shouldShowSafetyControls(false, false)).toBe(true);
    expect(shouldShowSafetyControls(true, false)).toBe(false);
    expect(shouldShowSafetyControls(false, true)).toBe(false);
  });

  it('restores discovery eligibility when a business is unblocked', () => {
    const blocked = new Set([businessId]);
    const afterUnblock = removeBlockedBusinessId(blocked, businessId);
    expect(afterUnblock.has(businessId)).toBe(false);
    expect(filterBlockedBusinesses([{ id: businessId }], afterUnblock)).toEqual([
      { id: businessId },
    ]);
  });

  it('filters alerts belonging to blocked businesses while retaining account alerts', () => {
    const alerts = [
      { entity_type: 'event', entity_id: 'event-one' },
      { entity_type: 'business_update', entity_id: 'update-one' },
      { entity_type: 'account', entity_id: 'account-one' },
    ];
    const entityBusinesses = new Map([
      [customerAlertEntityKey('event', 'event-one'), businessId],
      [customerAlertEntityKey('business_update', 'update-one'), targetId],
    ]);
    expect(filterBlockedCustomerAlerts(alerts, new Set([businessId]), entityBusinesses)).toEqual([
      { entity_type: 'business_update', entity_id: 'update-one' },
      { entity_type: 'account', entity_id: 'account-one' },
    ]);
  });
});
