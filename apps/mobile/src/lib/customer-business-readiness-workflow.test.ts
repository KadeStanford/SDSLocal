import { describe, expect, it } from 'vitest';
import {
  authIntentDestination,
  consumePendingAuthIntent,
  savePendingAuthIntent,
} from './auth-intents';
import {
  clearBusinessOnboardingDraft,
  loadBusinessOnboardingDraft,
  saveBusinessOnboardingDraft,
  type BusinessOnboardingDraft,
} from './business-onboarding';
import { createPickupCartStorage } from './pickup-cart-core';
import { cartReview, orderingRecovery, quoteUsable, setCartLine } from './pickup-order-flow';
import { pendingPaymentPresentation, paymentNeedsCustomer } from './pending-payment';
import { rewardSelection } from './pickup-rewards';
import {
  serviceRequestArguments,
  serviceRequestCanEditAfterFailure,
  serviceRequestDraftError,
} from './service-request-draft';
import type { Product, RewardOffer } from './square-commerce-core';

function memoryStore() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}
const businessId = '11111111-1111-4111-8111-111111111111';
const draft: BusinessOnboardingDraft = {
  version: 1,
  savedAt: 1000,
  requestId: '22222222-2222-4222-8222-222222222222',
  step: 2,
  name: 'Bayou Bites',
  pageAddress: 'bayou-bites',
  pageAddressCustomized: true,
  businessType: 'food_drink',
  categoryIds: [1],
  description: 'Local lunch pickup',
  serviceModel: 'fixed',
  addressLine1: '1 Main Street',
  city: 'Hammond',
  regionCode: 'LA',
  postalCode: '70401',
  serviceAreaType: 'at_location',
  serviceRadiusMiles: 25,
  serviceCities: [],
  customArea: '',
  setupOrderingProvider: 'stripe',
};
const product: Product = {
  id: 'lunch',
  name: 'Lunch',
  variation: 'Regular',
  description: '',
  category: 'Food',
  image: null,
  price: 900,
  currency: 'USD',
  groups: [],
};

