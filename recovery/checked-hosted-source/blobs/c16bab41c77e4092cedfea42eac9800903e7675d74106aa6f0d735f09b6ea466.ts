import { fail } from './square-security.ts';
import { moneyPatch } from './payment-money.ts';

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

export function stripePaymentIntentPatch(
  order: Row,
  intent: Row,
  now = new Date().toISOString(),
): Row {
  if (
    intent.livemode !== false ||
    intent.id !== order.square_payment_id ||
    intent.metadata?.sds_order_id !== order.id
  )
    fail('PAYMENT_MISMATCH', 'Stripe payment does not match this test order.', 409);
  if (order.status !== 'checkout_pending') return {};
  if (
    intent.amount !== Number(order.total_minor) ||
    String(intent.currency).toUpperCase() !== order.currency
  )
    return { status: 'payment_review', provider_status: 'PAYMENT_MISMATCH' };
  if (intent.status === 'succeeded') {
    if (intent.amount_received !== Number(order.total_minor))
      return { status: 'payment_review', provider_status: 'PAYMENT_MISMATCH' };
    return {
      status: 'placed',
      paid_at: now,
      checkout_url: null,
      provider_status: 'PAID',
    };
  }
  if (intent.status === 'canceled')
    return { status: 'checkout_expired', checkout_url: null, provider_status: 'EXPIRED' };
  if (intent.status === 'requires_capture')
    return { status: 'payment_review', provider_status: 'UNEXPECTED_CAPTURE_STATE' };
  return {};
}

export function stripeRefundPatch(order: Row, refund: Row, now = new Date().toISOString()): Row {
  if (
    refund.payment_intent !== order.square_payment_id ||
    refund.amount !== Number(order.refund_amount_minor ?? order.total_minor) ||
    String(refund.currency).toUpperCase() !== order.currency ||
    !['succeeded', 'pending', 'requires_action', 'failed', 'canceled'].includes(refund.status)
  )
    fail('REFUND_MISMATCH', 'Stripe refund does not match this order.', 409);
  return {
    status:
      refund.status === 'succeeded'
        ? Number(order.refunded_minor ?? 0) + refund.amount === Number(order.total_minor)
          ? 'refunded'
          : 'payment_review'
        : ['failed', 'canceled'].includes(refund.status)
          ? 'refund_failed'
          : 'refund_pending',
    square_refund_id: refund.id,
    ...(refund.status === 'succeeded'
      ? {
          refunded_minor: Math.min(
            Number(order.total_minor),
            Number(order.refunded_minor ?? 0) + refund.amount,
          ),
        }
      : {}),
    ...(refund.status === 'succeeded' &&
    Number(order.refunded_minor ?? 0) + refund.amount === Number(order.total_minor)
      ? { refunded_at: now }
      : {}),
    provider_status:
      refund.status === 'succeeded' &&
      Number(order.refunded_minor ?? 0) + refund.amount < Number(order.total_minor)
        ? 'PARTIAL_REFUND'
        : `REFUND_${String(refund.status).toUpperCase()}`,
  };
}

// Dashboard refunds and disputes can occur after kitchen progress. The canonical
// charge determines money state; never infer a full refund from one partial event.
export function stripeChargePatch(order: Row, charge: Row, now = new Date().toISOString()): Row {
  if (
    charge.livemode !== false ||
    charge.payment_intent !== order.square_payment_id ||
    charge.amount !== Number(order.total_minor) ||
    String(charge.currency).toUpperCase() !== order.currency ||
    !Number.isSafeInteger(charge.amount_refunded) ||
    charge.amount_refunded < 0 ||
    charge.amount_refunded > Number(order.total_minor)
  )
    fail('PAYMENT_MISMATCH', 'Stripe charge does not match this test order.', 409);
  if (order.status === 'refunded') return {};
  const pending = charge.refunds?.data?.find((refund: Row) =>
    ['pending', 'requires_action'].includes(refund.status),
  );
  if (pending) {
    if (
      pending.payment_intent !== order.square_payment_id ||
      String(pending.currency).toUpperCase() !== order.currency ||
      !Number.isSafeInteger(pending.amount) ||
      pending.amount <= 0 ||
      pending.amount > Number(order.total_minor)
    )
      fail('REFUND_MISMATCH', 'Stripe refund does not match this order.', 409);
  }
  if (charge.amount_refunded === Number(order.total_minor) && charge.refunded !== true)
    fail('REFUND_MISMATCH', 'Stripe refund total could not be verified.', 409);
  const patch = moneyPatch(order, charge.amount_refunded, !!pending, undefined, now);
  if (pending)
    Object.assign(patch, { square_refund_id: pending.id, refund_amount_minor: pending.amount });
  if (charge.disputed === true && !['WON', 'RESOLVED'].includes(order.dispute_state))
    Object.assign(patch, {
      status: 'payment_review',
      checkout_url: null,
      provider_status: 'PAYMENT_DISPUTED',
    });
  if (Object.keys(patch).length === 1 && patch.refunded_minor === Number(order.refunded_minor ?? 0))
    return {};
  return patch;
}
