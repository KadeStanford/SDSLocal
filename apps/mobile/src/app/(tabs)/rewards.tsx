import { EventDetailHeading } from '@/components/event-detail-heading';
import { BusinessBrandHeader } from '@/components/business-brand-header';
import { brandColor } from '@/lib/color-contrast';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { ListLoading } from '@/components/data-state';
import { AppButton } from '@/components/app-button';
import { buildDirectionsUrl } from '@/lib/external-actions';
import { useScreenBottomPadding } from '@/hooks/use-screen-bottom-padding';
import { BusinessLogo } from '@/components/business-logo';
import { EventCard } from '@/components/event-card';
import type { IdentityPhoto } from '@/lib/business-identity';
import { router, useFocusEffect, useLocalSearchParams, usePathname } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Linking,
  Platform,
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppChrome } from '@/components/app-chrome';
import { SwipeBackView } from '@/components/swipe-back-view';
import { ChoicePicker } from '@/components/choice-picker';
import { EventPagerDot } from '@/components/event-pager-dot';
import { HorizontalScrollRow } from '@/components/horizontal-scroll-row';
import { PublicBusinessPageContent } from '@/components/public-business-page';
import { Brand, Colors, Radius, Spacing } from '@/constants/theme';
import {
  DISCOVERY_EVENT_QUERY_LIMIT,
  discoveryEventHorizonEnd,
  isPublishedUpcomingEvent,
} from '@/lib/discovery-core';
import {
  filterBlockedBusinesses,
  filterBlockedEvents,
  loadBlockedBusinessIds,
} from '@/lib/customer-safety';
import { haptics } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';
import { storagePublicUrl } from '@/lib/storage-url';
import { userMessageFromError } from '@/lib/user-error';
import { useAuth } from '@/providers/auth-provider';
import { useNearbyAlerts } from '@/providers/nearby-alerts-provider';

interface WalletCard {
  business_photos?: readonly IdentityPhoto[] | null;
  membership_id: string;
  business_id: string;
  business_name: string;
  primary_color: string;
  program_name: string;
  reward_description: string;
  program_type?: 'visits' | 'points';
  points_per_dollar?: number | null;
  points_required?: number | null;
  earned_points?: number;
  available_points?: number;
  progress_points?: number;
  rewards_ready: number;
  progress_stamps?: number;
  stamps_required?: number;
}

interface ReminderPreference {
  readonly reminder_enabled: boolean;
  readonly reminder_minutes_before: number;
  readonly reminder_frequency: ReminderFrequency;
}

type ReminderFrequency = 'once' | 'daily' | 'weekly' | 'monthly';

interface EventGalleryPhoto {
  readonly id: string;
  readonly caption: string | null;
  readonly display_order: number;
  readonly media_assets:
    | {
        readonly storage_path: string;
        readonly status: string;
        readonly alt_text: string | null;
        readonly width: number;
        readonly height: number;
      }
    | readonly {
        readonly storage_path: string;
        readonly status: string;
        readonly alt_text: string | null;
        readonly width: number;
        readonly height: number;
      }[]
    | null;
}

interface EventMediaItem {
  readonly uri: string;
  readonly caption: string | null;
  readonly aspectRatio: number;
}

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList) as unknown as typeof FlatList;

interface FollowedEvent {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly starts_at: string;
  readonly ends_at: string | null;
  readonly address_text: string | null;
  readonly location_mode: string;
  readonly timezone: string;
  readonly age_note: string | null;
  readonly capacity_text: string | null;
  readonly external_url: string | null;
  readonly business: {
    readonly business_photos?: readonly IdentityPhoto[] | null;
    readonly id: string;
    readonly name: string;
    readonly primary_color: string;
  };
  readonly media_assets:
    | {
        readonly storage_path: string;
        readonly status: string;
        readonly alt_text: string | null;
        readonly width: number;
        readonly height: number;
      }
    | readonly {
        readonly storage_path: string;
        readonly status: string;
        readonly alt_text: string | null;
        readonly width: number;
        readonly height: number;
      }[]
    | null;
  readonly event_photos: readonly EventGalleryPhoto[] | null;
}

async function loadPublicUpcomingEvents(blockedIds: ReadonlySet<string>) {
  const now = new Date();
  const horizon = discoveryEventHorizonEnd(now);
  const result = await supabase
    .from('events')
    .select(
      'id, business_id, title, description, starts_at, ends_at, address_text, location_mode, timezone, age_note, capacity_text, external_url, is_published, publish_at, archived_at, media_assets(storage_path, status, alt_text, width, height), event_photos(id, caption, display_order, media_assets(storage_path, status, alt_text, width, height)), businesses!inner(id, name, primary_color, status, business_photos(role, media_assets(storage_path, status)))',
    )
    .is('archived_at', null)
    .gte('starts_at', now.toISOString())
    .lte('starts_at', horizon.toISOString())
    .eq('businesses.status', 'active')
    .order('starts_at', { ascending: true })
    .limit(DISCOVERY_EVENT_QUERY_LIMIT);
  if (result.error) return { data: [] as FollowedEvent[], error: result.error };

  const seenIds = new Set<string>();
  const data = (result.data ?? [])
    .flatMap((row) => {
      const business = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses;
      if (
        !business ||
        blockedIds.has(business.id) ||
        seenIds.has(row.id) ||
        !isPublishedUpcomingEvent(row, now)
      ) {
        return [];
      }
      seenIds.add(row.id);
      return [
        {
          id: row.id,
          title: row.title,
          description: row.description ?? '',
          starts_at: row.starts_at,
          ends_at: row.ends_at,
          address_text: row.address_text,
          location_mode: row.location_mode ?? 'business',
          timezone: row.timezone ?? 'America/Chicago',
          age_note: row.age_note,
          capacity_text: row.capacity_text,
          external_url: row.external_url,
          media_assets: row.media_assets ?? null,
          event_photos: row.event_photos ?? null,
          business: {
            id: business.id,
            name: business.name,
            primary_color: business.primary_color,
            business_photos: business.business_photos,
          },
        } satisfies FollowedEvent,
      ];
    })
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at) || a.id.localeCompare(b.id));
  return { data, error: null };
}

interface FollowingBusiness {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly category_summary: string | null;
  readonly city: string | null;
  readonly region_code: string | null;
  readonly created_at: string;
  readonly primary_color: string;
  readonly loyalty_programs:
    | readonly { readonly id: string; readonly is_active: boolean }[]
    | { readonly id: string; readonly is_active: boolean }
    | null;
  readonly events:
    | readonly {
        readonly id: string;
        readonly starts_at: string;
        readonly is_published: boolean;
        readonly publish_at: string | null;
        readonly archived_at: string | null;
      }[]
    | {
        readonly id: string;
        readonly starts_at: string;
        readonly is_published: boolean;
        readonly publish_at: string | null;
        readonly archived_at: string | null;
      }
    | null;
  readonly business_photos:
    | readonly {
        readonly role: string;
        readonly media_assets:
          | {
              readonly storage_path: string;
              readonly status: string;
              readonly alt_text: string | null;
            }
          | readonly {
              readonly storage_path: string;
              readonly status: string;
              readonly alt_text: string | null;
            }[]
          | null;
      }[]
    | {
        readonly role: string;
        readonly media_assets:
          | {
              readonly storage_path: string;
              readonly status: string;
              readonly alt_text: string | null;
            }
          | readonly {
              readonly storage_path: string;
              readonly status: string;
              readonly alt_text: string | null;
            }[]
          | null;
      }
    | null;
}

function relationList<T>(value: readonly T[] | T | null | undefined): readonly T[] {
  if (value == null) return [];
  return Array.isArray(value) ? (value as readonly T[]) : [value as T];
}

function colorWithAlpha(value: string, alpha: string) {
  const normalized = value.trim();
  return /^#[0-9a-f]{6}$/i.test(normalized) ? `${normalized}${alpha}` : normalized;
}

export default function RewardsScreen() {
  return <RewardsScreenContent />;
}

/** Dedicated entry point for the Calendar tab; it cannot fall back to wallet state. */
export function CalendarScreen() {
  return <RewardsScreenContent forceCalendar />;
}

