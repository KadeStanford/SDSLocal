import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import type { ListingBillingSummary } from '@/lib/listing-billing-core';
import { BusinessCreationGate } from './business-creation-gate';

const h = vi.hoisted(() => ({
  userId: 'owner-a' as string | null,
  acknowledged: null as string | null,
  summary: null as ListingBillingSummary | null,
  loading: false,
  purchasing: false,
  onContinue: null as (() => void) | null,
}));
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    useState: () => [
      h.acknowledged,
      (value: string) => {
        h.acknowledged = value;
      },
    ],
  };
});
vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({
    session: h.userId ? { user: { id: h.userId } } : null,
    loading: false,
  }),
}));
vi.mock('@/providers/listing-billing-provider', () => ({
  useListingBilling: () => ({
    summary: h.summary,
    loading: h.loading,
    purchasing: h.purchasing,
  }),
}));
vi.mock('@/app/listing-plans', () => ({
  ListingPlansWorkspace: (props: { onContinue: () => void }) => {
    h.onContinue = props.onContinue;
    return createElement('div', null, 'Subscription page');
  },
}));

beforeEach(() => {
  h.userId = 'owner-a';
  h.acknowledged = null;
  h.loading = false;
  h.purchasing = false;
  h.summary = {
    billingEnabled: true,
    planCode: 'growth',
    planName: 'Growth',
    status: 'active',
    canPublish: true,
    listingLimit: 3,
    usedListings: 1,
    availableListings: 2,
    currentPeriodEnd: null,
    willRenew: true,
    provider: 'apple',
    productId: 'listing_growth_monthly_v1',
    businessIds: ['existing-business'],
  };
});
function render() {
  return renderToStaticMarkup(
    <BusinessCreationGate includeTabOverlay={false} onBack={() => {}}>
      <div>Business form</div>
    </BusinessCreationGate>,
  );
}
it('shows subscriptions before the form even for an existing subscriber, then allows confirmation', () => {
  expect(render()).toContain('Subscription page');
  expect(render()).not.toContain('Business form');
  h.onContinue!();
  expect(render()).toContain('Business form');
});
it.each(['signed-out', 'loading', 'unknown', 'expired', 'full', 'purchasing'] as const)(
  'does not unlock creation while %s',
  (reason) => {
    if (reason === 'signed-out') h.userId = null;
    if (reason === 'loading') h.loading = true;
    if (reason === 'unknown') h.summary = null;
    if (reason === 'expired') h.summary = { ...h.summary!, canPublish: false };
    if (reason === 'full') h.summary = { ...h.summary!, availableListings: 0 };
    if (reason === 'purchasing') h.purchasing = true;
    expect(render()).toContain('Subscription page');
    h.onContinue!();
    expect(h.acknowledged).toBeNull();
  },
);
it('does not reuse another account’s confirmation', () => {
  h.acknowledged = 'owner-a';
  h.userId = 'owner-b';
  expect(render()).toContain('Subscription page');
});
it('preserves the preview flow only when the server explicitly disables billing', () => {
  h.summary = { ...h.summary!, billingEnabled: false, canPublish: false, availableListings: 0 };
  expect(render()).toContain('Subscription page');
  h.onContinue!();
  expect(render()).toContain('Business form');
});
