/** Instructions describe the server-confirmed stage, never imply that a payment is complete. */
export function businessOrderStage(status: string) {
  const stages: Record<string, { title: string; instruction: string }> = {
    checkout_pending: {
      title: 'Payment confirmation',
      instruction: 'Wait for payment confirmation before preparing this order.',
    },
    checkout_expired: {
      title: 'Checkout expired',
      instruction: 'This checkout expired. Review payment status before taking any action.',
    },
    checkout_failed: {
      title: 'Checkout unavailable',
      instruction: 'Payment was not confirmed. Review the order before preparing it.',
    },
    payment_review: {
      title: 'Payment review',
      instruction:
        'Review the payment issue in order actions before preparing or handing off this order.',
    },
    placed: {
      title: 'New pickup order',
      instruction: 'Review the items and pickup time, then accept the order.',
    },
    accepted: {
      title: 'Accepted order',
      instruction: 'Start preparing when you are ready to work on this order.',
    },
    preparing: {
      title: 'Preparing order',
      instruction: 'Check the items, then mark the order ready for pickup.',
    },
    ready: {
      title: 'Customer handoff',
      instruction: 'Check the customer’s pickup code and scan it to confirm handoff.',
    },
    completed: {
      title: 'Pickup complete',
      instruction: 'This order has been handed off. Review the receipt or customer requests below.',
    },
    refund_pending: {
      title: 'Refund processing',
      instruction:
        'The refund is awaiting provider confirmation. Review its status in order actions.',
    },
    refund_failed: {
      title: 'Refund needs attention',
      instruction:
        'The refund was not confirmed. Review the payment and refund status in order actions.',
    },
    refunded: {
      title: 'Payment refunded',
      instruction: 'Review the refunded receipt and any customer requests below.',
    },
    dispute_lost: {
      title: 'Payment returned',
      instruction:
        'The payment was returned through a dispute. Review payment details before further action.',
    },
    cancelled: {
      title: 'Order cancelled',
      instruction: 'This order is cancelled. Review its payment and refund status below.',
    },
  };
  return (
    stages[status] ?? {
      title: 'Order details',
      instruction: 'Review the current order and payment status before taking action.',
    }
  );
}