describe('readiness workflow: business onboarding recovery', () => {
  it('resumes business creation after authentication and preserves the retry identity through restart and account switching', () => {
    const storage = memoryStore();
    savePendingAuthIntent({ kind: 'create_business' }, storage, 1000);
    const intent = consumePendingAuthIntent(storage, 2000)!;
    expect(authIntentDestination(intent)).toEqual({
      pathname: '/account',
      params: { startBusiness: '1' },
    });
    expect(consumePendingAuthIntent(storage, 2001)).toBeNull();
    saveBusinessOnboardingDraft('owner-a', draft, storage);
    expect(loadBusinessOnboardingDraft('owner-b', storage, 2000)).toBeNull();
    const restored = loadBusinessOnboardingDraft('owner-a', storage, 2000)!;
    expect(restored).toMatchObject({
      step: 2,
      requestId: draft.requestId,
      pageAddress: 'bayou-bites',
      setupOrderingProvider: 'stripe',
    });
    saveBusinessOnboardingDraft('owner-a', { ...restored, step: 3, savedAt: 2500 }, storage);
    expect(loadBusinessOnboardingDraft('owner-a', storage, 3000)?.requestId).toBe(draft.requestId);
    clearBusinessOnboardingDraft('owner-a', storage);
    expect(loadBusinessOnboardingDraft('owner-a', storage, 3001)).toBeNull();
  });
  it('resumes the exact saved event action once and rejects it after the login intent expires', () => {
    const storage = memoryStore();
    const intent = {
      kind: 'event_rsvp' as const,
      businessId,
      businessName: 'Bayou Bites',
      targetId: '33333333-3333-4333-8333-333333333333',
    };
    savePendingAuthIntent(intent, storage, 1000);
    expect(authIntentDestination(consumePendingAuthIntent(storage, 2000)!)).toMatchObject({
      pathname: '/explore',
      params: { businessId, targetId: intent.targetId, resumeAction: 'event_rsvp' },
    });
    expect(consumePendingAuthIntent(storage, 2001)).toBeNull();
    savePendingAuthIntent(intent, storage, 1000);
    expect(consumePendingAuthIntent(storage, 31 * 60_000)).toBeNull();
  });
});
describe('readiness workflow: pickup and payment recovery', () => {
  it('keeps merchant carts separate through navigation/restart and flags a refreshed menu price before payment', () => {
    const storage = createPickupCartStorage(memoryStore());
    storage.save('merchant-a', setCartLine([], product, [], 2, null), 1000);
    storage.save(
      'merchant-b',
      setCartLine([], { ...product, id: 'tea', price: 300 }, [], 1, null),
      1000,
    );
    const recovered = storage.read('merchant-a', 2000);
    expect(cartReview(recovered, [product])).toMatchObject({
      count: 2,
      subtotal: 1800,
      issues: [],
      pricesChanged: false,
    });
    expect(cartReview(recovered, [{ ...product, price: 1000 }]).pricesChanged).toBe(true);
    expect(storage.read('merchant-b', 2000)[0]?.variationId).toBe('tea');
    expect(cartReview(recovered, [{ ...product, available: false }]).issues).toHaveLength(1);
    expect(orderingRecovery('SLOT_FULL')).toMatch(/cart is saved/);
    expect(storage.read('merchant-a', 5 * 60 * 60_000)).toEqual([]);
  });
  it('requires a new quote after expiry and blocks repeat payment while the provider is processing', () => {
    expect(
      quoteUsable(
        { expiresAt: '2026-10-06T12:00:00Z' } as Parameters<typeof quoteUsable>[0],
        Date.parse('2026-10-06T12:00:01Z'),
      ),
    ).toBe(false);
    const waiting = { status: 'checkout_pending', providerStatus: 'PAYMENT_PROCESSING' };
    expect(paymentNeedsCustomer(waiting)).toBe(false);
    expect(pendingPaymentPresentation(waiting, true, true)).toMatchObject({
      waiting: true,
      canContinue: false,
    });
    const requiresAction = {
      status: 'checkout_pending',
      providerStatus: 'PAYMENT_ACTION_REQUIRED',
    };
    expect(paymentNeedsCustomer(requiresAction)).toBe(true);
    expect(pendingPaymentPresentation(requiresAction)).toMatchObject({
      canContinue: true,
      waiting: false,
    });
  });
  it('does not carry a restored cart reward across customer accounts', () => {
    const storage = createPickupCartStorage(memoryStore());
    const offer: RewardOffer = {
      programId: 'loyalty-a',
      revision: 1,
      provider: 'stripe',
      type: 'free_item',
      label: 'Free lunch',
      percent: null,
      items: [product],
    };
    storage.save(
      'merchant-a',
      [
        {
          variationId: product.id,
          quantity: 1,
          modifierIds: [],
          rewardClaim: {
            programId: offer.programId,
            revision: 1,
            provider: 'stripe',
            type: 'free_item',
            customerId: 'customer-a',
          },
        },
      ],
      1000,
    );
    const recovered = storage.read('merchant-a', 2000);
    expect(rewardSelection(recovered, offer, 'customer-a').selection).not.toBeNull();
    expect(rewardSelection(recovered, offer, 'customer-b').selection).toBeNull();
    expect(rewardSelection(recovered, offer, null).selection).toBeNull();
  });
});
describe('readiness workflow: request validation and retry contracts', () => {
  it('validates the published form before building a stable reviewed retry payload', () => {
    const request = {
      businessId,
      offeringId: 'repair',
      message: ' Please repair the kitchen sink ',
      timing: ' Next week ',
      formRevision: 3,
      fields: [
        {
          id: 'contact',
          label: 'Contact email',
          type: 'email' as const,
          required: true,
          options: [],
        },
      ],
      answers: { contact: '' },
    };
    expect(serviceRequestDraftError(request, ['repair'])).toMatch(/Contact email/);
    const reviewed = { ...request, answers: { contact: 'offline-fixture@example.invalid' } };
    expect(serviceRequestDraftError(reviewed, ['repair'])).toBeNull();
    expect(serviceRequestArguments(reviewed, 'stable-retry')).toMatchObject({
      p_idempotency_key: 'stable-retry',
      p_form_revision: 3,
      p_request_message: 'Please repair the kitchen sink',
      p_answers: reviewed.answers,
    });
    expect(serviceRequestCanEditAfterFailure(new TypeError('Lost response'))).toBe(false);
    expect(serviceRequestCanEditAfterFailure({ code: '22023' })).toBe(true);
  });
});
