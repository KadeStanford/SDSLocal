import { useCallback } from 'react';
import { initStripe, PaymentSheetError, useStripe } from '@stripe/stripe-react-native';

const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? '';
let initializedSignature = '';
let initializationQueue: Promise<void> = Promise.resolve();

export type StripePickupPaymentRequest = {
  clientSecret: string;
  stripeAccountId: string;
  merchantDisplayName: string;
};

function initializeStripe(input: StripePickupPaymentRequest, signature: string) {
  const pending = initializationQueue
    .catch(() => {})
    .then(async () => {
      if (initializedSignature === signature) return;
      await initStripe({
        publishableKey,
        stripeAccountId: input.stripeAccountId,
        urlScheme: 'sdslocal',
      });
      initializedSignature = signature;
    });
  initializationQueue = pending;
  return pending;
}

export function useStripePickupPayment() {
  const stripe = useStripe();
  const pay = useCallback(
    async (input: StripePickupPaymentRequest): Promise<'cancelled' | 'completed'> => {
      if (!/^pk_(test|live)_[A-Za-z0-9]+$/.test(publishableKey))
        throw new Error('Secure in-app payment is not configured for this build.');
      if (!/^acct_[A-Za-z0-9]+$/.test(input.stripeAccountId))
        throw new Error('This business is not ready to accept secure payments.');

      const signature = `${publishableKey}:${input.stripeAccountId}`;
      if (initializedSignature !== signature) await initializeStripe(input, signature);

      const initialized = await stripe.initPaymentSheet({
        paymentIntentClientSecret: input.clientSecret,
        merchantDisplayName: input.merchantDisplayName.trim() || 'SDS Local',
        returnURL: 'sdslocal://order',
        allowsDelayedPaymentMethods: false,
        style: 'automatic',
      });
      if (initialized.error)
        throw new Error(
          initialized.error.localizedMessage ?? 'Secure payment could not be opened. Please retry.',
        );

      const result = await stripe.presentPaymentSheet();
      if (result.error?.code === PaymentSheetError.Canceled) return 'cancelled';
      if (result.error)
        throw new Error(
          result.error.localizedMessage ?? 'Payment could not be completed. Please retry.',
        );
      return 'completed';
    },
    [stripe],
  );

  return {
    available: /^pk_(test|live)_[A-Za-z0-9]+$/.test(publishableKey),
    pay,
  };
}