function RewardsScreenContent({ forceCalendar = false }: { readonly forceCalendar?: boolean }) {
  const bottomPadding = useScreenBottomPadding();
  const { session, loading: authLoading } = useAuth();
  const params = useLocalSearchParams<{ scope?: string }>();
  const nearbyAlerts = useNearbyAlerts();
  const pathname = usePathname();
  // Native tabs can briefly report a group-prefixed pathname while mounting.
  // Treat any calendar route as the calendar destination so it never falls
  // through to the loyalty-card wallet view.
  const calendarOnly = forceCalendar || pathname === '/calendar' || pathname.endsWith('/calendar');
  const upcomingListOnly = calendarOnly && params.scope === 'all-upcoming';
  const allUpcoming = upcomingListOnly || (calendarOnly && !session);
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [cards, setCards] = useState<WalletCard[]>([]);
  const [reminders, setReminders] = useState<Record<string, ReminderPreference>>({});
  const [followedEvents, setFollowedEvents] = useState<FollowedEvent[]>([]);
  const [followingBusinesses, setFollowingBusinesses] = useState<FollowingBusiness[]>([]);
  const [selectedFollowingBusiness, setSelectedFollowingBusiness] =
    useState<FollowingBusiness | null>(null);
  const [view, setView] = useState<'wallet' | 'events' | 'following'>(() =>
    calendarOnly ? 'events' : 'wallet',
  );
  // Events belong to the Calendar destination. If a previously mounted
  // Rewards instance still has the old `events` state, keep that state from
  // leaking loyalty UI into the wrong destination.
  const activeView = calendarOnly ? 'events' : view === 'events' ? 'wallet' : view;
  const [selected, setSelected] = useState<WalletCard | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<FollowedEvent | null>(null);
  const [eventImageOpen, setEventImageOpen] = useState(false);
  const [mapInteractionActive, setMapInteractionActive] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedDayKey, setSelectedDayKey] = useState(() => dateKey(new Date()));
  const [token, setToken] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [followPendingId, setFollowPendingId] = useState<string | null>(null);
  const [confirmUnfollowId, setConfirmUnfollowId] = useState<string | null>(null);
  const [followingQuery, setFollowingQuery] = useState('');
  const [followingFeature, setFollowingFeature] = useState<'all' | 'rewards' | 'events'>('all');
  const [followingCategory, setFollowingCategory] = useState('all');
  const [followingCity, setFollowingCity] = useState('all');
  const [followingSort, setFollowingSort] = useState<'name' | 'recent'>('name');
  const [followingFiltersOpen, setFollowingFiltersOpen] = useState(false);

  const loadWallet = useCallback(async () => {
    if (!session) {
      setCards([]);
      setReminders({});
      setFollowingBusinesses([]);
      setSelectedFollowingBusiness(null);
      setEventImageOpen(false);
      if (allUpcoming) {
        setLoading(true);
        setMessage('');
        const publicEvents = await loadPublicUpcomingEvents(new Set());
        setFollowedEvents(publicEvents.data);
        if (publicEvents.error) {
          setMessage(
            userMessageFromError(
              publicEvents.error,
              'We could not load upcoming events right now.',
            ),
          );
        }
        setLoading(false);
      } else {
        setFollowedEvents([]);
      }
      return;
    }
    setLoading(true);
    setMessage('');
    const [walletResultInitial, eventsResult, followingResult, blockedResult] = await Promise.all([
      supabase.rpc('get_loyalty_wallet_v2'),
      supabase
        .from('event_saves')
        .select('event_id, reminder_enabled, reminder_minutes_before, reminder_frequency')
        .eq('customer_id', session.user.id),
      supabase
        .from('business_follows')
        .select(
          'business_id, businesses!inner(id, name, description, category_summary, city, region_code, created_at, primary_color, business_photos(role, media_assets(storage_path, status, alt_text)), loyalty_programs(id, is_active), events(id, starts_at, is_published, publish_at, archived_at))',
        )
        .eq('customer_id', session.user.id),
      loadBlockedBusinessIds(session.user.id).then(
        (data) => ({ data, error: null }),
        (error: unknown) => ({ data: new Set<string>(), error }),
      ),
    ]);
    const walletResult =
      walletResultInitial.error &&
      /function .*get_loyalty_wallet_v2.*does not exist/i.test(walletResultInitial.error.message)
        ? await supabase.rpc('get_loyalty_wallet')
        : walletResultInitial;
    const firstError =
      walletResult.error ?? eventsResult.error ?? followingResult.error ?? blockedResult.error;
    if (firstError) {
      setMessage(
        userMessageFromError(firstError, 'We could not load your wallet and reminders right now.'),
      );
    } else {
      const walletCards = ((walletResult.data ?? []) as WalletCard[]).filter(
        (card) => !blockedResult.data.has(card.business_id),
      );
      const walletIds = [...new Set(walletCards.map((card) => card.business_id))];
      const identityResult = walletIds.length
        ? await supabase
            .from('businesses')
            .select('id, business_photos(role, media_assets(storage_path, status))')
            .in('id', walletIds)
        : { data: [] };
      const walletPhotos = new Map(
        (identityResult.data ?? []).map((business) => [business.id, business.business_photos]),
      );
      setCards(
        walletCards.map((card) => ({
          ...card,
          business_photos: walletPhotos.get(card.business_id) ?? [],
        })),
      );
      setReminders(
        Object.fromEntries(
          (eventsResult.data ?? []).map((row) => [
            row.event_id,
            {
              reminder_enabled: Boolean(row.reminder_enabled),
              reminder_minutes_before: row.reminder_minutes_before ?? 1440,
              reminder_frequency: (row.reminder_frequency ?? 'once') as ReminderFrequency,
            } satisfies ReminderPreference,
          ]),
        ),
      );
      const businesses = filterBlockedBusinesses(
        (followingResult.data ?? []).flatMap((row) => {
          const business = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses;
          return business ? [business as FollowingBusiness] : [];
        }),
        blockedResult.data,
      );
      setFollowingBusinesses(businesses);

      if (allUpcoming) {
        const publicEvents = await loadPublicUpcomingEvents(blockedResult.data);
        setFollowedEvents(publicEvents.data);
        if (publicEvents.error) {
          setMessage(
            userMessageFromError(
              publicEvents.error,
              'We could not load upcoming events right now.',
            ),
          );
        }
      } else {
        const businessIds = businesses.map((business) => business.id);
        if (!businessIds.length) {
          setFollowedEvents([]);
        } else {
          const followedResult = await supabase
            .from('events')
            .select(
              'id, title, description, starts_at, ends_at, address_text, location_mode, timezone, age_note, capacity_text, external_url, media_assets(storage_path, status, alt_text, width, height), event_photos(id, caption, display_order, media_assets(storage_path, status, alt_text, width, height)), businesses!inner(id, name, primary_color, business_photos(role, media_assets(storage_path, status)))',
            )
            .in('business_id', businessIds)
            .eq('is_published', true)
            .is('archived_at', null)
            .gte('starts_at', new Date().toISOString())
            .order('starts_at', { ascending: true });
          if (followedResult.error) {
            setMessage(
              userMessageFromError(
                followedResult.error,
                'We could not load upcoming events right now.',
              ),
            );
            setFollowedEvents([]);
          } else {
            setFollowedEvents(
              filterBlockedEvents(
                (followedResult.data ?? []).flatMap((row) => {
                  const business = Array.isArray(row.businesses)
                    ? row.businesses[0]
                    : row.businesses;
                  if (!business) return [];
                  return [
                    {
                      id: row.id,
                      title: row.title,
                      description: row.description ?? '',
                      starts_at: row.starts_at,
                      ends_at: row.ends_at,
                      address_text: row.address_text,
                      location_mode: row.location_mode ?? 'business',
                      timezone: row.timezone ?? 'America/Chicago',
                      age_note: row.age_note,
                      capacity_text: row.capacity_text,
                      external_url: row.external_url,
                      media_assets: row.media_assets ?? null,
                      event_photos: row.event_photos ?? null,
                      business,
                    } satisfies FollowedEvent,
                  ];
                }),
                blockedResult.data,
              ),
            );
          }
        }
      }
    }
    setLoading(false);
  }, [allUpcoming, session]);

  useFocusEffect(
    useCallback(() => {
      void loadWallet();
    }, [loadWallet]),
  );

  async function unfollowBusiness(business: FollowingBusiness) {
    if (!session || followPendingId || confirmUnfollowId !== business.id) return;
    const previousBusinesses = followingBusinesses;
    setFollowPendingId(business.id);
    setFollowingBusinesses((current) => current.filter((item) => item.id !== business.id));
    setMessage('');
    const { error } = await supabase
      .from('business_follows')
      .delete()
      .eq('business_id', business.id)
      .eq('customer_id', session.user.id);
    setFollowPendingId(null);
    if (error) {
      void haptics.error();
      setConfirmUnfollowId(null);
      setFollowingBusinesses(previousBusinesses);
      setMessage(userMessageFromError(error, 'We could not unfollow this business.'));
      return;
    }
    setConfirmUnfollowId(null);
    setMessage(`You are no longer following ${business.name}.`);
    await nearbyAlerts.refresh();
    void haptics.success();
  }

  function handleFollowingPress(business: FollowingBusiness) {
    if (followPendingId) return;
    if (confirmUnfollowId === business.id) {
      void haptics.medium();
      void unfollowBusiness(business);
      return;
    }
    setConfirmUnfollowId(business.id);
    void haptics.selection();
    setMessage(`Tap “Confirm unfollow” again to stop following ${business.name}.`);
  }

  async function toggleEventReminder(event: FollowedEvent) {
    if (!session) return;
    void haptics.selection();
    const current = reminders[event.id];
    const nextEnabled = current ? !current.reminder_enabled : true;
    const result = current
      ? await supabase
          .from('event_saves')
          .update({ reminder_enabled: nextEnabled })
          .eq('event_id', event.id)
          .eq('customer_id', session.user.id)
      : await supabase.from('event_saves').insert({
          event_id: event.id,
          customer_id: session.user.id,
          reminder_enabled: true,
          reminder_minutes_before: 1440,
          reminder_frequency: 'once',
        });
    const { error } = result;
    if (error) {
      void haptics.error();
      setMessage(userMessageFromError(error, 'We could not update that event reminder.'));
      return;
    }
    setReminders((currentReminders) => ({
      ...currentReminders,
      [event.id]: {
        reminder_enabled: nextEnabled,
        reminder_minutes_before: current?.reminder_minutes_before ?? 1440,
        reminder_frequency: current?.reminder_frequency ?? 'once',
      },
    }));
    setMessage(nextEnabled ? 'Reminder enabled for this event.' : 'Reminder turned off.');
    void haptics.success();
  }

  async function setReminderTiming(event: FollowedEvent, minutes: number) {
    if (!session) return;
    const result = reminders[event.id]
      ? await supabase
          .from('event_saves')
          .update({ reminder_enabled: true, reminder_minutes_before: minutes })
          .eq('event_id', event.id)
          .eq('customer_id', session.user.id)
      : await supabase.from('event_saves').insert({
          event_id: event.id,
          customer_id: session.user.id,
          reminder_enabled: true,
          reminder_minutes_before: minutes,
          reminder_frequency: 'once',
        });
    if (result.error) {
      void haptics.error();
      setMessage(userMessageFromError(result.error, 'We could not update that reminder time.'));
      return;
    }
    setReminders((currentReminders) => ({
      ...currentReminders,
      [event.id]: {
        reminder_enabled: true,
        reminder_minutes_before: minutes,
        reminder_frequency: reminders[event.id]?.reminder_frequency ?? 'once',
      },
    }));
    setMessage('Reminder time updated.');
    void haptics.success();
  }

  async function setReminderFrequency(event: FollowedEvent, frequency: ReminderFrequency) {
    if (!session) return;
    const result = reminders[event.id]
      ? await supabase
          .from('event_saves')
          .update({ reminder_enabled: true, reminder_frequency: frequency })
          .eq('event_id', event.id)
          .eq('customer_id', session.user.id)
      : await supabase.from('event_saves').insert({
          event_id: event.id,
          customer_id: session.user.id,
          reminder_enabled: true,
          reminder_minutes_before: 1440,
          reminder_frequency: frequency,
        });
    if (result.error) {
      void haptics.error();
      setMessage(userMessageFromError(result.error, 'We could not update that reminder pattern.'));
      return;
    }
    setReminders((currentReminders) => ({
      ...currentReminders,
      [event.id]: {
        reminder_enabled: true,
        reminder_minutes_before: reminders[event.id]?.reminder_minutes_before ?? 1440,
        reminder_frequency: frequency,
      },
    }));
    setMessage('Reminder pattern updated.');
    void haptics.success();
  }

  useEffect(() => {
    if (!selected) return;
    let active = true;
    const refresh = async () => {
      const { data, error } = await supabase.functions.invoke('loyalty-token', {
        body: { membershipId: selected.membership_id },
      });
      if (!active) return;
      if (error || !data?.token) {
        setMessage(
          userMessageFromError(error, 'We could not create a rewards code. Please try again.'),
        );
      } else {
        setToken(data.token);
        setMessage('Show this rotating code to the staff member.');
      }
    };
    void refresh();
    const interval = setInterval(() => void refresh(), 30_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selected]);

  const reminderEnabledIds = useMemo(
    () =>
      new Set(
        Object.entries(reminders)
          .filter(([, value]) => value.reminder_enabled)
          .map(([id]) => id),
      ),
    [reminders],
  );
  const eventsByDay = useMemo(() => {
    const grouped = new Map<string, FollowedEvent[]>();
    followedEvents.forEach((event) => {
      const key = dateKey(new Date(event.starts_at));
      const current = grouped.get(key) ?? [];
      current.push(event);
      grouped.set(key, current);
    });
    return grouped;
  }, [followedEvents]);
  const calendarDays = useMemo(() => buildCalendarDays(calendarMonth), [calendarMonth]);
  const activeSelectedDayKey = allUpcoming ? '' : selectedDayKey;
  const selectedDayEvents = activeSelectedDayKey
    ? (eventsByDay.get(activeSelectedDayKey) ?? [])
    : [];
  const followingCities = useMemo(
    () =>
      Array.from(
        new Set(followingBusinesses.map((business) => business.city).filter(Boolean)),
      ).sort((a, b) => (a ?? '').localeCompare(b ?? '')) as string[],
    [followingBusinesses],
  );
  const followingCategories = useMemo(
    () =>
      Array.from(
        new Set(
          followingBusinesses.map((business) => business.category_summary?.trim()).filter(Boolean),
        ),
      ).sort((a, b) => (a ?? '').localeCompare(b ?? '')) as string[],
    [followingBusinesses],
  );
  const visibleFollowingBusinesses = useMemo(() => {
    const normalizedQuery = followingQuery.trim().toLowerCase();
    return followingBusinesses
      .filter((business) => {
        const now = new Date().toISOString();
        const hasRewards = relationList(business.loyalty_programs).some(
          (program) => program.is_active,
        );
        const hasUpcomingEvents = relationList(business.events).some(
          (event) =>
            event.archived_at === null &&
            event.starts_at > now &&
            (event.is_published || (event.publish_at !== null && event.publish_at <= now)),
        );
        const matchesFeature =
          followingFeature === 'all' ||
          (followingFeature === 'rewards' ? hasRewards : hasUpcomingEvents);
        const matchesCity = followingCity === 'all' || business.city === followingCity;
        const matchesCategory =
          followingCategory === 'all' || business.category_summary === followingCategory;
        const matchesQuery =
          !normalizedQuery ||
          [
            business.name,
            business.description,
            business.category_summary,
            business.city,
            business.region_code,
          ].some((value) => value?.toLowerCase().includes(normalizedQuery));
        return matchesFeature && matchesCity && matchesCategory && matchesQuery;
      })
      .sort((a, b) =>
        followingSort === 'recent'
          ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          : a.name.localeCompare(b.name),
      );
  }, [
    followingBusinesses,
    followingCategory,
    followingCity,
    followingFeature,
    followingQuery,
    followingSort,
  ]);
  const activeFollowingFilterCount = [
    followingFeature !== 'all',
    followingCategory !== 'all',
    followingCity !== 'all',
    followingSort !== 'name',
  ].filter(Boolean).length;
  const isDetail = Boolean(selected || selectedEvent || selectedFollowingBusiness);

  if (authLoading)
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    );
  const selectedTextColor = colors.text;

  return (
    <SwipeBackView
      enabled={isDetail && !eventImageOpen && !mapInteractionActive}
      onSwipeBack={() => {
        if (selectedFollowingBusiness) {
          setSelectedFollowingBusiness(null);
        } else if (selected) {
          setSelected(null);
          setToken('');
        } else {
          setSelectedEvent(null);
        }
      }}
      underlay={
        isDetail ? (
          <RewardsDestinationUnderlay
            allUpcoming={allUpcoming}
            cards={cards}
            events={followedEvents}
            followingBusinesses={visibleFollowingBusinesses}
            reminderEnabledIds={reminderEnabledIds}
            view={activeView}
            calendarOnly={calendarOnly}
            upcomingListOnly={upcomingListOnly}
          />
        ) : null
      }
    >
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.container} edges={['top']}>
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
            scrollEnabled={!eventImageOpen && !mapInteractionActive}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadWallet} />}
          >
            {!isDetail ? (
              <>
                <AppChrome />
                <View style={calendarOnly || upcomingListOnly ? styles.calendarHero : styles.hero}>
                  <ThemedText
                    style={[styles.eyebrow, { color: colors.textSecondary }]}
                    type="smallBold"
                  >
                    {upcomingListOnly
                      ? 'DISCOVER'
                      : calendarOnly
                        ? 'CUSTOMER CALENDAR'
                        : 'CUSTOMER WALLET'}
                  </ThemedText>
                  <ThemedText type="title">
                    {upcomingListOnly ? 'Upcoming events' : calendarOnly ? 'Calendar' : 'Rewards'}
                  </ThemedText>
                  <ThemedText themeColor="textSecondary">
                    {upcomingListOnly
                      ? 'Browse every public upcoming event from Discover.'
                      : calendarOnly
                        ? allUpcoming
                          ? 'Browse public events by date.'
                          : 'Events from businesses you follow, with reminders when you need them.'
                        : 'Keep your loyalty cards and favorite businesses close by.'}
                  </ThemedText>
                </View>
              </>
            ) : selectedFollowingBusiness || selectedEvent ? null : (
              <View style={styles.detailIntro}>
                <ThemedText
                  style={[styles.eyebrow, { color: colors.textSecondary }]}
                  type="smallBold"
                >
                  REWARDS WALLET
                </ThemedText>
                <ThemedText themeColor="textSecondary" type="small">
                  Your rotating code refreshes automatically for secure checkout.
                </ThemedText>
              </View>
            )}
            {session && !isDetail && !calendarOnly && !upcomingListOnly && (
              <View accessibilityRole="radiogroup" style={styles.segmentedControl}>
                <SegmentButton
                  count={loading ? undefined : cards.length}
                  label="Rewards"
                  selected={activeView === 'wallet'}
                  onPress={() => setView('wallet')}
                />
                <SegmentButton
                  count={followingBusinesses.length}
                  label="Following"
                  selected={activeView === 'following'}
                  onPress={() => setView('following')}
                />
              </View>
            )}
            {!session && !calendarOnly && !upcomingListOnly ? (
              <View style={[styles.notice, { backgroundColor: colors.backgroundElement }]}>
                <ThemedText style={[styles.noticeText, { color: colors.textSecondary }]}>
                  Sign in from Account to use rewards.
                </ThemedText>
              </View>
            ) : loading ? (
              <ListLoading label={calendarOnly ? 'Loading events' : 'Loading rewards'} />
            ) : activeView === 'following' && !isDetail ? (
              followingBusinesses.length ? (
                <>
                  <View style={styles.followingSearchRow}>
                    <TextInput
                      autoCapitalize="none"
                      accessibilityLabel="Search followed businesses"
                      clearButtonMode="while-editing"
                      onChangeText={setFollowingQuery}
                      placeholder="Search followed businesses"
                      placeholderTextColor={colors.textSecondary}
                      returnKeyType="search"
                      style={[
                        styles.followingSearchInput,
                        { color: colors.text, backgroundColor: colors.backgroundElement },
                      ]}
                      value={followingQuery}
                    />
                    <Pressable
                      accessibilityLabel="Filter followed businesses"
                      accessibilityRole="button"
                      onPress={() => setFollowingFiltersOpen(true)}
                      style={({ pressed }) => [
                        styles.followingFilterButton,
                        activeFollowingFilterCount > 0 && styles.followingFilterButtonActive,
                        pressed && styles.followingFilterButtonPressed,
                      ]}
                    >
                      <ThemedText
                        style={
                          activeFollowingFilterCount > 0
                            ? styles.followingFilterButtonTextActive
                            : undefined
                        }
                        type="smallBold"
                      >
                        Filter{activeFollowingFilterCount ? ` · ${activeFollowingFilterCount}` : ''}
                      </ThemedText>
                    </Pressable>
                  </View>
                  <Modal
                    animationType="slide"
                    onRequestClose={() => setFollowingFiltersOpen(false)}
                    transparent
                    visible={followingFiltersOpen}
                  >
                    <View style={styles.followingFilterModal}>
                      <Pressable
                        accessibilityLabel="Close following filters"
                        accessibilityRole="button"
                        onPress={() => setFollowingFiltersOpen(false)}
                        style={styles.followingFilterBackdrop}
                      />
                      <View
                        style={[
                          styles.followingFilterSheet,
                          { backgroundColor: colors.backgroundElement },
                        ]}
                      >
                        <View style={styles.followingFilterHandle} />
                        <View style={styles.followingFilterHeader}>
                          <View style={styles.followingFilterHeaderCopy}>
                            <ThemedText type="subtitle">Filter following</ThemedText>
                            <ThemedText numberOfLines={2} themeColor="textSecondary" type="small">
                              Choose what to show.
                            </ThemedText>
                          </View>
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => setFollowingFiltersOpen(false)}
                            style={styles.followingFilterDone}
                          >
                            <ThemedText style={styles.followingFilterDoneText} type="smallBold">
                              Done
                            </ThemedText>
                          </Pressable>
                        </View>
                        <ScrollView
                          contentContainerStyle={styles.followingFilterScrollContent}
                          showsVerticalScrollIndicator={false}
                          style={styles.followingFilterScroll}
                        >
                          <View style={styles.followingFilterGroup}>
                            <ThemedText themeColor="textSecondary" type="smallBold">
                              Highlights
                            </ThemedText>
                            <View
                              accessibilityRole="radiogroup"
                              style={styles.followingFilterOptions}
                            >
                              {[
                                { value: 'all' as const, label: 'Everything' },
                                { value: 'rewards' as const, label: 'Rewards' },
                                { value: 'events' as const, label: 'Upcoming events' },
                              ].map((option) => {
                                const selected = followingFeature === option.value;
                                return (
                                  <Pressable
                                    accessibilityRole="radio"
                                    accessibilityState={{ checked: selected }}
                                    key={option.value}
                                    onPress={() => setFollowingFeature(option.value)}
                                    style={[
                                      styles.followingFilterOption,
                                      selected && styles.followingFilterOptionSelected,
                                    ]}
                                  >
                                    <ThemedText
                                      style={[
                                        styles.followingFilterOptionLabel,
                                        selected && styles.followingFilterOptionTextSelected,
                                      ]}
                                    >
                                      {option.label}
                                    </ThemedText>
                                    {selected && (
                                      <ThemedText style={styles.followingFilterCheck}>✓</ThemedText>
                                    )}
                                  </Pressable>
                                );
                              })}
                            </View>
                          </View>
                          <ChoicePicker
                            label="Category"
                            options={[
                              { value: 'all', label: 'All categories' },
                              ...followingCategories.map((category) => ({
                                value: category,
                                label: category,
                              })),
                            ]}
                            value={followingCategory}
                            onChange={setFollowingCategory}
                          />
                          <View style={styles.followingFilterGroup}>
                            <ThemedText themeColor="textSecondary" type="smallBold">
                              Location
                            </ThemedText>
                            <View
                              accessibilityRole="radiogroup"
                              style={styles.followingFilterOptions}
                            >
                              {[
                                { value: 'all', label: 'All cities' },
                                ...followingCities.map((city) => ({ value: city, label: city })),
                              ].map((option) => {
                                const selected = followingCity === option.value;
                                return (
                                  <Pressable
                                    accessibilityRole="radio"
                                    accessibilityState={{ checked: selected }}
                                    key={option.value}
                                    onPress={() => setFollowingCity(option.value)}
                                    style={[
                                      styles.followingFilterOption,
                                      selected && styles.followingFilterOptionSelected,
                                    ]}
                                  >
                                    <ThemedText
                                      style={[
                                        styles.followingFilterOptionLabel,
                                        selected && styles.followingFilterOptionTextSelected,
                                      ]}
                                    >
                                      {option.label}
                                    </ThemedText>
                                    {selected && (
                                      <ThemedText style={styles.followingFilterCheck}>✓</ThemedText>
                                    )}
                                  </Pressable>
                                );
                              })}
                            </View>
                          </View>
                          <View style={styles.followingFilterGroup}>
                            <ThemedText themeColor="textSecondary" type="smallBold">
                              Sort by
                            </ThemedText>
                            <View
                              accessibilityRole="radiogroup"
                              style={styles.followingFilterOptions}
                            >
                              {[
                                { value: 'name' as const, label: 'A–Z' },
                                { value: 'recent' as const, label: 'Recently added' },
                              ].map((option) => {
                                const selected = followingSort === option.value;
                                return (
                                  <Pressable
                                    accessibilityRole="radio"
                                    accessibilityState={{ checked: selected }}
                                    key={option.value}
                                    onPress={() => setFollowingSort(option.value)}
                                    style={[
                                      styles.followingFilterOption,
                                      selected && styles.followingFilterOptionSelected,
                                    ]}
                                  >
                                    <ThemedText
                                      style={[
                                        styles.followingFilterOptionLabel,
                                        selected && styles.followingFilterOptionTextSelected,
                                      ]}
                                    >
                                      {option.label}
                                    </ThemedText>
                                    {selected && (
                                      <ThemedText style={styles.followingFilterCheck}>✓</ThemedText>
                                    )}
                                  </Pressable>
                                );
                              })}
                            </View>
                          </View>
                          {activeFollowingFilterCount > 0 && (
                            <Pressable
                              accessibilityRole="button"
                              onPress={() => {
                                setFollowingFeature('all');
                                setFollowingCategory('all');
                                setFollowingCity('all');
                                setFollowingSort('name');
                              }}
                              style={styles.followingFilterClear}
                            >
                              <ThemedText type="smallBold">Clear all filters</ThemedText>
                            </Pressable>
                          )}
                        </ScrollView>
                      </View>
                    </View>
                  </Modal>
                  {!visibleFollowingBusinesses.length && (
                    <View style={[styles.notice, { backgroundColor: colors.backgroundElement }]}>
                      <ThemedText
                        style={[styles.noticeText, { color: colors.textSecondary }]}
                        type="smallBold"
                      >
                        No followed businesses match
                      </ThemedText>
                      <ThemedText
                        style={[styles.noticeText, { color: colors.textSecondary }]}
                        type="small"
                      >
                        Try a different name, city, or filter.
                      </ThemedText>
                    </View>
                  )}
                  <View style={styles.followingList}>
                    {visibleFollowingBusinesses.map((business) => {
                      const confirmingUnfollow = confirmUnfollowId === business.id;
                      return (
                        <View key={business.id} style={styles.followingCard}>
                          <View
                            style={[
                              styles.followingAccent,
                              { backgroundColor: business.primary_color },
                            ]}
                          />
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => {
                              setConfirmUnfollowId(null);
                              setSelectedFollowingBusiness(business);
                            }}
                            style={({ pressed }) => [
                              styles.followingMain,
                              pressed && styles.followingMainPressed,
                            ]}
                          >
                            <BusinessLogo
                              name={business.name}
                              photos={relationList(business.business_photos)}
                              size={44}
                              decorative
                            />
                            <View style={styles.followingIdentity}>
                              <ThemedText
                                numberOfLines={1}
                                style={styles.followingName}
                                type="smallBold"
                              >
                                {business.name}
                              </ThemedText>
                              <ThemedText themeColor="textSecondary" type="small">
                                {[business.city, business.region_code].filter(Boolean).join(', ') ||
                                  'Local business'}
                              </ThemedText>
                            </View>
                            <ThemedText
                              style={[styles.followingChevron, { color: colors.textSecondary }]}
                              type="subtitle"
                            >
                              ›
                            </ThemedText>
                          </Pressable>
                          <Pressable
                            accessibilityLabel={`Unfollow ${business.name}`}
                            accessibilityHint={
                              confirmingUnfollow
                                ? 'Tap again to confirm unfollowing this business.'
                                : 'Tap once to show the unfollow confirmation.'
                            }
                            accessibilityRole="button"
                            disabled={followPendingId === business.id}
                            onPress={() => handleFollowingPress(business)}
                            style={({ pressed }) => [
                              styles.followingBadge,
                              confirmingUnfollow && styles.followingBadgeConfirm,
                              pressed && styles.followingBadgePressed,
                            ]}
                          >
                            <ThemedText
                              style={[
                                styles.followingBadgeText,
                                { color: colors.accent },
                                confirmingUnfollow && styles.followingBadgeConfirmText,
                              ]}
                              type="smallBold"
                            >
                              {followPendingId === business.id
                                ? 'Removing…'
                                : confirmingUnfollow
                                  ? 'Confirm unfollow'
                                  : 'Following'}
                            </ThemedText>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                </>
              ) : (
                <View style={[styles.notice, { backgroundColor: colors.backgroundElement }]}>
                  <ThemedText
                    style={[styles.noticeText, { color: colors.textSecondary }]}
                    type="smallBold"
                  >
                    You are not following any businesses yet
                  </ThemedText>
                  <ThemedText style={[styles.noticeText, { color: colors.textSecondary }]}>
                    Follow a business from Discover and it will appear here.
                  </ThemedText>
                </View>
              )
            ) : selectedFollowingBusiness ? (
              <PublicBusinessPageContent
                businessId={selectedFollowingBusiness.id}
                onViewerChange={setEventImageOpen}
                onMapInteractionChange={setMapInteractionActive}
                onFollowingChange={(following) => {
                  if (!following) {
                    setFollowingBusinesses((current) =>
                      current.filter((item) => item.id !== selectedFollowingBusiness.id),
                    );
                  }
                }}
              />
            ) : selectedEvent ? (
              <EventDetail
                canSetReminder={Boolean(session)}
                event={selectedEvent}
                isReminded={reminderEnabledIds.has(selectedEvent.id)}
                reminderMinutes={reminders[selectedEvent.id]?.reminder_minutes_before ?? 1440}
                reminderFrequency={reminders[selectedEvent.id]?.reminder_frequency ?? 'once'}
                onBack={() => {
                  setEventImageOpen(false);
                  setSelectedEvent(null);
                }}
                onFullscreenChange={setEventImageOpen}
                onToggleReminder={() => void toggleEventReminder(selectedEvent)}
                onSetReminderTiming={(minutes) => void setReminderTiming(selectedEvent, minutes)}
                onSetReminderFrequency={(frequency) =>
                  void setReminderFrequency(selectedEvent, frequency)
                }
              />
            ) : selected ? (
              <View style={[styles.detailCard, { backgroundColor: colors.backgroundElement }]}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setSelected(null);
                    setToken('');
                  }}
                  style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }}
                >
                  <ThemedText style={{ color: selectedTextColor }}>← All rewards</ThemedText>
                </Pressable>
                <View style={{ marginHorizontal: -24, overflow: 'hidden', borderRadius: 16 }}>
                  <BusinessBrandHeader
                    name={selected.business_name}
                    title={selected.program_name}
                    color={selected.primary_color}
                    photos={selected.business_photos}
                  />
                </View>
                <ThemedText style={{ color: selectedTextColor }}>
                  {selected.reward_description}
                </ThemedText>
                {selected.program_type === 'points' ? (
                  <>
                    <View style={styles.pointsDetailRow}>
                      <ThemedText style={{ color: selectedTextColor }} type="title">
                        {selected.available_points ?? 0}
                      </ThemedText>
                      <ThemedText style={{ color: selectedTextColor }} type="smallBold">
                        points
                      </ThemedText>
                    </View>
                    <View
                      style={[
                        styles.progressTrack,
                        { backgroundColor: colorWithAlpha(selectedTextColor, '35') },
                      ]}
                    >
                      <View
                        style={[
                          styles.progressFill,
                          {
                            backgroundColor: selectedTextColor,
                            width: `${Math.min(100, ((selected.progress_points ?? 0) / Math.max(1, selected.points_required ?? 1)) * 100)}%`,
                          },
                        ]}
                      />
                    </View>
                    <ThemedText style={{ color: selectedTextColor }} type="smallBold">
                      {selected.rewards_ready
                        ? `${selected.rewards_ready} reward${selected.rewards_ready === 1 ? '' : 's'} ready`
                        : `${selected.progress_points ?? 0} / ${selected.points_required ?? 0} points`}
                    </ThemedText>
                  </>
                ) : (
                  <>
                    <View style={styles.progressRow}>
                      {Array.from({ length: selected.stamps_required ?? 0 }, (_, index) => (
                        <View
                          key={index}
                          style={[
                            styles.stamp,
                            { borderColor: selectedTextColor },
                            index < (selected.progress_stamps ?? 0) && {
                              backgroundColor: selectedTextColor,
                              opacity: 1,
                            },
                          ]}
                        />
                      ))}
                    </View>
                    <ThemedText style={{ color: selectedTextColor }} type="smallBold">
                      {selected.rewards_ready
                        ? `${selected.rewards_ready} reward ready`
                        : `${selected.progress_stamps ?? 0} / ${selected.stamps_required ?? 0} visits`}
                    </ThemedText>
                  </>
                )}
                <View style={styles.qrCard}>
                  <ThemedText style={styles.qrTitle} type="smallBold">
                    Show this code at checkout
                  </ThemedText>
                  {token ? (
                    <QRCode value={token} size={245} />
                  ) : (
                    <ActivityIndicator color="#176B4D" />
                  )}
                  <ThemedText style={styles.qrHint} type="small">
                    The code refreshes every 30 seconds.
                  </ThemedText>
                </View>
                <ThemedText style={{ color: selectedTextColor }} type="small">
                  {message}
                </ThemedText>
              </View>
            ) : activeView === 'events' ? (
              <View style={styles.eventsView}>
                {!upcomingListOnly && (
                  <CalendarCard
                    allUpcoming={allUpcoming}
                    calendarMonth={calendarMonth}
                    calendarDays={calendarDays}
                    eventsByDay={eventsByDay}
                    selectedDayKey={activeSelectedDayKey}
                    onSelectDay={setSelectedDayKey}
                    onChangeMonth={(offset) => {
                      setCalendarMonth(
                        (current) =>
                          new Date(current.getFullYear(), current.getMonth() + offset, 1),
                      );
                      setSelectedDayKey('');
                    }}
                  />
                )}
                {allUpcoming ? (
                  <View style={styles.dayEventsSection}>
                    <View style={styles.dayEventsHeader}>
                      <ThemedText type="subtitle">
                        {upcomingListOnly ? 'All events' : 'Upcoming events'}
                      </ThemedText>
                      <ThemedText themeColor="textSecondary" type="small">
                        {followedEvents.length} {followedEvents.length === 1 ? 'event' : 'events'}
                      </ThemedText>
                    </View>
                    {followedEvents.map((event) => (
                      <EventRow
                        key={event.id}
                        event={event}
                        isReminded={reminderEnabledIds.has(event.id)}
                        onPress={() => setSelectedEvent(event)}
                      />
                    ))}
                  </View>
                ) : activeSelectedDayKey ? (
                  <View style={styles.dayEventsSection}>
                    <View style={styles.dayEventsHeader}>
                      <ThemedText type="subtitle">
                        {formatDayLabel(activeSelectedDayKey)}
                      </ThemedText>
                      <ThemedText themeColor="textSecondary" type="small">
                        {selectedDayEvents.length
                          ? `${selectedDayEvents.length} event${selectedDayEvents.length === 1 ? '' : 's'}`
                          : 'No events'}
                      </ThemedText>
                    </View>
                    {selectedDayEvents.length ? (
                      selectedDayEvents.map((event) => (
                        <EventRow
                          key={event.id}
                          event={event}
                          isReminded={reminderEnabledIds.has(event.id)}
                          onPress={() => setSelectedEvent(event)}
                        />
                      ))
                    ) : (
                      <View style={[styles.notice, { backgroundColor: colors.backgroundElement }]}>
                        <ThemedText
                          style={[styles.noticeText, { color: colors.textSecondary }]}
                          type="smallBold"
                        >
                          Nothing scheduled for this day
                        </ThemedText>
                        <ThemedText
                          style={[styles.noticeText, { color: colors.textSecondary }]}
                          type="small"
                        >
                          Tap a day with a dot to see events from businesses you follow.
                        </ThemedText>
                      </View>
                    )}
                  </View>
                ) : null}
                {!loading && !followedEvents.length && (
                  <View style={[styles.notice, { backgroundColor: colors.backgroundElement }]}>
                    <ThemedText
                      style={[styles.noticeText, { color: colors.textSecondary }]}
                      type="smallBold"
                    >
                      No upcoming events yet
                    </ThemedText>
                    <ThemedText
                      style={[styles.noticeText, { color: colors.textSecondary }]}
                      type="small"
                    >
                      {allUpcoming
                        ? 'New public events will appear here when businesses publish them.'
                        : 'Follow more businesses in Discover to fill your calendar.'}
                    </ThemedText>
                    <Pressable
                      onPress={() => router.replace('/explore')}
                      style={styles.noticeButton}
                    >
                      <ThemedText style={styles.noticeButtonText} type="smallBold">
                        Discover businesses
                      </ThemedText>
                    </Pressable>
                  </View>
                )}
              </View>
            ) : cards.length ? (
              <View style={styles.cardList}>
                {cards.map((card) => {
                  const accentColor = brandColor(card.primary_color);

                  return (
                    <Pressable
                      accessibilityLabel={`${card.business_name}, ${card.program_name}`}
                      accessibilityRole="button"
                      key={card.membership_id}
                      onPress={() => setSelected(card)}
                      style={[
                        styles.walletCard,
                        {
                          backgroundColor: colors.backgroundElement,
                          borderColor: colors.divider,
                        },
                      ]}
                    >
                      <BusinessBrandHeader
                        name={card.business_name}
                        title={card.program_name}
                        color={card.primary_color}
                        photos={card.business_photos}
                        trailing
                      />
                      <View style={styles.walletCardBody}>
                        <ThemedText themeColor="textSecondary" numberOfLines={2} type="small">
                          {card.reward_description}
                        </ThemedText>
                        <View style={styles.walletProgressHeader}>
                          <ThemedText style={styles.walletProgressLabel} type="smallBold">
                            {card.rewards_ready
                              ? `${card.rewards_ready} reward${card.rewards_ready === 1 ? '' : 's'} ready`
                              : card.program_type === 'points'
                                ? `${card.progress_points ?? 0} of ${card.points_required ?? 0} points`
                                : `${card.progress_stamps ?? 0} of ${card.stamps_required ?? 0} visits`}
                          </ThemedText>
                          <ThemedText themeColor="textSecondary" type="small">
                            {Math.round(
                              Math.min(
                                100,
                                ((card.program_type === 'points'
                                  ? (card.progress_points ?? 0)
                                  : (card.progress_stamps ?? 0)) /
                                  Math.max(
                                    1,
                                    card.program_type === 'points'
                                      ? (card.points_required ?? 1)
                                      : (card.stamps_required ?? 1),
                                  )) *
                                  100,
                              ),
                            )}
                            %
                          </ThemedText>
                        </View>
                        <View
                          accessibilityLabel={
                            card.program_type === 'points'
                              ? `${card.progress_points ?? 0} of ${card.points_required ?? 0} points complete`
                              : `${card.progress_stamps ?? 0} of ${card.stamps_required ?? 0} visits complete`
                          }
                          style={[
                            styles.progressTrack,
                            { backgroundColor: colors.backgroundSelected },
                          ]}
                        >
                          <View
                            style={[
                              styles.progressFill,
                              {
                                backgroundColor: accentColor,
                                width: `${Math.min(100, ((card.program_type === 'points' ? (card.progress_points ?? 0) : (card.progress_stamps ?? 0)) / Math.max(1, card.program_type === 'points' ? (card.points_required ?? 1) : (card.stamps_required ?? 1))) * 100)}%`,
                              },
                            ]}
                          />
                        </View>
                        <View style={styles.walletBottomRow}>
                          <ThemedText themeColor="textSecondary" type="small">
                            Tap to view details
                          </ThemedText>
                          {card.rewards_ready > 0 && (
                            <View
                              style={[
                                styles.walletReadyBadge,
                                { backgroundColor: colors.successSurface },
                              ]}
                            >
                              <ThemedText style={{ color: colors.successText }} type="smallBold">
                                Ready to redeem
                              </ThemedText>
                            </View>
                          )}
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View style={[styles.notice, { backgroundColor: colors.backgroundElement }]}>
                <ThemedText
                  style={[styles.noticeText, { color: colors.textSecondary }]}
                  type="smallBold"
                >
                  No rewards cards yet
                </ThemedText>
                <ThemedText style={[styles.noticeText, { color: colors.textSecondary }]}>
                  Join a program from a business page.
                </ThemedText>
                <Pressable onPress={() => router.replace('/explore')} style={styles.noticeButton}>
                  <ThemedText style={styles.noticeButtonText} type="smallBold">
                    Discover businesses
                  </ThemedText>
                </Pressable>
              </View>
            )}
            {message && !isDetail && <ThemedText themeColor="textSecondary">{message}</ThemedText>}
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    </SwipeBackView>
  );
}

function dateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function firstMediaAsset(
  value:
    | { readonly storage_path: string; readonly status: string; readonly alt_text: string | null }
    | readonly {
        readonly storage_path: string;
        readonly status: string;
        readonly alt_text: string | null;
      }[]
    | null
    | undefined,
) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDayLabel(key: string) {
  const [year = 0, month = 1, day = 1] = key.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function buildCalendarDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { date, key: dateKey(date), inMonth: date.getMonth() === month.getMonth() };
  });
}

