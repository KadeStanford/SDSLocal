export type AlertAudience = 'customer' | 'business';

export interface AlertAudienceRow {
  readonly entity_type: string;
  readonly order_audience?: AlertAudience | null;
  readonly url?: string | null;
}

/**
 * Pickup notifications carry an explicit audience from the server. The URL
 * fallback keeps older inbox rows grouped correctly while they age out.
 * Events, rewards, and followed-business updates are customer-facing alerts.
 */
export function notificationAudience(row: AlertAudienceRow): AlertAudience {
  if (
    row.entity_type === 'pickup_order' &&
    (row.order_audience === 'business' || row.url?.startsWith('/pickup-order?'))
  ) {
    return 'business';
  }
  if (row.entity_type === 'service_request' && row.url?.startsWith('/service-requests?')) {
    return 'business';
  }
  return 'customer';
}

export function splitNotificationAlerts<T extends AlertAudienceRow>(rows: readonly T[]) {
  return rows.reduce(
    (groups, row) => {
      groups[notificationAudience(row)].push(row);
      return groups;
    },
    { customer: [] as T[], business: [] as T[] },
  );
}
