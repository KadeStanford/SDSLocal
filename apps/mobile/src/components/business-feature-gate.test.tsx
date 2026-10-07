import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { BusinessFeatureGate } from './business-feature-gate';
const h = vi.hoisted(() => ({
  state: {
    access: null as any,
    owner: true,
    loading: false,
    error: null as string | null,
    refresh: vi.fn(),
  },
}));
vi.mock('@/hooks/use-business-feature-access', () => ({ useBusinessFeatureAccess: () => h.state }));
vi.mock('@/hooks/use-theme', () => ({
  useTheme: () => ({ backgroundElement: '#fff', border: '#ddd' }),
}));
vi.mock('react-native', () => ({ View: 'div' }));
vi.mock('expo-router', () => ({ router: { push: vi.fn() } }));
vi.mock('./app-button', () => ({
  AppButton: ({ label }: { label: string }) => <button>{label}</button>,
}));
vi.mock('./themed-text', () => ({ ThemedText: ({ children }: any) => <span>{children}</span> }));
beforeEach(() => {
  h.state.access = null;
  h.state.owner = true;
  h.state.loading = false;
  h.state.error = null;
});
const render = () =>
  renderToStaticMarkup(
    <BusinessFeatureGate
      businessId="b"
      operation="configure_booking"
      recovery={<button>Existing appointments</button>}
    >
      <span>Booking editor</span>
    </BusinessFeatureGate>,
  );
it('shows a clear Pro upgrade and keeps existing appointments accessible', () => {
  const html = render();
  expect(html).toContain('Pro');
  expect(html).toContain('View business plans');
  expect(html).toContain('Existing appointments');
  expect(html).not.toContain('Booking editor');
});
it('does not send staff to buy a personal plan for their employer', () => {
  h.state.owner = false;
  const html = render();
  expect(html).toContain('Ask the business owner');
  expect(html).not.toContain('View business plans');
});
it('treats network failure as retryable, not as proof an upgrade is needed', () => {
  h.state.error = 'Connection unavailable';
  const html = render();
  expect(html).toContain('Check access again');
  expect(html).not.toContain('View business plans');
});
it('only renders the protected editor after server access is confirmed', () => {
  h.state.loading = true;
  expect(render()).not.toContain('Booking editor');
  h.state.loading = false;
  h.state.access = {
    businessId: 'b',
    planCode: 'pro',
    enforced: true,
    featureCodes: ['appointments'],
  };
  expect(render()).toContain('Booking editor');
  expect(render()).not.toContain('View business plans');
});
