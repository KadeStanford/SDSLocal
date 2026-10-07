/** Billing expiry preserves existing obligations; moderation suspensions do not. */
export function businessAllowsObligationRecovery(
  business:
    | {
        status?: string;
        suspension_reason?: string | null;
        billing_suspension_previous_status?: string | null;
        approved_at?: string | null;
      }
    | null
    | undefined,
) {
  return (
    !!business &&
    (business.status === 'active' ||
      (business.status === 'suspended' &&
        business.suspension_reason === 'billing' &&
        business.billing_suspension_previous_status === 'active' &&
        !!business.approved_at))
  );
}
