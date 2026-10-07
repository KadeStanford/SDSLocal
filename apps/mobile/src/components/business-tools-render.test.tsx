import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { it, expect, vi } from 'vitest';
import { View, StyleSheet } from 'react-native';
import { AppointmentWorkspace } from './appointment-workspace';
import { BrandColorEditor, BrandColorPicker } from './brand-color-picker';
import { RequestFormBuilder } from './request-form-builder';
import { ServiceRequestForm } from './service-request-form';
import ServiceRequestsScreen from '@/app/service-requests';
import { ParishBusinessBrand } from './business-screen-header';
import { ThemedText } from './themed-text';
import { MerchantButton } from './merchant-ui';
import { Colors } from '@/constants/theme';
import type { RequestField } from '@/lib/service-request-schema';
const state = vi.hoisted(() => ({
  scheme: 'light' as 'light' | 'dark',
  i: 0,
  slots: {} as Record<number, unknown>,
}));
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    useState: (v: unknown) => {
      const i = state.i++;
      return actual.useState(i in state.slots ? state.slots[i] : v);
    },
  };
});
vi.mock('react-native', async () => ({
  ...(await vi.importActual('react-native-web')),
  Modal: ({ visible, children }: { visible: boolean; children: ReactNode }) =>
    visible ? createElement('section', { 'data-modal': 'true' }, children) : null,
}));
vi.mock('react-native-svg', () => ({
  default: ({ children, ...props }: { children: ReactNode }) =>
    createElement('svg', props, children),
  Path: (props: object) => createElement('path', props),
  Defs: ({ children }: { children: ReactNode }) => createElement('defs', null, children),
  LinearGradient: ({ children, ...p }: { children: ReactNode }) =>
    createElement('linearGradient', p, children),
  Stop: (p: object) => createElement('stop', p),
  Rect: (p: object) => createElement('rect', p),
  Circle: (p: object) => createElement('circle', p),
  Ellipse: (p: object) => createElement('ellipse', p),
  Line: (p: object) => createElement('line', p),
  Polygon: (p: object) => createElement('polygon', p),
  Polyline: (p: object) => createElement('polyline', p),
}));
vi.mock('react-native-safe-area-context', async () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: (await vi.importActual<typeof import('react-native-web')>('react-native-web')).View,
}));
vi.mock('expo-image', () => ({ Image: (props: object) => createElement('img', props) }));
vi.mock('expo-symbols', async () => ({
  SymbolView: (await import('../test/visual-symbol')).VisualSymbol,
}));
vi.mock('expo-router', () => ({
  router: { push: vi.fn(), back: vi.fn() },
  useLocalSearchParams: () => ({ businessId: 'business' }),
  useFocusEffect: vi.fn(),
}));
vi.mock('@expo/ui/community/datetime-picker', () => ({
  DateTimePicker: () => createElement('div', null, 'Native date/time control'),
}));
vi.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => state.scheme }));
vi.mock('@/hooks/use-pull-refresh', () => ({
  usePullRefresh: () => ({ refreshing: false, onRefresh: vi.fn() }),
}));
vi.mock('@/hooks/use-screen-bottom-padding', () => ({ useScreenBottomPadding: () => 24 }));
vi.mock('@/hooks/use-reduced-motion', () => ({ useReducedMotion: () => true }));
vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({ session: { user: { id: 'owner' } } }),
}));
vi.mock('@/hooks/use-business-feature-access', () => ({
  useBusinessFeatureAccess: () => ({
    access: {
      businessId: 'business',
      enforced: true,
      planCode: 'pro',
      featureCodes: ['appointments'],
    },
    owner: true,
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));
vi.mock('@/components/app-chrome', () => ({ AppChrome: () => null }));
vi.mock('@/lib/haptics', () => ({ haptics: { selection: vi.fn() } }));
vi.mock('@/lib/appointment-commerce', () => ({ appointmentCommerce: vi.fn() }));
vi.mock('@/lib/storage-url', () => ({ storagePublicUrl: (path: string) => path }));
vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('expo-crypto', () => ({ randomUUID: () => 'question-new' }));
const noop = () => {};
const fields: RequestField[] = [
  {
    id: 'work',
    label: 'What type of work do you need?',
    type: 'choice',
    required: true,
    options: ['Repair', 'Installation', 'Maintenance'],
  },
  {
    id: 'property',
    label: 'Property type',
    type: 'choice',
    required: true,
    options: ['House', 'Apartment', 'Commercial'],
  },
  {
    id: 'details',
    label: 'Anything we should know before visiting?',
    type: 'long_text',
    required: false,
    options: [],
  },
];
const services = [
  {
    id: 'visit',
    offeringItemId: null,
    name: 'Home consultation',
    description: 'A one-hour visit to discuss the work and next steps.',
    durationMinutes: 60,
    durationInput: '60',
    bufferMinutes: 15,
    bufferInput: '15',
    priceMinor: 7500,
    priceInput: '75.00',
    currency: 'USD',
    priceIsFixed: true,
    paymentPolicy: 'pay_in_person',
    depositMinor: null,
    depositInput: '0.00',
    depositPercent: 20,
    capacity: 1,
    capacityInput: '1',
    requiresResource: true,
    requiresApproval: true,
    isBookable: true,
    publicInstructions: 'Please have someone available to show us the property.',
    internalNotes: '',
    resourceIds: ['team'],
  },
  {
    id: 'followup',
    offeringItemId: null,
    name: 'Follow-up visit',
    description: 'Check the finished work.',
    durationMinutes: 30,
    durationInput: '30',
    bufferMinutes: 0,
    bufferInput: '0',
    priceMinor: 3500,
    priceInput: '35.00',
    currency: 'USD',
    priceIsFixed: true,
    paymentPolicy: 'pay_in_person',
    depositMinor: null,
    depositInput: '0.00',
    depositPercent: null,
    capacity: 1,
    capacityInput: '1',
    requiresResource: false,
    requiresApproval: false,
    isBookable: true,
    publicInstructions: '',
    internalNotes: '',
    resourceIds: [],
  },
];
const requests = [
  {
    id: 'request',
    business_id: 'business',
    customer_name: 'Jamie Rivera',
    customer_email: 'jamie@example.test',
    request_message: 'The kitchen faucet is leaking. I would like an estimate for a replacement.',
    preferred_timing: 'Weekday afternoons',
    created_at: '2026-09-29T15:15:00Z',
    status: 'new',
    form_answers: [
      { id: 'work', label: fields[0]!.label, type: 'choice', value: 'Installation' },
      { id: 'property', label: 'Property type', type: 'choice', value: 'House' },
    ],
  },
  {
    id: 'request2',
    business_id: 'business',
    customer_name: 'Morgan Lee',
    request_message: 'Looking for a seasonal maintenance visit.',
    preferred_timing: 'Next week',
    created_at: '2026-09-29T13:00:00Z',
    status: 'new',
  },
];
const screens = [
  'colors',
  'color-picker',
  'booking',
  'services',
  'availability',
  'rules',
  'team',
  'service-details',
  'service-pricing',
  'service-booking',
  'request-builder',
  'question',
  'customer-form',
  'requests',
  'request-detail',
];
it('renders the business tools using the production components in both themes', () => {
  for (const scheme of ['light', 'dark'] as const)
    for (const screen of screens) {
      state.scheme = scheme;
      state.i = 0;
      state.slots = {};
      let content: ReactNode;
      const titles: Record<string, string> = {
        colors: 'Brand colors',
        'color-picker': 'Primary brand color',
        booking: 'Appointments',
        services: 'Appointments',
        availability: 'Appointments',
        rules: 'Appointments',
        team: 'Appointments',
        'service-details': 'Service details',
        'service-pricing': 'Service pricing',
        'service-booking': 'Service booking',
        'request-builder': 'Request form',
        question: 'Edit question',
        'customer-form': 'Request an estimate',
        requests: 'Requests & estimates',
        'request-detail': 'Request details',
      };
      if (screen === 'colors')
        content = (
          <>
            <BrandColorPicker label="Primary brand color" value="#176B4D" onChange={noop} />
            <BrandColorPicker label="Accent brand color" value="#80C5A4" onChange={noop} />
            <MerchantButton brand label="Save profile" onPress={noop} />
          </>
        );
      else if (screen === 'color-picker')
        content = (
          <>
            <BrandColorEditor value="#176B4D" onChange={noop} />
            <MerchantButton brand label="Use color" onPress={noop} />
          </>
        );
      else if (['request-builder', 'question'].includes(screen)) {
        if (screen === 'question') state.slots = { 0: 'work' };
        content = (
          <>
            <RequestFormBuilder fields={fields} onChange={noop} />
            <MerchantButton brand label="Save request form" onPress={noop} />
          </>
        );
      } else if (screen === 'customer-form')
        content = (
          <ServiceRequestForm
            offerings={[]}
            draft={{
              businessId: 'business',
              offeringId: null,
              message: '',
              timing: '',
              fields,
              answers: {},
              formRevision: 1,
            }}
            onChange={noop}
            onReview={noop}
            disabled={false}
          />
        );
      else if (['requests', 'request-detail'].includes(screen)) {
        state.slots = {
          0: { id: 'business', name: 'Cypress & Co Home Care', business_type: 'services' },
          1: requests,
          2: false,
          8: screen === 'request-detail' ? 'request' : null,
          9: true,
        };
        content = <ServiceRequestsScreen />;
      } else {
        state.slots = {
          0: {
            enabled: true,
            timezone: 'America/Chicago',
            minimumNoticeMinutes: 120,
            minimumNoticeInput: '120',
            bookingHorizonDays: 60,
            bookingHorizonInput: '60',
            slotIntervalMinutes: 15,
            automaticallyConfirm: true,
            cancellationCutoffMinutes: 1440,
            cancellationCutoffInput: '1440',
            cancellationTerms: 'Please cancel at least one day before your visit.',
            publicInstructions: 'We will confirm your address before the appointment.',
          },
          1: services,
          2: [{ id: 'team', userId: 'owner', name: 'Jamie · Field team', isActive: true }],
          3: [{ userId: 'owner', displayName: 'Jamie', role: 'owner' }],
          4: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
            dayOfWeek,
            opensAt: '09:00',
            closesAt: '17:00',
            serviceId: null,
            resourceId: null,
          })),
          10: true,
          11: 'setup',
          12:
            screen === 'services'
              ? 'services'
              : screen === 'availability'
                ? 'hours'
                : screen === 'rules'
                  ? 'policy'
                  : screen === 'team'
                    ? 'resources'
                    : null,
          13:
            screen === 'service-pricing'
              ? 'payment'
              : screen === 'service-booking'
                ? 'team'
                : 'details',
          14: screen.startsWith('service-') ? 'visit' : null,
          16: false,
          21: 'saved',
        };
        content = (
          <AppointmentWorkspace
            businessId="business"
            businessTimezone="America/Chicago"
            onDirtyChange={noop}
          />
        );
      }
      const body = renderToStaticMarkup(
        <View style={{ gap: 22 }}>
          {!['requests', 'request-detail'].includes(screen) && (
            <>
              <ParishBusinessBrand />
              <View style={{ gap: 6 }}>
                <ThemedText type="title">{titles[screen]}</ThemedText>
                <ThemedText themeColor="textSecondary" type="small">
                  Cypress & Co Home Care
                </ThemedText>
              </View>
            </>
          )}
          {content}
        </View>,
      );
      expect(body).not.toContain('Loading appointment setup');
      if (screen === 'booking') expect(body).toContain('Online booking');
      if (screen === 'customer-form') expect(body).toContain('Property type');
      if (process.env.BUSINESS_TOOLS_RENDER_DIR) {
        const dir = resolve(process.env.BUSINESS_TOOLS_RENDER_DIR);
        mkdirSync(dir, { recursive: true });
        const css = (StyleSheet as unknown as { getSheet(): { textContent: string } }).getSheet()
          .textContent;
        writeFileSync(
          `${dir}/${screen}-${scheme}.html`,
          `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}body{margin:0;padding:20px;background:${Colors[scheme].background}}[dir=auto],input,textarea{font-family:Arial,sans-serif!important}</style></head><body>${body}</body></html>`,
        );
      }
    }
});
