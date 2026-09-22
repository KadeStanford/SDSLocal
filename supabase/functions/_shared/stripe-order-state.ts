import { fail } from './square-security.ts';

type Row = Record<string, any>;

export function stripeSessionPatch(order: Row, session: Row, now = new Date().toISOString()): Row {
  if (
    session.livemode !== false ||
    session.id !== order.square_order_id ||
    session.client_reference_id !== order.id ||
    session.metadata?.sds_order_id !== order.id
  )
    fail('PAYMENT_MISMATCH', 'Stripe checkout does not match this test order.', 409);
  // Replayed and out-of-order provider events must never undo kitchen or handoff progress.
  if (order.status !== 'checkout_pending') return {};
  if (session.payment_status === 'paid') {
    const payment = session.payment_intent;
    if (
      session.amount_total !== Number(order.total_minor) ||
      String(session.currency).toUpperCase() !== order.currency ||
      !payment?.id ||
      payment.status !== 'succeeded' ||
      payment.amount_received !== Number(order.total_minor)
    )
      return { status: 'payment_review', provider_status: 'PAYMENT_MISMATCH' };
    return {
      status: 'placed',
      square_payment_id: payment.id,
      paid_at: now,
      provider_status: 'PAID',
    };
  }
  if (session.status === 'expired')
    return { status: 'checkout_expired', checkout_url: null, provider_status: 'EXPIRED' };
  return {};
}

export function stripeRefundPatch(order: Row, refund: Row, now = new Date().toISOString()): Row {
  if (
    refund.payment_intent !== order.square_payment_id ||
    refund.amount !== Number(order.total_minor) ||
    String(refund.currency).toUpperCase() !== order.currency
  )
    fail('REFUND_MISMATCH', 'Stripe refund does not match this order.', 409);
  return {
    status:
      refund.status === 'succeeded'
        ? 'refunded'
        : ['failed', 'canceled'].includes(refund.status)
          ? 'refund_failed'
          : 'refund_pending',
    square_refund_id: refund.id,
    ...(refund.status === 'succeeded' ? { refunded_at: now } : {}),
    provider_status: `REFUND_${String(refund.status).toUpperCase()}`,
  };
}
