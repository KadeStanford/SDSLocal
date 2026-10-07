import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { it, expect, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import Account from '../app/(tabs)/rewards';
import {
  RewardsWalletCard,
  RewardsWalletList,
  RewardDetails,
  rewardProgress,
  type RewardWalletCard,
} from './reward-wallet';
import { FollowingBusinessCard } from './customer-rewards-ui';
const h = vi.hoisted(() => ({
  scheme: 'light' as 'light' | 'dark',
  screen: 'account',
  index: 0,
  targets: [] as { accessibilityLabel?: string; disabled?: boolean; onPress?: () => void }[],
}));
const cards: RewardWalletCard[] = [
  {
    membership_id: 'one',
    business_id: 'cafe',
    business_name: 'Bayou & Bloom Cafe',
    primary_color: '#176B4D',
    program_name: 'Coffee club',
    reward_description: 'A coffee on us after 8 visits.',
    program_type: 'visits',
    rewards_ready: 1,
    progress_stamps: 5,
    stamps_required: 8,
  },
  {
    membership_id: 'two',
    business_id: 'kitchen',
    business_name: 'Magnolia & Main Kitchen',
    primary_color: '#176B4D',
    program_name: 'Neighborhood rewards',
    reward_description: 'Earn points toward your next meal.',
    program_type: 'points',
    rewards_ready: 0,
    progress_points: 120,
    points_required: 200,
  },
];
const logo = (letters: string, color: string) =>
  `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="24" fill="${color}"/><text x="64" y="78" fill="#f4f2e9" font-family="Georgia" text-anchor="middle" font-size="42">${letters}</text></svg>`).toString('base64')}`;
const photos = (initials: string, photo: string, color: string) => [
  {
    role: 'logo',
    media_assets: { storage_path: logo(initials, color), status: 'ready', alt_text: null },
  },
  {
    role: 'cover',
    media_assets: {
      storage_path: `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=800&q=80`,
      status: 'ready',
      alt_text: null,
    },
  },
];
const rewardCards = cards.map((c, i) => ({
  ...c,
  available_points: i === 1 ? 120 : 0,
  business_photos: photos(
    i ? 'MM' : 'BB',
    i ? 'photo-1517248135467-4c7edcad34c4' : 'photo-1554118811-1e0d58224f24',
    i ? '#543E43' : '#305747',
  ),
}));
const following = rewardCards.map((c) => ({
  id: c.business_id,
  name: c.business_name,
  description: 'A neighborhood favorite in Hammond.',
  category_summary: 'Coffee & food',
  city: 'Hammond',
  region_code: 'LA',
  created_at: '2026-09-01',
  primary_color: '#176B4D',
  loyalty_programs: [{ id: 'reward', is_active: true }],
  events: [],
  business_photos: c.business_photos,
}));
vi.mock('react', async () => {
  const r = await vi.importActual<typeof import('react')>('react');
  return {
    ...r,
    useState: (initial: unknown) => {
      const i = h.index++;
      if (h.screen === 'unit') return r.useState(initial);
      return r.useState(
        i === 0
          ? rewardCards
          : i === 3
            ? following
            : i === 5
              ? h.screen === 'following'
                ? 'following'
                : 'wallet'
              : i === 7 && h.screen === 'reward-detail'
                ? rewardCards[0]
                : i === 15
                  ? false
                  : initial,
      );
    },
  };
});
vi.mock('react-native', async () => {
  const web = await vi.importActual<typeof import('react-native')>('react-native-web');
  return {
    ...web,
    Pressable: (props: Record<string, unknown> & { children: ReactNode }) => {
      h.targets.push(props as (typeof h.targets)[number]);
      return createElement(web.Pressable, props, props.children);
    },
  };
});
vi.mock('react-native-svg', () => ({
  default: ({ children, ...props }: { children: ReactNode }) =>
    createElement('svg', props, children),
  Path: (props: object) => createElement('path', props),
}));
vi.mock('react-native-safe-area-context', async () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: (await vi.importActual<typeof import('react-native')>('react-native-web')).View,
}));
vi.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => h.scheme }));
vi.mock('@/hooks/use-screen-bottom-padding', () => ({ useScreenBottomPadding: () => 32 }));
vi.mock('expo-router', () => ({
  usePathname: () => '/rewards',
  useLocalSearchParams: () => ({}),
  useFocusEffect: () => {},
  router: {},
}));
vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({
    session: { user: { id: 'fixture', email: 'kade20413@gmail.com', identities: [] } },
    loading: false,
  }),
}));
vi.mock('@/providers/notification-provider', () => ({
  useNotifications: () => ({ unreadCount: 2 }),
}));
vi.mock('@/providers/nearby-alerts-provider', () => ({ useNearbyAlerts: () => ({}) }));
vi.mock('@/providers/app-mode-provider', () => ({
  useAppMode: () => ({ mode: 'customer', hasBusinessAccess: true }),
}));
vi.mock('@/lib/auth-storage', () => ({
  getRememberSessionPreference: () => true,
  setRememberSessionPreference: () => {},
}));
vi.mock('@/lib/supabase', () => ({ isSupabaseConfigured: true, supabase: {} }));
vi.mock('@/lib/mobile-oauth', () => ({ isAppleAuthAvailable: async () => false }));
vi.mock('@/lib/biometric-auth', () => ({ clearBiometricSignInRefreshToken: () => {} }));
vi.mock('@/lib/haptics', () => ({ haptics: { selection: () => {} } }));
vi.mock('@/lib/auth-intents', () => ({}));
vi.mock('@/lib/business-onboarding', () => ({ clearBusinessOnboardingDraft: () => {} }));
vi.mock('@/components/app-icon', async () => ({
  AppIcon: (await import('../test/visual-symbol')).VisualSymbol,
}));
vi.mock('expo-apple-authentication', () => ({
  AppleAuthenticationButtonStyle: { WHITE_OUTLINE: 1 },
  AppleAuthenticationButtonType: { SIGN_UP: 1, SIGN_IN: 2 },
  AppleAuthenticationButton: ({ buttonType }: { buttonType: number }) =>
    createElement(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 50,
          borderRadius: 12,
          background: '#fff',
          border: '1px solid #747775',
          color: '#111',
          font: '600 16px Arial',
        },
      },
      buttonType === 1 ? 'Sign up with Apple' : 'Sign in with Apple',
    ),
}));
vi.mock('@/app/business-new', () => ({ NewBusinessWorkspace: () => null }));
vi.mock('@/components/app-chrome', () => ({ AppChrome: () => null }));
vi.mock('@/components/blocked-businesses-panel', () => ({ BlockedBusinessesPanel: () => null }));
vi.mock('@/components/account-data-panel', () => ({ AccountDataPanel: () => null }));
vi.mock('@/components/notification-settings', () => ({ NotificationSettings: () => null }));
vi.mock('@/components/swipe-back-view', () => ({
  SwipeBackView: ({ children }: { children: ReactNode }) => children,
  useSwipeBackGestureBlocker: () => ({
    beginControlGesture: () => {},
    endControlGesture: () => {},
  }),
}));
vi.mock('@/hooks/use-pull-refresh', () => ({
  usePullRefresh: () => ({ refreshing: false, onRefresh: () => {} }),
}));
vi.mock('@/components/public-business-page', () => ({ PublicBusinessPageContent: () => null }));
vi.mock('@/components/rewards-code-sheet', () => ({ RewardsCodeSheet: () => null }));
vi.mock('@/components/customer-calendar', () => ({ CustomerCalendar: () => null }));
vi.mock('expo-image', () => ({
  Image: ({
    source,
    style,
    contentFit,
  }: {
    source: { uri: string };
    style: object;
    contentFit: string;
  }) =>
    createElement('img', {
      src: source.uri,
      alt: '',
      style: { ...StyleSheet.flatten(style), objectFit: contentFit },
    }),
}));
vi.mock('@/lib/storage-url', () => ({ storagePublicUrl: (value: string) => value }));
it('renders redesigned rewards, following, and details in both themes', async () => {
  if (process.env.REWARDS_RENDER_DIR)
    mkdirSync(process.env.REWARDS_RENDER_DIR, { recursive: true });
  for (const scheme of ['light', 'dark'] as const)
    for (const screen of ['rewards', 'following', 'reward-detail']) {
      h.scheme = scheme;
      h.screen = screen;
      h.index = 0;
      const body = renderToStaticMarkup(<Account />);
      expect(body).toContain('parish pass');
      expect(body).toContain(
        screen === 'following'
          ? 'Following'
          : screen === 'reward-detail'
            ? 'Show my rewards code'
            : 'Rewards wallet',
      );
      const css = (StyleSheet as unknown as { getSheet(): { textContent: string } }).getSheet()
        .textContent;
      if (process.env.REWARDS_RENDER_DIR)
        writeFileSync(
          `${process.env.REWARDS_RENDER_DIR}/${screen}-${scheme}.html`,
          `<!doctype html><html><head><meta charset="utf-8"><style>${css}body{margin:0;background:${Colors[scheme].background}}[dir=auto],input{font-family:Arial,sans-serif!important}</style></head><body>${body}</body></html>`,
        );
    }
});

it('groups ready rewards before in-progress cards without repeating the business identity', () => {
  h.screen = 'unit';
  const html = renderToStaticMarkup(
    <RewardsWalletList cards={[...rewardCards].reverse()} onOpen={() => {}} />,
  );
  expect(html.indexOf('Ready to enjoy')).toBeLessThan(html.indexOf('In progress'));
  expect(html.match(/Coffee club/g)).toHaveLength(2); // Button name and card title.
  expect(html).not.toContain('Parish Pass rewards');
});
it('preserves reward progress, opening, and code availability', () => {
  h.screen = 'unit';
  h.targets = [];
  expect(rewardProgress({ ...cards[0]!, progress_stamps: 12 })).toMatchObject({
    progress: 12,
    target: 8,
    percent: 100,
  });
  const open = vi.fn(),
    code = vi.fn();
  renderToStaticMarkup(<RewardsWalletCard card={rewardCards[0]!} onOpen={open} />);
  h.targets.find((t) => t.accessibilityLabel?.startsWith('Bayou & Bloom'))!.onPress!();
  expect(open).toHaveBeenCalledWith('one');
  renderToStaticMarkup(
    <RewardDetails
      card={rewardCards[0]!}
      canShowCode={false}
      onShowCode={code}
      onBack={() => {}}
    />,
  );
  expect(h.targets.find((t) => t.accessibilityLabel === 'Show my rewards code')?.disabled).toBe(
    true,
  );
  h.targets = [];
  renderToStaticMarkup(
    <RewardDetails card={rewardCards[0]!} canShowCode onShowCode={code} onBack={() => {}} />,
  );
  h.targets.find((t) => t.accessibilityLabel === 'Show my rewards code')!.onPress!();
  expect(code).toHaveBeenCalledOnce();
});
it('keeps business opening separate from the two-step unfollow and cancel actions', () => {
  h.screen = 'unit';
  h.targets = [];
  const open = vi.fn(),
    follow = vi.fn(),
    cancel = vi.fn();
  const props = {
    business: following[0]!,
    photos: following[0]!.business_photos,
    onOpen: open,
    onFollowing: follow,
    onCancel: cancel,
  };
  renderToStaticMarkup(<FollowingBusinessCard {...props} />);
  h.targets.find((t) => t.accessibilityLabel === 'View business')!.onPress!();
  expect(open).toHaveBeenCalledOnce();
  expect(follow).not.toHaveBeenCalled();
  h.targets.find((t) => t.accessibilityLabel?.endsWith('Manage follow'))!.onPress!();
  expect(follow).toHaveBeenCalledOnce();
  h.targets = [];
  renderToStaticMarkup(<FollowingBusinessCard {...props} confirming />);
  h.targets.find((t) => t.accessibilityLabel === 'Keep following')!.onPress!();
  expect(cancel).toHaveBeenCalledOnce();
  h.targets.find((t) => t.accessibilityLabel?.startsWith('Confirm unfollow'))!.onPress!();
  expect(follow).toHaveBeenCalledTimes(2);
  h.targets = [];
  renderToStaticMarkup(<FollowingBusinessCard {...props} confirming pending />);
  expect(h.targets.every((t) => t.disabled)).toBe(true);
});