function CalendarCard({
  allUpcoming,
  calendarMonth,
  calendarDays,
  eventsByDay,
  selectedDayKey,
  onSelectDay,
  onChangeMonth,
}: {
  readonly allUpcoming: boolean;
  readonly calendarMonth: Date;
  readonly calendarDays: { date: Date; key: string; inMonth: boolean }[];
  readonly eventsByDay: Map<string, FollowedEvent[]>;
  readonly selectedDayKey: string;
  readonly onSelectDay: (key: string) => void;
  readonly onChangeMonth: (offset: number) => void;
}) {
  const colors = useTheme();
  return (
    <View style={styles.calendarCard}>
      <View style={styles.calendarHeader}>
        <Pressable
          accessibilityLabel="Previous month"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => onChangeMonth(-1)}
          style={styles.monthArrow}
        >
          <ThemedText type="subtitle">‹</ThemedText>
        </Pressable>
        <ThemedText type="subtitle">
          {calendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </ThemedText>
        <Pressable
          accessibilityLabel="Next month"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => onChangeMonth(1)}
          style={styles.monthArrow}
        >
          <ThemedText type="subtitle">›</ThemedText>
        </Pressable>
      </View>
      <View style={styles.weekRow}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
          <ThemedText
            key={`${day}-${index}`}
            style={styles.weekLabel}
            themeColor="textSecondary"
            type="smallBold"
          >
            {day}
          </ThemedText>
        ))}
      </View>
      <View style={styles.dayGrid}>
        {calendarDays.map(({ date, key, inMonth }) => {
          const count = eventsByDay.get(key)?.length ?? 0;
          const isToday = key === dateKey(new Date());
          const isSelected = key === selectedDayKey;
          return (
            <Pressable
              accessibilityLabel={`${formatDayLabel(key)}${count ? `, ${count} event${count === 1 ? '' : 's'}` : ''}`}
              accessibilityRole="button"
              key={key}
              onPress={() => onSelectDay(key)}
              style={[styles.dayCell, isSelected && styles.dayCellSelected]}
            >
              <ThemedText
                style={[
                  styles.dayNumber,
                  !inMonth && styles.dayNumberMuted,
                  isToday && { color: colors.accent },
                  isSelected && styles.dayNumberSelected,
                ]}
                type="smallBold"
              >
                {date.getDate()}
              </ThemedText>
              {count > 0 && (
                <View style={[styles.eventCountDot, isSelected && styles.eventCountDotSelected]}>
                  <ThemedText
                    style={isSelected ? styles.eventCountTextSelected : styles.eventCountText}
                    type="smallBold"
                  >
                    {count > 9 ? '9+' : count}
                  </ThemedText>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      <ThemedText themeColor="textSecondary" style={styles.calendarHint} type="small">
        {allUpcoming
          ? 'Dots show public upcoming events. Browse the complete chronological list below.'
          : 'Dots show upcoming events from businesses you follow. Tap a day to see the list.'}
      </ThemedText>
    </View>
  );
}

function EventRow({
  event,
  isReminded,
  onPress,
}: {
  readonly event: FollowedEvent;
  readonly isReminded: boolean;
  readonly onPress: () => void;
}) {
  return (
    <EventCard
      title={event.title}
      businessName={event.business.name}
      photos={event.business.business_photos}
      startsAt={event.starts_at}
      timezone={event.timezone}
      metadata={formatEventTime(event)}
      reminder={isReminded}
      onPress={onPress}
    />
  );
}

function formatEventTime(event: FollowedEvent) {
  const start = new Date(event.starts_at);
  const dateOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    timeZone: event.timezone,
  };
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: event.timezone,
  };
  const date = start.toLocaleDateString(undefined, dateOptions);
  const time = start.toLocaleTimeString(undefined, timeOptions);
  if (!event.ends_at) return `${date} · ${time}`;
  const end = new Date(event.ends_at);
  const endTime = end.toLocaleTimeString(undefined, timeOptions);
  return `${date} · ${time}–${endTime}`;
}

function imageAspectRatio(width: number | null | undefined, height: number | null | undefined) {
  return width && height && width > 0 && height > 0 ? width / height : 4 / 3;
}

function imageDisplayHeight(aspectRatio: number, pageWidth: number, maxHeight: number) {
  const naturalHeight = pageWidth / Math.max(0.2, aspectRatio);
  const safeMaxHeight = Math.max(1, maxHeight);
  const minimumHeight = Math.min(240, safeMaxHeight);
  return Math.min(safeMaxHeight, Math.max(minimumHeight, Math.round(naturalHeight)));
}

const REMINDER_OPTIONS = [
  { label: '1 hour before', minutes: 60 },
  { label: '3 hours before', minutes: 180 },
  { label: '1 day before', minutes: 1440 },
  { label: '2 days before', minutes: 2880 },
  { label: '1 week before', minutes: 10080 },
  { label: '1 month before', minutes: 43200 },
  { label: '3 months before', minutes: 129600 },
] as const;

const REMINDER_FREQUENCY_OPTIONS: readonly { value: ReminderFrequency; label: string }[] = [
  { value: 'once', label: 'One reminder' },
  { value: 'daily', label: 'Every day until the event' },
  { value: 'weekly', label: 'Every week until the event' },
  { value: 'monthly', label: 'Every month until the event' },
];

function EventDetail({
  canSetReminder,
  event,
  isReminded,
  reminderMinutes,
  reminderFrequency,
  onBack,
  onFullscreenChange,
  onToggleReminder,
  onSetReminderTiming,
  onSetReminderFrequency,
}: {
  readonly canSetReminder: boolean;
  readonly event: FollowedEvent;
  readonly isReminded: boolean;
  readonly reminderMinutes: number;
  readonly reminderFrequency: ReminderFrequency;
  readonly onBack: () => void;
  readonly onFullscreenChange: (visible: boolean) => void;
  readonly onToggleReminder: () => void;
  readonly onSetReminderTiming: (minutes: number) => void;
  readonly onSetReminderFrequency: (frequency: ReminderFrequency) => void;
}) {
  const colors = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const [expandedImage, setExpandedImage] = useState<number | null>(null);
  const [directionsError, setDirectionsError] = useState<string | null>(null);
  const directionsUrl =
    event.location_mode === 'online'
      ? null
      : buildDirectionsUrl(
          Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
          { address: event.address_text, label: event.title },
        );
  const closingImage = useRef(false);
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const [viewerWidth, setViewerWidth] = useState(0);
  const [loadedAspectRatios, setLoadedAspectRatios] = useState<Record<string, number>>({});
  const [viewerScrollX] = useState(() => new Animated.Value(0));
  const viewerListRef = useRef<FlatList<EventMediaItem>>(null);
  const pageWidth = viewerWidth || windowWidth;
  const viewerHeight = Math.max(320, Math.min(Math.round(windowHeight * 0.78), windowHeight - 170));
  const closeExpandedImage = () => {
    closingImage.current = true;
    onFullscreenChange(false);
    setExpandedImage(null);
  };
  const cover = firstMediaAsset(event.media_assets);
  const media: EventMediaItem[] = [
    ...(cover?.status === 'ready'
      ? [
          {
            uri: storagePublicUrl(cover.storage_path),
            caption: cover.alt_text ?? null,
            aspectRatio: imageAspectRatio(cover.width, cover.height),
          },
        ]
      : []),
    ...(event.event_photos ?? [])
      .slice()
      .sort((a, b) => a.display_order - b.display_order)
      .flatMap((photo) => {
        const asset = firstMediaAsset(photo.media_assets);
        return asset?.status === 'ready'
          ? [
              {
                uri: storagePublicUrl(asset.storage_path),
                caption: photo.caption ?? asset.alt_text ?? null,
                aspectRatio: imageAspectRatio(asset.width, asset.height),
              },
            ]
          : [];
      }),
  ];
  useEffect(() => {
    if (expandedImage === null) return;
    viewerListRef.current?.scrollToOffset({ offset: expandedImage * pageWidth, animated: false });
  }, [expandedImage, pageWidth]);
  return (
    <View style={styles.eventDetailStack}>
      <AppButton
        label="← Back to calendar"
        variant="tertiary"
        onPress={onBack}
        style={{ alignSelf: 'flex-start' }}
      />
      <EventDetailHeading
        title={event.title}
        businessName={event.business.name}
        color={event.business.primary_color}
        photos={event.business.business_photos}
        image={media[0]?.uri}
        when={formatEventTime(event)}
        where={
          event.location_mode === 'online'
            ? 'Online event'
            : event.address_text || 'At the business location'
        }
        onOpenPhoto={() => {
          closingImage.current = false;
          viewerScrollX.setValue(0);
          onFullscreenChange(true);
          setExpandedImage(0);
        }}
      />
      {media[0]?.caption && (
        <ThemedText themeColor="textSecondary" type="small">
          {media[0].caption}
        </ThemedText>
      )}
      <View style={{ gap: 12 }}>
        {directionsUrl && (
          <AppButton
            label="Directions"
            variant="secondary"
            onPress={() => {
              setDirectionsError(null);
              void Linking.openURL(directionsUrl).catch(() =>
                setDirectionsError('We couldn’t open directions. Try again.'),
              );
            }}
          />
        )}
        {directionsError && (
          <ThemedText accessibilityRole="alert" style={{ color: colors.destructive }}>
            {directionsError}
          </ThemedText>
        )}
        {canSetReminder ? (
          <AppButton
            label={isReminded ? 'Turn off reminder' : 'Remind me'}
            onPress={onToggleReminder}
            variant={isReminded ? 'secondary' : 'primary'}
          />
        ) : (
          <ThemedText themeColor="textSecondary" type="small">
            Sign in from Account to set an event reminder.
          </ThemedText>
        )}
      </View>
      <View style={{ gap: 20 }}>
        {!!event.description && (
          <View style={{ gap: 8 }}>
            <ThemedText type="card">About this event</ThemedText>
            <ThemedText>{event.description}</ThemedText>
          </View>
        )}
        {media.length > 1 && (
          <View style={styles.eventMediaSection}>
            <ThemedText type="smallBold">Event photos</ThemedText>
            <HorizontalScrollRow contentContainerStyle={styles.eventMediaStrip}>
              {media.map((photo, index) => (
                <Pressable
                  key={`${photo.uri}-${index}`}
                  accessibilityRole="button"
                  accessibilityLabel={`View event photo ${index + 1}`}
                  onPress={() => {
                    closingImage.current = false;
                    viewerScrollX.setValue(index * pageWidth);
                    onFullscreenChange(true);
                    setExpandedImage(index);
                  }}
                  style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }}
                >
                  <Image
                    contentFit="cover"
                    source={{ uri: photo.uri }}
                    style={styles.eventDetailImage}
                    transition={180}
                  />
                </Pressable>
              ))}
            </HorizontalScrollRow>
          </View>
        )}

        {(event.age_note || event.capacity_text) && (
          <View style={{ gap: 8 }}>
            <ThemedText type="card">Good to know</ThemedText>
            {!!event.age_note && (
              <ThemedText themeColor="textSecondary">{event.age_note}</ThemedText>
            )}
            {!!event.capacity_text && (
              <ThemedText themeColor="textSecondary">{event.capacity_text}</ThemedText>
            )}
          </View>
        )}
      </View>
      {isReminded && (
        <ThemedView type="backgroundElement" style={styles.reminderPickerCard}>
          <ChoicePicker
            label="Reminder timing"
            value={String(reminderMinutes)}
            options={REMINDER_OPTIONS.map((option) => ({
              value: String(option.minutes),
              label: option.label,
            }))}
            onChange={(value) => onSetReminderTiming(Number(value))}
          />
          <ChoicePicker
            label="Repeat reminders"
            value={reminderFrequency}
            options={REMINDER_FREQUENCY_OPTIONS}
            onChange={(value) => onSetReminderFrequency(value as ReminderFrequency)}
          />
          <ThemedText themeColor="textSecondary" type="small">
            Choose one reminder or a gentle cadence until the event. Push delivery still depends on
            your notification settings.
          </ThemedText>
        </ThemedView>
      )}
      <Modal
        animationType="fade"
        onRequestClose={closeExpandedImage}
        transparent
        visible={expandedImage !== null}
      >
        <View style={styles.eventImageModal}>
          <View style={styles.eventImageHeader}>
            <ThemedText style={styles.eventImageHeaderTitle} type="smallBold">
              Event photos
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={closeExpandedImage}
              style={styles.eventImageClose}
            >
              <ThemedText style={styles.eventImageCloseText} type="smallBold">
                Close
              </ThemedText>
            </Pressable>
          </View>
          <AnimatedFlatList
            data={media}
            extraData={{ expandedImage, loadedAspectRatios }}
            ref={viewerListRef}
            onLayout={(event) => {
              const nextWidth = Math.round(event.nativeEvent.layout.width);
              if (nextWidth > 0 && nextWidth !== viewerWidth) setViewerWidth(nextWidth);
            }}
            getItemLayout={(_, index) => ({
              length: pageWidth,
              offset: pageWidth * index,
              index,
            })}
            initialScrollIndex={expandedImage ?? 0}
            keyExtractor={(photo, index) => `${photo.uri}-full-${index}`}
            horizontal
            bounces={false}
            decelerationRate="fast"
            disableIntervalMomentum
            onMomentumScrollEnd={(event) => {
              if (closingImage.current) return;
              const index = Math.round(event.nativeEvent.contentOffset.x / Math.max(1, pageWidth));
              setExpandedImage(Math.min(media.length - 1, Math.max(0, index)));
            }}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: viewerScrollX } } }], {
              useNativeDriver: true,
            })}
            scrollEventThrottle={16}
            pagingEnabled
            snapToAlignment="start"
            snapToOffsets={media.map((_, index) => index * pageWidth)}
            snapToInterval={pageWidth}
            showsHorizontalScrollIndicator={false}
            style={[styles.eventImagePager, { height: viewerHeight }]}
            renderItem={({ item: photo }) => (
              <View style={[styles.eventImageSlide, { width: pageWidth, height: viewerHeight }]}>
                <Image
                  contentPosition="center"
                  contentFit="contain"
                  onLoad={(event) => {
                    const source = event.source;
                    if (!source?.width || !source?.height) return;
                    const aspectRatio = source.width / source.height;
                    setLoadedAspectRatios((current) =>
                      current[photo.uri] === aspectRatio
                        ? current
                        : { ...current, [photo.uri]: aspectRatio },
                    );
                  }}
                  source={{ uri: photo.uri }}
                  style={[
                    styles.eventImageFullscreen,
                    {
                      height: imageDisplayHeight(
                        loadedAspectRatios[photo.uri] ?? photo.aspectRatio,
                        pageWidth,
                        viewerHeight - 124,
                      ),
                    },
                  ]}
                />
                {!!photo.caption && (
                  <ThemedText style={styles.eventImageCaption} type="small">
                    {photo.caption}
                  </ThemedText>
                )}
              </View>
            )}
          />
          <View
            accessibilityLabel={`Photo ${(expandedImage ?? 0) + 1} of ${media.length}`}
            accessibilityRole="adjustable"
            style={styles.eventImageDots}
          >
            {media.map((photo, index) => (
              <EventPagerDot
                key={`${photo.uri}-dot-${index}`}
                index={index}
                pageWidth={pageWidth}
                scrollX={viewerScrollX}
              />
            ))}
          </View>
          <ThemedText style={styles.eventImageSwipeHint} type="small">
            Swipe to browse event photos
          </ThemedText>
        </View>
      </Modal>
    </View>
  );
}

