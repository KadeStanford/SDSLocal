type PendingOrder = { status: string; providerStatus?: string | null };

/** Only a verified provider state can release a previously submitted payment for retry. */
export function paymentNeedsCustomer(order: PendingOrder) {
  return (
    order.status === 'checkout_pending' &&
    ['PAYMENT_METHOD_REQUIRED', 'PAYMENT_ACTION_REQUIRED'].includes(order.providerStatus ?? '')
  );
}

export function pendingPaymentPresentation(order: PendingOrder, submitted = false, slow = false) {
  if (order.providerStatus === 'PAYMENT_METHOD_REQUIRED')
    return {
      title: 'Payment not completed',
      message:
        'Your order is saved, but payment has not been completed. Continue payment to place it.',
      waiting: false,
      canContinue: true,
    };
  if (order.providerStatus === 'PAYMENT_ACTION_REQUIRED')
    return {
      title: 'Finish your payment',
      message:
        'Your bank’s verification still needs to be completed. Continue the same payment to finish placing your order.',
      waiting: false,
      canContinue: true,
    };
  if (submitted || order.providerStatus === 'PAYMENT_PROCESSING')
    return {
      title: slow ? 'Still checking payment' : 'Confirming your order',
      message: slow
        ? 'The payment provider has not confirmed the result yet. Your order is saved and we’ll keep checking. Please don’t pay again.'
        : 'Your payment is being checked. We’ll update this screen as soon as the result is confirmed.',
      waiting: true,
      canContinue: false,
    };
  return {
    title: 'Payment not confirmed',
    message:
      'Your checkout is saved. If you closed payment before finishing, you can continue the same checkout. Check status first if you already submitted payment.',
    waiting: false,
    canContinue: true,
  };
}
