import { describe, expect, it } from 'vitest';
import { notificationAudience, splitNotificationAlerts } from './notification-audience';

describe('notification audience grouping', () => {
  it('uses the explicit order audience for pickup alerts', () => {
    expect(
      notificationAudience({
        entity_type: 'pickup_order',
        order_audience: 'customer',
        url: '/order?orderId=one',
      }),
    ).toBe('customer');
    expect(
      notificationAudience({
        entity_type: 'pickup_order',
        order_audience: 'business',
        url: '/pickup-order?orderId=one',
      }),
    ).toBe('business');
  });

  it('keeps older business order rows grouped by their route', () => {
    expect(
      notificationAudience({ entity_type: 'pickup_order', url: '/pickup-order?orderId=one' }),
    ).toBe('business');
    expect(notificationAudience({ entity_type: 'pickup_order', url: '/order?orderId=one' })).toBe(
      'customer',
    );
  });

  it('groups non-order alerts as customer alerts', () => {
    const groups = splitNotificationAlerts([
      { entity_type: 'event', url: '/notification?type=event' },
      { entity_type: 'pickup_order', order_audience: 'business' },
      { entity_type: 'loyalty_membership' },
    ]);
    expect(groups.customer).toHaveLength(2);
    expect(groups.business).toHaveLength(1);
  });
});