function RewardsDestinationUnderlay({
  allUpcoming,
  cards,
  events,
  followingBusinesses,
  reminderEnabledIds,
  view,
  calendarOnly,
  upcomingListOnly,
}: {
  readonly allUpcoming: boolean;
  readonly cards: readonly WalletCard[];
  readonly events: readonly FollowedEvent[];
  readonly followingBusinesses: readonly FollowingBusiness[];
  readonly reminderEnabledIds: ReadonlySet<string>;
  readonly view: 'wallet' | 'events' | 'following';
  readonly calendarOnly: boolean;
  readonly upcomingListOnly: boolean;
}) {
  const bottomPadding = useScreenBottomPadding();
  const colors = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
          scrollEnabled={false}
        >
          <AppChrome />
          <View style={styles.hero}>
            <ThemedText style={[styles.eyebrow, { color: colors.textSecondary }]} type="smallBold">
              {upcomingListOnly
                ? 'DISCOVER'
                : calendarOnly
                  ? 'CUSTOMER CALENDAR'
                  : 'CUSTOMER WALLET'}
            </ThemedText>
            <ThemedText type="title">
              {upcomingListOnly ? 'Upcoming events' : calendarOnly ? 'Calendar' : 'Rewards'}
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              {upcomingListOnly
                ? 'Browse every public upcoming event from Discover.'
                : calendarOnly
                  ? allUpcoming
                    ? 'Browse public events by date.'
                    : 'Events from businesses you follow, with reminders when you need them.'
                  : 'Keep your loyalty cards and favorite businesses close by.'}
            </ThemedText>
          </View>
          {!calendarOnly && !upcomingListOnly && (
            <View accessibilityRole="radiogroup" style={styles.segmentedControl}>
              <SegmentButton
                count={cards.length}
                label="Rewards"
                selected={view === 'wallet'}
                onPress={() => undefined}
              />
              <SegmentButton
                count={followingBusinesses.length}
                label="Following"
                selected={view === 'following'}
                onPress={() => undefined}
              />
            </View>
          )}
          {calendarOnly || upcomingListOnly ? (
            <View style={styles.dayEventsSection}>
              <ThemedText type="subtitle">Upcoming events</ThemedText>
              {events.slice(0, 6).map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  isReminded={reminderEnabledIds.has(event.id)}
                  onPress={() => undefined}
                />
              ))}
            </View>
          ) : view === 'following' ? (
            <View style={styles.followingList}>
              {followingBusinesses.map((business) => {
                return (
                  <View key={business.id} style={styles.followingCard}>
                    <View
                      style={[styles.followingAccent, { backgroundColor: business.primary_color }]}
                    />
                    <View style={styles.followingMain}>
                      <BusinessLogo
                        name={business.name}
                        photos={relationList(business.business_photos)}
                        size={44}
                        decorative
                      />
                      <View style={styles.followingIdentity}>
                        <ThemedText numberOfLines={1} style={styles.followingName} type="smallBold">
                          {business.name}
                        </ThemedText>
                        <ThemedText themeColor="textSecondary" type="small">
                          {[business.city, business.region_code].filter(Boolean).join(', ') ||
                            'Local business'}
                        </ThemedText>
                      </View>
                      <ThemedText
                        style={[styles.followingChevron, { color: colors.textSecondary }]}
                        type="subtitle"
                      >
                        ›
                      </ThemedText>
                    </View>
                    <View style={styles.followingBadge}>
                      <ThemedText
                        style={[styles.followingBadgeText, { color: colors.accent }]}
                        type="smallBold"
                      >
                        Following
                      </ThemedText>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.cardList}>
              {cards.map((card) => {
                return (
                  <View
                    key={card.membership_id}
                    style={[
                      styles.walletCard,
                      {
                        backgroundColor: colors.backgroundElement,
                        borderColor: colors.divider,
                      },
                    ]}
                  >
                    <BusinessBrandHeader
                      name={card.business_name}
                      title={card.program_name}
                      color={card.primary_color}
                      photos={card.business_photos}
                      trailing
                    />
                    <View style={styles.walletCardBody}>
                      <ThemedText themeColor="textSecondary" numberOfLines={2} type="small">
                        {card.reward_description}
                      </ThemedText>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function SegmentButton({
  count,
  label,
  selected,
  onPress,
}: {
  readonly count: number | undefined;
  readonly label: string;
  readonly selected: boolean;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.segmentButton, selected && styles.segmentButtonSelected]}
    >
      <View style={styles.segmentContent}>
        <ThemedText style={selected ? styles.segmentTextSelected : undefined} type="smallBold">
          {label}
        </ThemedText>
        <View style={[styles.segmentCount, selected && styles.segmentCountSelected]}>
          <ThemedText
            style={selected ? styles.segmentCountTextSelected : undefined}
            type="smallBold"
          >
            {count === undefined ? '…' : count}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: {
    padding: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  hero: { gap: Spacing.one, marginBottom: Spacing.two },
  calendarHero: { gap: Spacing.one, marginBottom: Spacing.two },
  detailIntro: { gap: Spacing.one, marginBottom: Spacing.two },
  eyebrow: { color: Brand.primary, letterSpacing: 1.5 },
  notice: {
    marginTop: Spacing.three,
    borderRadius: 16,
    padding: Spacing.four,
    backgroundColor: '#E7F0EA',
    gap: Spacing.one,
  },
  noticeText: { color: '#164E38' },
  noticeButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: Radius.small,
    backgroundColor: Brand.primary,
    paddingHorizontal: 16,
    marginTop: Spacing.one,
  },
  noticeButtonText: { color: Brand.onPrimary },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: Radius.medium,
    backgroundColor: 'rgba(120,140,128,0.12)',
    padding: Spacing.one,
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  segmentButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.small,
    paddingHorizontal: Spacing.two,
  },
  segmentButtonSelected: { backgroundColor: Brand.primary },
  segmentTextSelected: { color: Brand.onPrimary },
  segmentContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  segmentCount: {
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(113,128,120,0.16)',
    paddingHorizontal: 6,
  },
  segmentCountSelected: { backgroundColor: 'rgba(255,255,255,0.22)' },
  segmentCountTextSelected: { color: Brand.onPrimary },
  cardList: { gap: Spacing.three, marginTop: Spacing.three },
  eventsView: { gap: Spacing.three, marginTop: Spacing.three },
  calendarCard: {
    borderRadius: Radius.large,
    padding: Spacing.three,
    backgroundColor: 'rgba(120,140,128,0.10)',
    gap: Spacing.two,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  monthArrow: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(120,140,128,0.14)',
  },
  weekRow: { flexDirection: 'row', marginTop: Spacing.one },
  weekLabel: { flex: 1, textAlign: 'center', fontSize: 12 },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: '14.2857%',
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: Radius.small,
  },
  dayCellSelected: { backgroundColor: Brand.primary },
  dayNumber: { minWidth: 24, textAlign: 'center' },
  dayNumberMuted: { opacity: 0.35 },
  dayNumberToday: { color: Brand.primary },
  dayNumberSelected: { color: Brand.onPrimary },
  eventCountDot: {
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
    paddingHorizontal: 3,
    backgroundColor: Brand.primarySoft,
  },
  eventCountDotSelected: { backgroundColor: 'rgba(255,255,255,0.24)' },
  eventCountText: { color: Brand.primary, fontSize: 11, lineHeight: 16 },
  eventCountTextSelected: { color: Brand.onPrimary, fontSize: 11, lineHeight: 16 },
  calendarHint: { marginTop: Spacing.one },
  dayEventsSection: { gap: Spacing.two },
  dayEventsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  eventRow: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.medium,
    overflow: 'hidden',
    backgroundColor: 'rgba(120,140,128,0.10)',
  },
  eventAccent: { width: 6, alignSelf: 'stretch' },
  eventRowCopy: { flex: 1, gap: Spacing.one, padding: Spacing.three },
  eventRowTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  eventBusiness: { flex: 1 },
  reminderBadge: {
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: Brand.primarySoft,
  },
  reminderBadgeText: { color: Brand.primary, fontSize: 12, lineHeight: 16 },
  eventChevron: { paddingHorizontal: Spacing.three },
  eventDetailCard: { borderRadius: Radius.hero, padding: Spacing.four, gap: Spacing.two },
  eventDetailStack: { gap: Spacing.four },
  eventDetailMeta: { gap: Spacing.one },
  eventMediaSection: { gap: Spacing.one },
  eventMediaStrip: { gap: Spacing.two, paddingVertical: Spacing.one },
  eventDetailImage: { width: 210, height: 132, borderRadius: Radius.medium },
  eventImageModal: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    backgroundColor: 'rgba(0,0,0,0.94)',
  },
  eventImageHeader: {
    position: 'absolute',
    zIndex: 2,
    top: 42,
    left: Spacing.four,
    right: Spacing.four,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventImageHeaderTitle: { color: '#FFFFFF', letterSpacing: 0.3 },
  eventImageClose: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: Radius.small,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  eventImageCloseText: { color: '#FFFFFF' },
  eventImagePager: { flexGrow: 0, width: '100%', height: '70%' },
  eventImageSlide: { justifyContent: 'center', alignItems: 'center' },
  eventImageFullscreen: { width: '100%', height: '72%', alignSelf: 'center' },
  eventImageCaption: {
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.two,
    maxWidth: '92%',
    flexShrink: 1,
    minHeight: 68,
  },
  eventImageSwipeHint: {
    color: '#B7C4BD',
    textAlign: 'center',
    marginTop: Spacing.two,
  },
  eventImageDots: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: Spacing.two,
  },
  eventImageDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
  eventImageDotActive: {},
  eventReminderButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radius.small,
    paddingHorizontal: Spacing.three,
    marginTop: Spacing.one,
  },
  reminderPickerCard: { borderRadius: Radius.medium, padding: Spacing.three, gap: Spacing.two },
  walletCard: {
    borderRadius: Radius.large,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 180,
  },
  walletCardHeader: {
    minHeight: 88,
    justifyContent: 'center',
    padding: Spacing.three,
    overflow: 'hidden',
  },
  walletHeaderGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    right: -52,
    bottom: -108,
    borderRadius: Radius.pill,
  },
  walletCardBody: { flex: 1, padding: Spacing.three, gap: Spacing.two },
  walletTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  walletCopy: { flex: 1, gap: Spacing.one },
  walletProgramIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
  },
  walletProgramIconGlyph: { width: 22, height: 22 },
  walletArrow: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
  },
  walletProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  walletProgressLabel: { flex: 1 },
  walletBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  walletReadyBadge: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    borderRadius: Radius.large,
    padding: Spacing.three,
    backgroundColor: 'rgba(120,140,128,0.10)',
  },
  eventDateBadge: {
    width: 58,
    minHeight: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.medium,
    backgroundColor: Brand.primarySoft,
  },
  eventMonth: { color: Brand.primary, textTransform: 'uppercase' },
  eventDay: { color: Brand.primary },
  eventCopy: { flex: 1, gap: Spacing.one },
  removeText: { color: Brand.danger, paddingVertical: Spacing.one },
  followingSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  followingSearchInput: {
    flex: 1,
    minHeight: 48,
    borderRadius: Radius.medium,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  followingFilterButton: {
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Brand.border,
    paddingHorizontal: 14,
  },
  followingFilterButtonActive: {
    borderColor: Brand.primary,
    backgroundColor: Brand.primarySoft,
  },
  followingFilterButtonPressed: { opacity: 0.72 },
  followingFilterButtonTextActive: { color: Brand.primary },
  followingFilterModal: { flex: 1, justifyContent: 'flex-end' },
  followingFilterBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  followingFilterSheet: {
    maxHeight: '72%',
    borderTopLeftRadius: Radius.large,
    borderTopRightRadius: Radius.large,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  followingFilterHandle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: Brand.border,
    opacity: 0.7,
  },
  followingFilterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  followingFilterHeaderCopy: { flex: 1, minWidth: 0, gap: Spacing.one },
  followingFilterDone: {
    flexShrink: 0,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: Radius.small,
    backgroundColor: Brand.primary,
    paddingHorizontal: 16,
  },
  followingFilterDoneText: { color: Brand.onPrimary },
  followingFilterScroll: { flexShrink: 1 },
  followingFilterScrollContent: { gap: Spacing.three, paddingBottom: Spacing.two },
  followingFilterGroup: { gap: Spacing.one },
  followingFilterOptions: { gap: Spacing.one },
  followingFilterOption: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderRadius: Radius.medium,
    paddingHorizontal: 14,
  },
  followingFilterOptionSelected: { backgroundColor: Brand.primary },
  followingFilterOptionLabel: { flex: 1 },
  followingFilterOptionTextSelected: { color: Brand.onPrimary, fontWeight: '700' },
  followingFilterCheck: { color: Brand.onPrimary, fontWeight: '700' },
  followingFilterClear: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
  },
  followingList: { gap: Spacing.one, marginTop: Spacing.three },
  followingCard: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(120,140,128,0.18)',
    backgroundColor: 'rgba(120,140,128,0.07)',
    paddingRight: Spacing.two,
  },
  followingAccent: { width: 4, alignSelf: 'stretch' },
  followingMain: {
    flex: 1,
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  followingMainPressed: { opacity: 0.7 },
  followingThumb: { width: 52, height: 52, borderRadius: 26 },
  followingIconFrame: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    padding: 2,
  },
  followingLogoCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  followingIcon: { width: 23, height: 23 },
  followingLogoImage: { width: '100%', height: '100%' },
  followingIdentity: { flex: 1, minWidth: 0, gap: 2 },
  followingName: { fontSize: 16, lineHeight: 21 },
  followingChevron: { color: Brand.primary, lineHeight: 24, paddingLeft: Spacing.one },
  followingBadge: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(23,107,77,0.34)',
    paddingHorizontal: 11,
  },
  followingBadgeConfirm: { borderColor: Brand.danger, backgroundColor: 'rgba(188,52,52,0.10)' },
  followingBadgePressed: { opacity: 0.68 },
  followingBadgeText: { color: Brand.primary, fontSize: 12, lineHeight: 16 },
  followingBadgeConfirmText: { color: Brand.danger },
  detailCard: {
    borderRadius: 26,
    padding: Spacing.four,
    marginTop: Spacing.three,
    gap: Spacing.two,
  },
  detailBusinessRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  detailCopy: { flex: 1, gap: Spacing.one },
  readyBadge: {
    borderRadius: Radius.pill,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  readyBadgeText: { color: Brand.primary },
  pointsDetailRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.one },
  progressRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginVertical: Spacing.two },
  stamp: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    opacity: 0.45,
  },
  qrCard: {
    minHeight: 277,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginTop: Spacing.two,
    gap: Spacing.two,
  },
  qrTitle: { color: '#14231C' },
  qrHint: { color: '#596860' },
});
