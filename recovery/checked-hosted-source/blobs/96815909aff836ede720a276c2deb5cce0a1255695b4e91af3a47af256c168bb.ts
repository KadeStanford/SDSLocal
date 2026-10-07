import { fail } from './square-security.ts';
type Row = Record<string, any>;

/** Fulfillment is preserved separately while provider money is under review. */
export function moneyPatch(
  order: Row,
  refunded: number,
  pending = false,
  dispute?: { id: string; state: string; amount?: number },
  now = new Date().toISOString(),
) {
  const total = Number(order.total_minor);
  if (!Number.isSafeInteger(refunded) || refunded < 0 || refunded > total)
    fail('REFUND_MISMATCH', 'The provider refund total needs review.', 409);
  const patch: Row = { refunded_minor: Math.max(Number(order.refunded_minor ?? 0), refunded) };
  if (dispute)
    Object.assign(patch, {
      dispute_id: dispute.id,
      dispute_state: dispute.state,
      disputed_minor: dispute.amount ?? order.disputed_minor ?? total,
    });
  const disputeState = dispute?.state ?? order.dispute_state;
  if (refunded < total && disputeState && !['WON', 'RESOLVED'].includes(disputeState)) {
    return {
      ...patch,
      status: disputeState === 'LOST' ? 'dispute_lost' : 'payment_review',
      provider_status: disputeState === 'LOST' ? 'DISPUTE_LOST' : 'PAYMENT_DISPUTED',
      checkout_url: null,
    };
  }
  if (refunded === total)
    return {
      ...patch,
      status: 'refunded',
      refunded_at: order.refunded_at ?? now,
      checkout_url: null,
      provider_status: 'REFUND_SUCCEEDED',
    };
  if (pending)
    return {
      ...patch,
      status: 'refund_pending',
      checkout_url: null,
      provider_status: 'REFUND_PENDING',
    };
  if (refunded > Number(order.reviewed_refunded_minor ?? 0))
    return {
      ...patch,
      status: 'payment_review',
      checkout_url: null,
      provider_status: 'PARTIAL_REFUND',
    };
  if (
    dispute &&
    ['WON', 'RESOLVED'].includes(dispute.state) &&
    ['PAYMENT_DISPUTED', 'DISPUTE_LOST'].includes(order.provider_status)
  )
    return {
      ...patch,
      status: order.payment_resume_status ?? (order.completed_at ? 'completed' : 'placed'),
      provider_status: 'DISPUTE_RESOLVED',
    };
  return patch;
}

export function squareRefundTotal(order: Row, payment: Row, refunds: Row[]) {
  if (
    payment.id !== order.square_payment_id ||
    payment.total_money?.amount !== Number(order.total_minor) ||
    payment.total_money?.currency !== order.currency
  )
    fail('PAYMENT_MISMATCH', 'The provider payment needs review.', 409);
  let refunded = 0;
  let pending = false;
  let pendingRefund: Row | undefined;
  const seen = new Set<string>();
  for (const refund of refunds) {
    if (seen.has(refund.id)) continue;
    seen.add(refund.id);
    if (
      refund.payment_id !== payment.id ||
      refund.amount_money?.currency !== order.currency ||
      !Number.isSafeInteger(refund.amount_money?.amount) ||
      refund.amount_money.amount < 1 ||
      !['COMPLETED', 'PENDING', 'FAILED', 'REJECTED'].includes(refund.status)
    )
      fail('REFUND_MISMATCH', 'The provider refund needs review.', 409);
    if (refund.status === 'COMPLETED') refunded += refund.amount_money.amount;
    if (refund.status === 'PENDING') {
      pending = true;
      pendingRefund = refund;
    }
  }
  return {
    ...moneyPatch(order, refunded, pending),
    ...(pendingRefund
      ? {
          square_refund_id: pendingRefund.id,
          refund_amount_minor: pendingRefund.amount_money.amount,
        }
      : {}),
  };
}
