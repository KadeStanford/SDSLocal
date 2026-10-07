/** Purchase feedback never grants access; only the server billing summary does. */
export function listingPurchaseErrorFeedback(cause: unknown) {
  const value = cause as { userCancelled?: boolean; code?: unknown } | null;
  const code = String(value?.code ?? 'unknown');
  // Do not expose receipt data, underlying SDK messages, or account identifiers.
  const diagnostic = `purchase: ${/^\d{1,3}$/.test(code) ? code : 'unknown'}`;
  if (value?.userCancelled || code === '1') {
    return {
      diagnostic,
      notice:
        'The store purchase was closed. If you completed payment, use Restore purchases to check your plan.',
      error: null,
    };
  }
  if (code === '20') {
    return {
      diagnostic,
      notice: 'Your payment is pending store approval. Business setup unlocks after confirmation.',
      error: null,
    };
  }
  return {
    diagnostic,
    notice: null,
    error:
      code === '6' || code === '7'
        ? 'The store reports an existing purchase. Use Restore purchases with the account that originally purchased the plan.'
        : 'The purchase could not be confirmed. Check your store subscriptions, then use Restore purchases before trying to buy again.',
  };
}

export function listingStoreHasActivePlan(
  info: {
    entitlements: { active: Record<string, { isActive: boolean; productIdentifier?: string }> };
  },
  expectedProduct?: string,
) {
  const entitlement = info.entitlements.active.business_listing;
  return (
    entitlement?.isActive === true &&
    (!expectedProduct || entitlement.productIdentifier === expectedProduct)
  );
}
