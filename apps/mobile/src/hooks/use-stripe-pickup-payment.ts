/** TypeScript fallback; Metro selects the native or web implementation. */
export type StripePickupPaymentRequest = {
  clientSecret: string;
  stripeAccountId: string;
  merchantDisplayName: string;
};

export function useStripePickupPayment() {
  return {
    available: false as boolean,
    pay: async (_input: StripePickupPaymentRequest): Promise<'cancelled' | 'completed'> => {
      throw new Error('Secure in-app payment is only available in the mobile app.');
    },
  };
}
