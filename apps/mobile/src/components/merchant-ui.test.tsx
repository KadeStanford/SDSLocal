import { PickupLaunchGuide } from './pickup/pickup-launch-guide';
import { MenuCategoryActions } from './menu-workspace-ui';
import { BackPill } from './back-pill';
import { AuthModeButton, RememberSessionToggle } from './account-auth-controls';
import { BusinessRating } from './business-rating';
import { EventAttendeeInboxHeader } from './event-attendee-inbox';
import {
  MobileStopInbox,
  filterMobileStops,
  mobileStopLabel,
  type MobileStopSummary,
} from './mobile-stop-inbox';
import { CustomerCalendar, eventDateBarDays } from './customer-calendar';
import { FollowingFiltersSheet } from './following-filters-sheet';
import { ServiceRequestForm, ServiceRequestReview } from './service-request-form';
import {
  RewardDetails,
  RewardProgress,
  RewardsWalletCard,
  rewardProgress,
  type RewardWalletCard,
} from './reward-wallet';
import {
  CustomerRequestDetails,
  CustomerRequestInbox,
  canCancelCustomerRequest,
  filterCustomerRequests,
  type CustomerRequest,
} from './customer-request-inbox';
import { EventInbox, managedEventStatus, type ManagedEventSummary } from './event-inbox';
import { AlertsInboxHeader, AlertsInboxList } from './alerts-inbox';
import { AccountSettingsRow } from './account-settings-row';
import type { DismissibleAlertRow } from './dismissible-alert';
import { EventRsvpControls, type EventRsvpSummary } from './event-rsvp-controls';
import {
  AppointmentInbox,
  appointmentIsActive,
  appointmentNeedsAttention,
  type AppointmentSummary,
} from './appointment-inbox';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import {
  MerchantButton,
  MerchantFilters,
  MerchantRating,
  MerchantRow,
  MerchantSheet,
} from './merchant-ui';

vi.mock('@expo/ui/community/datetime-picker', () => ({ DateTimePicker: () => null }));

