export const reportReasons = [
  { key: 'incorrect_information', label: 'Incorrect or misleading information' },
  { key: 'inappropriate_content', label: 'Inappropriate content' },
  { key: 'scam_or_impersonation', label: 'Scam or impersonation concern' },
  { key: 'appears_closed', label: 'Business appears closed' },
  { key: 'safety_concern', label: 'Safety concern' },
  { key: 'other', label: 'Other' },
] as const;

export type ReportReasonKey = (typeof reportReasons)[number]['key'];
export type ReportTarget =
  | { readonly type: 'business'; readonly businessId: string; readonly label: string }
  | {
      readonly type: 'event';
      readonly businessId: string;
      readonly eventId: string;
      readonly label: string;
    }
  | {
      readonly type: 'offering_item';
      readonly businessId: string;
      readonly offeringItemId: string;
      readonly label: string;
    };

export function createReportPayload(
  reporterId: string,
  target: ReportTarget,
  reason: ReportReasonKey,
  details: string,
) {
  const selectedReason = reportReasons.find((item) => item.key === reason);
  if (!selectedReason) throw new Error('Choose a report reason.');
  const trimmedDetails = details.trim();
  if (trimmedDetails.length > 2000)
    throw new Error('Report details must be 2,000 characters or less.');
  return {
    reporter_id: reporterId,
    target_type: target.type,
    business_id: target.type === 'business' ? target.businessId : null,
    event_id: target.type === 'event' ? target.eventId : null,
    offering_item_id: target.type === 'offering_item' ? target.offeringItemId : null,
    reason: selectedReason.label,
    details: trimmedDetails || null,
    status: 'open' as const,
  };
}

export function createBlockRow(customerId: string, businessId: string) {
  return { customer_id: customerId, business_id: businessId };
}

export function filterBlockedBusinesses<T extends { readonly id: string }>(
  businesses: readonly T[],
  blockedIds: ReadonlySet<string>,
) {
  return businesses.filter((business) => !blockedIds.has(business.id));
}

export function filterBlockedEvents<T extends { readonly business: { readonly id: string } }>(
  events: readonly T[],
  blockedIds: ReadonlySet<string>,
) {
  return events.filter((event) => !blockedIds.has(event.business.id));
}

export function removeBlockedBusinessId(blockedIds: ReadonlySet<string>, businessId: string) {
  const next = new Set(blockedIds);
  next.delete(businessId);
  return next;
}

export function customerAlertEntityKey(entityType: string, entityId: string) {
  return `${entityType}:${entityId}`;
}

export function filterBlockedCustomerAlerts<
  T extends { readonly entity_type: string; readonly entity_id: string },
>(
  alerts: readonly T[],
  blockedIds: ReadonlySet<string>,
  businessIdByEntity: ReadonlyMap<string, string>,
) {
  return alerts.filter((alert) => {
    if (alert.entity_type === 'account') return true;
    const businessId = businessIdByEntity.get(
      customerAlertEntityKey(alert.entity_type, alert.entity_id),
    );
    return !businessId || !blockedIds.has(businessId);
  });
}

export function shouldShowSafetyControls(preview: boolean, ownsBusiness: boolean) {
  return !preview && !ownsBusiness;
}

export function createSubmissionGuard() {
  let pending = false;
  return async function run<T>(operation: () => Promise<T>) {
    if (pending) return null;
    pending = true;
    try {
      return await operation();
    } finally {
      pending = false;
    }
  };
}
