import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import { ServiceOperationsScreen } from './service-operations-screen';
const h = vi.hoisted(() => ({
  businesses: [] as { id: string; name: string; timezone: string }[],
}));
vi.mock('react-native', () => ({
  View: ({ children }: { children: ReactNode }) => createElement('div', null, children),
  ScrollView: ({ children }: { children: ReactNode }) => createElement('main', null, children),
  Alert: { alert: vi.fn() },
  Pressable: ({
    children,
    accessibilityLabel,
  }: {
    children: ReactNode;
    accessibilityLabel: string;
  }) => createElement('button', { 'aria-label': accessibilityLabel }, children),
}));
vi.mock('@/components/app-icon', () => ({ AppIcon: () => null }));
vi.mock('./alerts-button', () => ({ AlertsButton: () => null }));
vi.mock('./themed-text', () => ({
  ThemedText: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));
vi.mock('./merchant-ui', () => ({
  MerchantSheet: ({ visible, children }: { visible: boolean; children: ReactNode }) =>
    visible ? children : null,
}));
vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: ReactNode }) => createElement('div', null, children),
}));
vi.mock('expo-router', () => ({ useFocusEffect: () => {} }));
vi.mock('@/providers/service-operations-provider', () => ({
  useServiceOperations: () => ({
    businesses: h.businesses,
    loading: false,
    error: '',
    refresh: vi.fn(),
  }),
}));
vi.mock('@/hooks/use-theme', () => ({ useTheme: () => ({ background: '#fff' }) }));
vi.mock('@/hooks/use-screen-bottom-padding', () => ({ useScreenBottomPadding: () => 40 }));
vi.mock('./app-chrome', () => ({ AppChrome: () => null }));
vi.mock('./choice-picker', () => ({
  ChoicePicker: ({ options }: { options: { value: string; label: string }[] }) => (
    <select aria-label="Business">
      {options.map((b) => (
        <option key={b.value}>{b.label}</option>
      ))}
    </select>
  ),
}));
vi.mock('./appointment-workspace', () => ({
  AppointmentWorkspace: ({ businessId }: { businessId: string }) => (
    <div data-appointments={businessId} />
  ),
}));
vi.mock('@/app/service-requests', () => ({
  ServiceRequestsContent: ({ businessId, header }: { businessId: string; header: ReactNode }) => (
    <div data-requests={businessId}>{header}</div>
  ),
}));
vi.mock('./business-screen-header', () => ({
  ParishBusinessBrand: () => <span>Parish Pass</span>,
  BusinessScreenHeader: ({ title, subtitle }: { title: string; subtitle: string }) => (
    <header>
      {title}
      {subtitle}
    </header>
  ),
}));
vi.mock('./data-state', () => ({
  EmptyState: ({ title }: { title: string }) => <p>{title}</p>,
  ListLoading: () => null,
  StateNotice: () => null,
}));
describe.each(['appointments', 'requests'] as const)('%s bottom-tab workspace', (kind) => {
  it('has no chooser without an eligible business', () => {
    h.businesses = [];
    const html = renderToStaticMarkup(<ServiceOperationsScreen kind={kind} />);
    expect(html).toContain('No eligible businesses');
    expect(html).not.toContain('<select');
    expect(html).not.toContain('data-appointments');
    expect(html).not.toContain('data-requests');
  });
  it('opens the only eligible business directly', () => {
    h.businesses = [{ id: 'salon', name: 'Willow & Pine', timezone: 'America/Chicago' }];
    const html = renderToStaticMarkup(<ServiceOperationsScreen kind={kind} />);
    expect(html).toContain(`data-${kind}="salon"`);
    expect(html).not.toContain('<select');
  });
  it('offers only eligible business choices for multiple owners businesses', () => {
    h.businesses = [
      { id: 'salon', name: 'Willow', timezone: 'America/Chicago' },
      { id: 'home', name: 'Cypress', timezone: 'America/Chicago' },
    ];
    const html = renderToStaticMarkup(<ServiceOperationsScreen kind={kind} />);
    expect(html).toContain('Change business: Willow');
    expect(html).toContain('Willow');
    expect(html).not.toContain('YOUR BUSINESS');
    expect(html).toContain(`data-${kind}="salon"`);
  });
});