const h = vi.hoisted(() => ({
  scheme: 'light' as 'light' | 'dark',
  targets: [] as {
    accessibilityLabel?: string;
    accessibilityRole?: string;
    accessibilityHint?: string;
    onAccessibilityAction?: (event: { nativeEvent: { actionName: string } }) => void;
    accessibilityState?: {
      checked?: boolean;
      selected?: boolean;
      busy?: boolean;
      disabled?: boolean;
    };
    disabled?: boolean;
    onPress?: () => void;
  }[],
}));
it('exposes category creation directly for editors and disables it while saving', () => {
  h.targets = [];
  const add = vi.fn();
  renderToStaticMarkup(<MenuCategoryActions canEdit onAdd={add} />);
  h.targets.find((t) => t.accessibilityLabel === 'Add category')!.onPress!();
  expect(add).toHaveBeenCalledOnce();
  h.targets = [];
  renderToStaticMarkup(<MenuCategoryActions canEdit disabled onAdd={add} />);
  expect(h.targets.find((t) => t.accessibilityLabel === 'Add category')?.disabled).toBe(true);
  h.targets = [];
  renderToStaticMarkup(<MenuCategoryActions canEdit={false} onAdd={add} />);
  expect(h.targets.some((t) => t.accessibilityLabel === 'Add category')).toBe(false);
});
vi.mock('./parish-brand', () => ({
  ParishMark: () => null,
  ParishPalette: { evergreen: '#102D25', ivory: '#F4F2E9', mint: '#89C9A2' },
}));
vi.mock('react-native', async () => {
  const web = await vi.importActual<typeof import('react-native-web')>('react-native-web');
  return {
    ...web,
    Pressable: (props: Record<string, unknown> & { children: ReactNode }) => {
      h.targets.push(props as (typeof h.targets)[number]);
      return createElement(
        'button',
        { 'aria-label': props.accessibilityLabel as string, disabled: props.disabled as boolean },
        props.children,
      );
    },
    Modal: ({ visible, children }: { visible: boolean; children: ReactNode }) =>
      visible ? createElement('section', null, children) : null,
    KeyboardAvoidingView: ({ children }: { children: ReactNode }) =>
      createElement('div', null, children),
  };
});
vi.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => h.scheme }));
vi.mock('expo-image', () => ({ Image: () => null }));
vi.mock('expo-symbols', () => ({ SymbolView: () => null }));
vi.mock('@/lib/storage-url', () => ({
  storagePublicUrl: (path: string) => `https://example.test/${path}`,
}));
vi.mock('./business-brand-header', () => ({
  BusinessBrandHeader: ({ name, title }: { name: string; title?: string }) =>
    createElement('div', null, name, title),
}));
vi.mock('@/lib/haptics', () => ({
  haptics: { medium: async () => {}, selection: async () => {} },
}));
vi.mock('react-native-gesture-handler', () => ({
  Swipeable: ({ children }: { children: ReactNode }) => createElement('div', null, children),
}));
vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 34, left: 0, right: 0, top: 0 }),
}));
afterEach(() => {
  h.targets = [];
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

it.each(['light', 'dark'] as const)(
  'business ratings show stars, a precise average and review count in %s',
  (scheme) => {
    h.scheme = scheme;
    const html = renderToStaticMarkup(
      <BusinessRating summary={{ reviewCount: 3, averageRating: 4.7 }} />,
    );
    expect(html).toContain('★');
    expect(html).toContain('4.7');
    expect(html).toContain('3 reviews');
    expect(html).toContain('4.7 out of 5 stars, 3 reviews');
    const empty = renderToStaticMarkup(
      <BusinessRating summary={{ reviewCount: 0, averageRating: 0 }} />,
    );
    expect(empty).toContain('No reviews yet');
    expect(empty).not.toContain('0.0');
  },
);
it('attendee filters show group counts and target the exact check-in category', () => {
  const select = vi.fn();
  const html = renderToStaticMarkup(
    <EventAttendeeInboxHeader
      attendees={[
        {
          rsvp_id: 'one',
          attendee_name: 'Jane',
          party_size: 3,
          rsvp_status: 'going',
          checked_in_at: null,
          created_at: '2026-09-28T00:00:00Z',
        },
        {
          rsvp_id: 'two',
          attendee_name: 'John',
          party_size: 2,
          rsvp_status: 'waitlisted',
          checked_in_at: null,
          created_at: '2026-09-28T00:00:00Z',
        },
      ]}
      query=""
      filter="expected"
      onQuery={vi.fn()}
      onFilter={select}
    />,
  );
  expect(html).toContain('3 confirmed people');
  expect(html).toContain('2 groups');
  const tab = h.targets.find((t) => t.accessibilityLabel === 'Waitlisted, 1');
  tab?.onPress?.();
  expect(select).toHaveBeenCalledWith('waitlisted');
  expect(
    h.targets.find((t) => t.accessibilityLabel === 'Expected, 1')?.accessibilityState?.selected,
  ).toBe(true);
});
it('stop inbox keeps live stops upcoming, unpublished stops in drafts and expired published stops in history', () => {
  const now = Date.parse('2026-09-29T01:00:00Z');
  const base: MobileStopSummary = {
    id: 'live',
    title: 'Night market',
    address_text: 'Main Street',
    starts_at: '2026-09-29T00:00Z',
    ends_at: '2026-09-29T02:00Z',
    timezone: 'America/Chicago',
    is_published: true,
  };
  const stops = [
    base,
    { ...base, id: 'past', ends_at: '2026-09-28T23:00Z' },
    { ...base, id: 'draft', is_published: false },
  ];
  expect(filterMobileStops(stops, 'upcoming', '', now).map((s) => s.id)).toEqual(['live']);
  expect(filterMobileStops(stops, 'past', '', now).map((s) => s.id)).toEqual(['past']);
  expect(filterMobileStops(stops, 'draft', ' main ', now).map((s) => s.id)).toEqual(['draft']);
  expect(mobileStopLabel(base, now)).toBe('Live now');
  const select = vi.fn(),
    create = vi.fn();
  renderToStaticMarkup(
    <MobileStopInbox
      stops={[base]}
      now={now}
      canEdit={false}
      onCreate={create}
      onSelect={select}
    />,
  );
  expect(h.targets.some((t) => t.accessibilityLabel === 'Add stop')).toBe(false);
  h.targets.find((t) => t.accessibilityLabel === 'Open Night market')?.onPress?.();
  expect(select).toHaveBeenCalledWith('live');
  expect(create).not.toHaveBeenCalled();
});
it.each(['light', 'dark'] as const)(
  'auth controls preserve selection and block mode/preference changes while busy in %s',
  (scheme) => {
    h.scheme = scheme;
    const mode = vi.fn(),
      preference = vi.fn();
    renderToStaticMarkup(
      <>
        <AuthModeButton label="Create account" active disabled onPress={mode} />
        <RememberSessionToggle value disabled onChange={preference} />
      </>,
    );
    const tab = h.targets.find((t) => t.accessibilityLabel === 'Create account');
    const toggle = h.targets.find((t) => t.accessibilityLabel === 'Stay signed in on this device');
    expect(tab?.accessibilityState).toEqual({ selected: true, disabled: true });
    expect(toggle?.accessibilityState).toEqual({ checked: true, disabled: true });
    expect(tab?.disabled).toBe(true);
    expect(toggle?.disabled).toBe(true);
    tab?.onPress?.();
    toggle?.onPress?.();
    expect(mode).not.toHaveBeenCalled();
    expect(preference).not.toHaveBeenCalled();
  },
);
it('auth controls pass their exact actions when available', () => {
  const mode = vi.fn(),
    preference = vi.fn();
  renderToStaticMarkup(
    <>
      <AuthModeButton label="Sign in" active={false} disabled={false} onPress={mode} />
      <RememberSessionToggle value={false} disabled={false} onChange={preference} />
    </>,
  );
  h.targets.find((t) => t.accessibilityLabel === 'Sign in')?.onPress?.();
  h.targets.find((t) => t.accessibilityLabel === 'Stay signed in on this device')?.onPress?.();
  expect(mode).toHaveBeenCalledOnce();
  expect(preference).toHaveBeenCalledWith(true);
});
it('back pills expose the guarded navigation callback and can block leaving during a save', () => {
  const back = vi.fn();
  renderToStaticMarkup(<BackPill label="Back to rewards" onPress={back} disabled />);
  expect(h.targets[0]?.disabled).toBe(true);
  expect(h.targets[0]?.accessibilityState?.disabled).toBe(true);
});
it('disables RSVP while a different event action is pending without showing an RSVP spinner', () => {
  const html = renderToStaticMarkup(
    <EventRsvpControls
      summary={{
        going_count: 1,
        waitlist_count: 0,
        rsvp_limit: 10,
        my_status: 'going',
        my_party_size: 1,
        my_waitlist_position: null,
      }}
      partySize={1}
      loading={false}
      disabled
      onPartySizeChange={vi.fn()}
      onSave={vi.fn()}
      onCancel={vi.fn()}
    />,
  );
  expect(h.targets.every((t) => t.disabled)).toBe(true);
  expect(html).not.toContain('role="progressbar"');
});

it.each(['light', 'dark'] as const)(
  'service request review preserves recipient, details and disclosures in %s mode',
  (scheme) => {
    h.scheme = scheme;
    const send = vi.fn(),
      edit = vi.fn();
    const draft = {
      businessId: 'business',
      offeringId: 'repair',
      message: 'Repair the kitchen sink',
      timing: 'Next week',
    };
    const html = renderToStaticMarkup(
      <ServiceRequestReview
        businessName="Cypress Home Care"
        offeringName="Plumbing repair"
        draft={draft}
        email="owner@example.invalid"
        busy={false}
        locked={false}
        onEdit={edit}
        onSend={send}
      />,
    );
    expect(html).toContain('Plumbing repair');
    expect(html).toContain('Next week');
    expect(html).toContain('owner@example.invalid');
    expect(html).toContain('does not confirm a booking or price');
    h.targets.find((target) => target.accessibilityLabel === 'Send request')!.onPress!();
    expect(send).toHaveBeenCalledOnce();
    h.targets.find((target) => target.accessibilityLabel === 'Edit request')!.onPress!();
    expect(edit).toHaveBeenCalledOnce();
  },
);
it('uncertain request review only retries the same details and blocks sending while busy', () => {
  const draft = {
    businessId: 'business',
    offeringId: null,
    message: 'Repair the kitchen sink',
    timing: '',
  };
  renderToStaticMarkup(
    <ServiceRequestReview
      businessName="Cypress"
      offeringName={undefined}
      draft={draft}
      email={undefined}
      busy={false}
      locked
      onEdit={vi.fn()}
      onSend={vi.fn()}
    />,
  );
  expect(h.targets.some((target) => target.accessibilityLabel === 'Edit request')).toBe(false);
  expect(h.targets.some((target) => target.accessibilityLabel === 'Retry same request')).toBe(true);
  h.targets = [];
  renderToStaticMarkup(
    <ServiceRequestReview
      businessName="Cypress"
      offeringName={undefined}
      draft={draft}
      email={undefined}
      busy
      locked
      onEdit={vi.fn()}
      onSend={vi.fn()}
    />,
  );
  expect(
    h.targets.find((target) => target.accessibilityLabel === 'Sending request…')?.disabled,
  ).toBe(true);
});
it('short service drafts cannot advance to review', () => {
  renderToStaticMarkup(
    <ServiceRequestForm
      offerings={[]}
      draft={{ businessId: 'business', offeringId: null, message: 'short', timing: '' }}
      onChange={vi.fn()}
      onReview={vi.fn()}
      disabled={false}
    />,
  );
  expect(h.targets.find((target) => target.accessibilityLabel === 'Review request')?.disabled).toBe(
    true,
  );
});
const reward: RewardWalletCard = {
  membership_id: 'membership-2',
  business_id: 'business',
  business_name: 'Cypress Cafe',
  primary_color: '#176B4D',
  program_name: 'Coffee rewards',
  reward_description: 'A free coffee',
  program_type: 'points',
  available_points: 240,
  progress_points: 40,
  points_required: 100,
  rewards_ready: 2,
};
it.each(['light', 'dark'] as const)(
  'reward details separate available balance, next reward progress and ready rewards in %s mode',
  (scheme) => {
    h.scheme = scheme;
    const code = vi.fn(),
      back = vi.fn();
    const html = renderToStaticMarkup(
      <RewardDetails card={reward} canShowCode onShowCode={code} onBack={back} />,
    );
    expect(html).toContain('240');
    expect(html).toContain('available points');
    expect(html).toContain('40 of 100 points');
    expect(html).toContain('2 rewards ready');
    expect(html).toContain('60 more points');
    h.targets.find((target) => target.accessibilityLabel === 'Show my rewards code')!.onPress!();
    expect(code).toHaveBeenCalledOnce();
    h.targets.find((target) => target.accessibilityLabel === 'Rewards')!.onPress!();
    expect(back).toHaveBeenCalledOnce();
  },
);
it('wallet opens the exact membership, preserves visit progress and never infers ready rewards from progress', () => {
  const open = vi.fn();
  const visits = {
    ...reward,
    program_type: 'visits' as const,
    rewards_ready: 0,
    progress_stamps: 5,
    stamps_required: 5,
  };
  const html = renderToStaticMarkup(<RewardsWalletCard card={visits} onOpen={open} />);
  expect(html).toContain('5 of 5 visits');
  expect(html).not.toContain('rewards ready');
  h.targets.find((target) => target.accessibilityLabel === 'Cypress Cafe, Coffee rewards')!
    .onPress!();
  expect(open).toHaveBeenCalledWith('membership-2');
  expect(rewardProgress({ ...reward, points_required: 0 }).percent).toBeNull();
  expect(
    renderToStaticMarkup(
      <RewardProgress card={{ ...reward, points_required: 0, rewards_ready: 0 }} />,
    ),
  ).not.toContain('progressbar');
});

it('following filter sheet retains selections and targets highlight, sort, reset and close actions', () => {
  const feature = vi.fn(),
    sort = vi.fn(),
    reset = vi.fn(),
    close = vi.fn();
  const html = renderToStaticMarkup(
    <FollowingFiltersSheet
      visible
      onClose={close}
      feature="rewards"
      onFeature={feature}
      category="Home services"
      categories={['Home services']}
      onCategory={vi.fn()}
      city="Hammond"
      cities={['Hammond']}
      onCity={vi.fn()}
      sort="recent"
      onSort={sort}
      onReset={reset}
    />,
  );
  expect(html).toContain('Home services');
  expect(html).toContain('Hammond');
  expect(
    h.targets.find((target) => target.accessibilityLabel === 'Rewards')?.accessibilityState
      ?.selected,
  ).toBe(true);
  h.targets.find((target) => target.accessibilityLabel === 'Upcoming events')!.onPress!();
  expect(feature).toHaveBeenCalledWith('events');
  h.targets.find((target) => target.accessibilityLabel === 'A–Z')!.onPress!();
  expect(sort).toHaveBeenCalledWith('name');
  h.targets.find((target) => target.accessibilityLabel === 'Reset filters')!.onPress!();
  expect(reset).toHaveBeenCalledOnce();
  h.targets.find((target) => target.accessibilityLabel === 'Show businesses')!.onPress!();
  expect(close).toHaveBeenCalledOnce();
});

const customerRequest = (id: string, status: string): CustomerRequest => ({
  id,
  status,
  business_id: 'business-' + id,
  request_message: 'Quote for a kitchen repair',
  preferred_timing: 'Next week',
  created_at: '2026-09-28T12:00:00Z',
  businesses: [{ name: 'Cypress Home Care' }],
});

it.each(['light', 'dark'] as const)(
  'calendar exposes the full event count, selected day and navigation in %s mode',
  (scheme) => {
    h.scheme = scheme;
    const date = new Date(2026, 8, 28);
    const day = '2026-09-28';
    const select = vi.fn(),
      move = vi.fn(),
      today = vi.fn();
    const html = renderToStaticMarkup(
      <CustomerCalendar
        month={date}
        counts={new Map([[day, 12]])}
        selectedDay={day}
        onSelectDay={select}
        onChangeMonth={move}
        onToday={today}
      />,
    );
    expect(html).toContain('September 2026');
    expect(html).toContain('12 events');
    expect(html).toContain('event-date-bar');
    const target = h.targets.find((target) => target.accessibilityLabel?.includes('12 events'))!;
    expect(target.accessibilityState?.selected).toBe(true);
    target.onPress!();
    expect(select).toHaveBeenCalledWith(day);
    h.targets.find((target) => target.accessibilityLabel === 'Previous month')!.onPress!();
    h.targets.find((target) => target.accessibilityLabel === 'Next month')!.onPress!();
    expect(select.mock.calls).toEqual([[day]]);
    expect(move.mock.calls).toEqual([[-1], [1]]);
    h.targets.find((target) => target.accessibilityLabel === 'Today')!.onPress!();
    expect(today).toHaveBeenCalledOnce();
  },
);
it('date strip includes exactly the days of each month, including leap years', () => {
  expect(eventDateBarDays(new Date(2026, 8, 1))).toHaveLength(30);
  expect(eventDateBarDays(new Date(2026, 9, 1))).toHaveLength(31);
  expect(eventDateBarDays(new Date(2028, 1, 1)).at(-1)?.key).toBe('2028-02-29');
  expect(eventDateBarDays(new Date(2027, 1, 1))).toHaveLength(28);
  expect(eventDateBarDays(new Date(2026, 12, 1))[0]?.key).toBe('2027-01-01');
});
it('customer request search and history retain exact records and cancellation eligibility', () => {
  const requests = ['new', 'in_review', 'contacted', 'completed', 'cancelled'].map((status) =>
    customerRequest(status, status),
  );
  expect(filterCustomerRequests(requests, 'active', ' CYPRESS ').map((row) => row.id)).toEqual([
    'new',
    'in_review',
    'contacted',
  ]);
  expect(filterCustomerRequests(requests, 'history', 'repair').map((row) => row.id)).toEqual([
    'completed',
    'cancelled',
  ]);
  expect(filterCustomerRequests(requests, 'all', 'next week')).toHaveLength(5);
  expect(requests.filter(canCancelCustomerRequest).map((row) => row.id)).toEqual([
    'new',
    'in_review',
  ]);
});
it.each(['light', 'dark'] as const)(
  'customer request inbox opens the selected record and details explain contacted status in %s mode',
  (scheme) => {
    h.scheme = scheme;
    const open = vi.fn();
    const row = customerRequest('request-2', 'contacted');
    const html = renderToStaticMarkup(<CustomerRequestInbox requests={[row]} onOpen={open} />);
    expect(html).toContain('Cypress Home Care');
    expect(html).toContain('Contacted');
    h.targets.find(
      (target) => target.accessibilityLabel === 'View request to Cypress Home Care, Contacted',
    )!.onPress!();
    expect(open).toHaveBeenCalledWith('request-2');
    const detail = renderToStaticMarkup(<CustomerRequestDetails request={row} />);
    expect(detail).toContain('Check your account email');
    expect(detail).toContain('Next week');
    expect(detail).toContain('Quote for a kitchen repair');
  },
);

it('event inbox shows scheduled and published upcoming events and opens the chosen record', () => {
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-09-28T12:00:00Z'));
  const events: ManagedEventSummary[] = [
    {
      id: 'live',
      title: 'Live event',
      startsAt: '2026-10-01T12:00:00Z',
      published: true,
      publishAt: null,
      attending: 4,
      waitlisted: 2,
    },
    {
      id: 'scheduled',
      title: 'Scheduled event',
      startsAt: '2026-10-02T12:00:00Z',
      published: false,
      publishAt: '2026-09-30T12:00:00Z',
      attending: 0,
      waitlisted: 0,
    },
    {
      id: 'draft',
      title: 'Private draft',
      startsAt: '2026-10-03T12:00:00Z',
      published: false,
      publishAt: null,
      attending: 0,
      waitlisted: 0,
    },
    {
      id: 'past',
      title: 'Past event',
      startsAt: '2026-09-01T12:00:00Z',
      published: true,
      publishAt: null,
      attending: 0,
      waitlisted: 0,
    },
  ];
  const open = vi.fn(),
    create = vi.fn();
  const html = renderToStaticMarkup(<EventInbox events={events} onOpen={open} onCreate={create} />);
  expect(html).toContain('Live event');
  expect(html).toContain('Scheduled event');
  expect(html).not.toContain('Private draft');
  expect(html).not.toContain('Past event');
  expect(html).toContain('4 attending · 2 waitlisted groups');
  h.targets.find((t) => t.accessibilityLabel === 'Open Scheduled event')!.onPress!();
  expect(open).toHaveBeenCalledExactlyOnceWith('scheduled');
  h.targets.find((t) => t.accessibilityLabel === '+ Add event')!.onPress!();
  expect(create).toHaveBeenCalledOnce();
  expect(managedEventStatus(events[2]!)).toBe('Draft');
  expect(managedEventStatus(events[1]!)).toBe('Scheduled');
});
it.each(['light', 'dark'] as const)(
  'compact rows and filters activate one intended callback in %s',
  (scheme) => {
    h.scheme = scheme;
    const open = vi.fn(),
      filter = vi.fn();
    const html = renderToStaticMarkup(
      <>
        <MerchantRow
          title="Customer"
          detail="A long customer request"
          label="Open request"
          onPress={open}
        />
        <MerchantFilters
          value="new"
          options={[
            { value: 'new', label: 'New', count: 2 },
            { value: 'closed', label: 'Closed', count: 1 },
          ]}
          onChange={filter}
        />
      </>,
    );
    h.targets.find((t) => t.accessibilityLabel === 'Open request')!.onPress!();
    expect(open).toHaveBeenCalledOnce();
    h.targets.find((t) => t.accessibilityLabel === 'Closed, 1')!.onPress!();
    expect(filter).toHaveBeenCalledExactlyOnceWith('closed');
    expect(html).not.toContain('textarea');
  },
);
it('rating controls expose the selected value and distinct screen-reader labels', () => {
  const change = vi.fn();
  renderToStaticMarkup(<MerchantRating value={4} onChange={change} />);
  expect(h.targets.filter((t) => t.accessibilityState?.checked)).toHaveLength(1);
  expect(
    h.targets.find((t) => t.accessibilityLabel === '4 stars')?.accessibilityState?.checked,
  ).toBe(true);
  h.targets.find((t) => t.accessibilityLabel === '1 star')!.onPress!();
  expect(change).toHaveBeenCalledExactlyOnceWith(1);
});
it('blocks posting and sheet dismissal during a pending save', () => {
  renderToStaticMarkup(
    <MerchantSheet
      visible
      title="Reply"
      onClose={vi.fn()}
      blocked
      footer={<MerchantButton label="Post" loading onPress={vi.fn()} />}
    >
      <span>Draft</span>
    </MerchantSheet>,
  );
  expect(
    h.targets.filter((t) => t.accessibilityLabel === 'Close Reply').every((t) => t.disabled),
  ).toBe(true);
  expect(h.targets.find((t) => t.accessibilityLabel === 'Post')?.disabled).toBe(true);
});
it('does not expose an editor until its detail panel opens', () => {
  const html = renderToStaticMarkup(
    <MerchantSheet visible={false} title="Reply" onClose={vi.fn()}>
      <textarea aria-label="Private draft" />
    </MerchantSheet>,
  );
  expect(html).not.toContain('textarea');
  expect(h.targets).toHaveLength(0);
});

const booking = (id: string, patch: Partial<AppointmentSummary> = {}): AppointmentSummary => ({
  id,
  customerName: 'Guest ' + id,
  serviceName: 'Consultation',
  resourceName: 'Team member',
  startAt: '2026-09-29T00:30:00Z',
  timezone: 'America/Chicago',
  status: 'confirmed',
  paymentStatus: 'none',
  ...patch,
});
it('appointment inbox keeps refund and dispute cases in attention even after a terminal service status', () => {
  const completed = booking('completed', { status: 'completed' });
  expect(appointmentIsActive(completed)).toBe(false);
  expect(appointmentNeedsAttention(completed)).toBe(false);
  for (const paymentStatus of ['review', 'refund_pending', 'refund_failed', 'dispute_lost']) {
    expect(appointmentNeedsAttention({ ...completed, paymentStatus })).toBe(true);
  }
  expect(appointmentNeedsAttention(booking('new', { status: 'requested' }))).toBe(true);
});
it('appointment summary opens the chosen booking without showing financial actions or private detail', () => {
  const select = vi.fn(),
    refresh = vi.fn();
  const html = renderToStaticMarkup(
    <AppointmentInbox
      appointments={[
        booking('late'),
        booking('early', { startAt: '2026-09-28T15:00:00Z' }),
        booking('done', { status: 'completed' }),
      ]}
      loading={false}
      blocked={false}
      onSelect={select}
      onRefresh={refresh}
    />,
  );
  expect(html.indexOf('Guest early')).toBeLessThan(html.indexOf('Guest late'));
  expect(html).not.toContain('Guest done');
  expect(html).not.toContain('Cancel and refund');
  expect(html).not.toContain('Internal notes');
  expect(html).toContain('Sep 28'); // local calendar day, not the UTC Sep 29 timestamp
  h.targets.find((t) => t.accessibilityLabel?.startsWith('Guest late,'))!.onPress!();
  expect(select).toHaveBeenCalledExactlyOnceWith('late');
  h.targets.find((t) => t.accessibilityLabel === 'Refresh schedule')!.onPress!();
  expect(refresh).toHaveBeenCalledOnce();
});
it('read-only inventory rows hide edit affordance and expose a disabled accessible control', () => {
  const html = renderToStaticMarkup(
    <MerchantRow title="Item" subtitle="$4.00" disabled onPress={() => {}} />,
  );
  expect(h.targets.find((t) => t.accessibilityLabel === 'Item')?.disabled).toBe(true);
  expect(html).not.toContain('›');
});

const eventSummary: EventRsvpSummary = {
  going_count: 0,
  waitlist_count: 0,
  rsvp_limit: 10,
  my_status: null,
  my_party_size: null,
  my_waitlist_position: null,
};
it.each(['light', 'dark'] as const)(
  'RSVP controls keep readable labels, bounded group size and one save in %s',
  (scheme) => {
    h.scheme = scheme;
    const change = vi.fn(),
      save = vi.fn();
    const html = renderToStaticMarkup(
      <EventRsvpControls
        summary={eventSummary}
        partySize={1}
        loading={false}
        onPartySizeChange={change}
        onSave={save}
        onCancel={() => {}}
      />,
    );
    expect(html).toContain('People in your group');
    expect(
      h.targets.find((t) => t.accessibilityLabel === 'Remove one person from your RSVP group')
        ?.disabled,
    ).toBe(true);
    h.targets.find((t) => t.accessibilityLabel === 'Add one person to your RSVP group')!.onPress!();
    expect(change).toHaveBeenCalledExactlyOnceWith(2);
    h.targets.find((t) => t.accessibilityLabel === 'RSVP · 1 person')!.onPress!();
    expect(save).toHaveBeenCalledOnce();
  },
);
it('RSVP capacity, pending state and upper group limit remain enforced', () => {
  renderToStaticMarkup(
    <EventRsvpControls
      summary={{ ...eventSummary, going_count: 9 }}
      partySize={10}
      loading={false}
      onPartySizeChange={() => {}}
      onSave={() => {}}
      onCancel={() => {}}
    />,
  );
  expect(
    h.targets.find((t) => t.accessibilityLabel === 'Add one person to your RSVP group')?.disabled,
  ).toBe(true);
  expect(h.targets.find((t) => t.accessibilityLabel === 'Join waitlist · 10 people')).toBeDefined();
  h.targets = [];
  renderToStaticMarkup(
    <EventRsvpControls
      summary={eventSummary}
      partySize={2}
      loading
      onPartySizeChange={() => {}}
      onSave={() => {}}
      onCancel={() => {}}
    />,
  );
  expect(h.targets.filter((t) => t.accessibilityRole === 'button').every((t) => t.disabled)).toBe(
    true,
  );
});

const alerts: (DismissibleAlertRow & { url: string })[] = [
  {
    id: 'customer',
    entity_type: 'pickup_order',
    entity_id: 'order-1',
    title: 'Your pickup',
    body: 'Customer receipt',
    created_at: '2026-09-28T16:00:00Z',
    read_at: null,
    order_audience: 'customer',
    order_status: 'ready',
    url: '/order?id=1',
  },
  {
    id: 'business',
    entity_type: 'pickup_order',
    entity_id: 'order-2',
    title: 'New business order',
    body: 'Review this order',
    created_at: '2026-09-28T16:00:00Z',
    read_at: null,
    order_audience: 'business',
    order_status: 'placed',
    url: '/pickup-order?id=2',
  },
  {
    id: 'request',
    entity_type: 'service_request',
    entity_id: 'request-1',
    title: 'New consultation request',
    body: 'Customer request summary',
    created_at: '2026-09-28T16:00:00Z',
    read_at: null,
    url: '/service-requests?businessId=3',
  },
];
it.each(['light', 'dark'] as const)(
  'shared alert inbox preserves audience separation and exact navigation target in %s',
  (scheme) => {
    h.scheme = scheme;
    const open = vi.fn(),
      dismiss = vi.fn();
    const html = renderToStaticMarkup(
      <AlertsInboxList
        alerts={alerts}
        audience="business"
        onAudience={() => {}}
        onOpen={open}
        onDismiss={dismiss}
      />,
    );
    expect(html).toContain('New business order');
    expect(html).toContain('New consultation request');
    expect(html).not.toContain('Customer receipt');
    const target = h.targets.find(
      (t) => t.accessibilityLabel === 'New consultation request, unread',
    )!;
    target.onPress!();
    expect(open).toHaveBeenCalledExactlyOnceWith(alerts[2]);
    target.onAccessibilityAction!({ nativeEvent: { actionName: 'dismiss' } });
    expect(dismiss).toHaveBeenCalledExactlyOnceWith(alerts[2]);
  },
);
it('shared alert header keeps clear and close as separate actions', () => {
  const clear = vi.fn(),
    close = vi.fn();
  renderToStaticMarkup(<AlertsInboxHeader count={3} unread={2} onClear={clear} onClose={close} />);
  h.targets.find((t) => t.accessibilityLabel === 'Clear all alerts')!.onPress!();
  expect(clear).toHaveBeenCalledOnce();
  expect(close).not.toHaveBeenCalled();
  h.targets.find((t) => t.accessibilityLabel === 'Done')!.onPress!();
  expect(close).toHaveBeenCalledOnce();
});
it('compact account rows preserve explanations for assistive technology and show unread counts', () => {
  const open = vi.fn();
  const html = renderToStaticMarkup(
    <>
      <AccountSettingsRow label="Profile" detail="Name, city, and location" onPress={open} />
      <AccountSettingsRow
        label="Notifications"
        detail="23 unread · preferences and alerts"
        onPress={() => {}}
      />
    </>,
  );
  expect(html).not.toContain('Name, city, and location');
  expect(html).toContain('23');
  const target = h.targets.find((t) => t.accessibilityLabel === 'Profile')!;
  expect(target.accessibilityHint).toBe('Name, city, and location');
  target.onPress!();
  expect(open).toHaveBeenCalledOnce();
});

it('payment checklist shows the next missing step without claiming ordering is ready', () => {
  const html = renderToStaticMarkup(
    <PickupLaunchGuide
      steps={[
        { label: 'Connect account', complete: true },
        { label: 'Verify payouts', complete: false },
        { label: 'Add pickup hours', complete: false },
      ]}
    />,
  );
  expect(html).toContain('1 of 3 complete');
  expect(html).toContain('Next: Verify payouts');
  expect(html).not.toContain('Ready for orders');
  expect(html).not.toContain('Add pickup hours');
});
it('completed checklist still directs the owner to review and save availability', () => {
  const html = renderToStaticMarkup(
    <PickupLaunchGuide steps={[{ label: 'Connect account', complete: true }]} />,
  );
  expect(html).toContain('1 of 1 complete');
  expect(html).toContain('save any changes');
  expect(html).not.toContain('Customers can order');
});
