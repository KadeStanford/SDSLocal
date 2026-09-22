import { PickupOrderCta } from './pickup-order-cta';
import { BusinessBrandHeader } from './business-brand-header';
import { AppButton } from './app-button';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BusinessLogo } from '@/components/business-logo';
import { BusinessIdentityRow } from '@/components/business-identity-row';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Linking,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BusinessLocationMap } from '@/components/business-location-map';
import { CustomerActionRow, type CustomerAction } from '@/components/customer-action-row';
import { HorizontalScrollRow } from '@/components/horizontal-scroll-row';
import { ReportDialog } from '@/components/report-dialog';
import { SignInGate } from '@/components/sign-in-gate';
import { Brand, Colors, Radius, Spacing } from '@/constants/theme';
import {
  authIntentExplanation,
  parseCustomerAuthIntent,
  savePendingAuthIntent,
  type CustomerAuthIntent,
} from '@/lib/auth-intents';
import {
  buildMenuCategoryDisplay,
  businessScheduleLabel,
  formatEventDateTime,
  getTodayHours,
  groupWeeklyHours,
  shouldCollapseBusinessDescription,
} from '@/lib/discovery-core';
import { blockBusiness, shouldShowSafetyControls, type ReportTarget } from '@/lib/customer-safety';
import { buildDirectionsUrl, normalizeWebsiteUrl } from '@/lib/external-actions';
import { businessPublicUrl } from '@/lib/share-links';
import { storagePublicUrl } from '@/lib/storage-url';
import { supabase } from '@/lib/supabase';
import { userMessageFromError } from '@/lib/user-error';
import { useAuth } from '@/providers/auth-provider';
import { useNearbyAlerts } from '@/providers/nearby-alerts-provider';
import { getBusinessStatusLabel } from '@sds/business-logic';

interface BusinessPageData {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly status: string;
  readonly business_type:
    'food_drink' | 'services' | 'retail' | 'entertainment_venue' | 'mobile' | 'general';
  readonly description: string;
  readonly category_summary: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly website_url: string | null;
  readonly address_line_1: string | null;
  readonly address_line_2: string | null;
  readonly city: string | null;
  readonly region_code: string | null;
  readonly postal_code: string | null;
  readonly service_area: string | null;
  readonly primary_color: string;
  readonly timezone: string;
  readonly accent_color: string;
}

interface PhotoData {
  readonly id: string;
  readonly role: 'logo' | 'cover' | 'gallery';
  readonly caption: string | null;
  readonly media_assets:
    | {
        readonly alt_text: string | null;
        readonly storage_path: string;
        readonly status: string;
        readonly width: number;
        readonly height: number;
      }
    | readonly {
        readonly alt_text: string | null;
        readonly storage_path: string;
        readonly status: string;
        readonly width: number;
        readonly height: number;
      }[]
    | null;
}

interface GalleryPhoto extends PhotoData {
  readonly url: string;
  readonly altText: string | null;
  readonly aspectRatio: number;
}

interface SectionData {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
}
interface ItemData {
  readonly id: string;
  readonly section_id: string;
  readonly media_asset_id: string | null;
  readonly name: string;
  readonly description: string;
  readonly price_minor: number | null;
  readonly price_text: string | null;
  readonly currency: string;
  readonly is_available: boolean;
  readonly is_featured: boolean;
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
interface EventData {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly starts_at: string;
  readonly address_text: string | null;
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
interface LoyaltyData {
  readonly id: string;
  readonly name: string;
  readonly reward_description: string;
  readonly stamps_required: number;
  readonly program_type?: 'visits' | 'points';
  readonly points_per_dollar?: number | null;
  readonly points_required?: number | null;
}
interface LoyaltyMembershipData {
  readonly id: string;
  readonly program_id: string;
  readonly is_active: boolean;
}
interface HourData {
  readonly day_of_week: number;
  readonly opens_at: string | null;
  readonly closes_at: string | null;
  readonly is_closed: boolean;
}

interface LocationStopData {
  readonly id: string;
  readonly title: string;
  readonly address_text: string | null;
  readonly latitude: number;
  readonly longitude: number;
  readonly starts_at: string;
  readonly ends_at: string;
  readonly timezone: string;
}

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList) as unknown as typeof FlatList;

export function PublicBusinessPageContent({
  businessId,
  preview = false,
  onViewerChange,
  onFollowingChange,
  onMapInteractionChange,
  onBlocked,
  resumeAction,
  resumeTargetId,
}: {
  readonly businessId: string;
  readonly preview?: boolean;
  readonly onViewerChange?: (visible: boolean) => void;
  readonly onFollowingChange?: (following: boolean) => void;
  readonly onMapInteractionChange?: (active: boolean) => void;
  readonly onBlocked?: (businessId: string) => void;
  readonly resumeAction?: string;
  readonly resumeTargetId?: string;
}) {
  const { session } = useAuth();
  const nearbyAlerts = useNearbyAlerts();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const [business, setBusiness] = useState<BusinessPageData | null>(null);
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [items, setItems] = useState<ItemData[]>([]);
  const [events, setEvents] = useState<EventData[]>([]);
  const [loyalty, setLoyalty] = useState<LoyaltyData | null>(null);
  const [hours, setHours] = useState<HourData[]>([]);
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [selectedMenuSectionId, setSelectedMenuSectionId] = useState<string | null>(null);
  const [menuOptionsItem, setMenuOptionsItem] = useState<ItemData | null>(null);
  const [locationStops, setLocationStops] = useState<LocationStopData[]>([]);
  const [following, setFollowing] = useState(false);
  const [eventReminders, setEventReminders] = useState<Record<string, boolean>>({});
  const [loyaltyMembership, setLoyaltyMembership] = useState<LoyaltyMembershipData | null>(null);
  const [actionPending, setActionPending] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [ownsBusiness, setOwnsBusiness] = useState(false);
  const [gateIntent, setGateIntent] = useState<CustomerAuthIntent | null>(null);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerWidth, setViewerWidth] = useState(0);
  const [loadedAspectRatios, setLoadedAspectRatios] = useState<Record<string, number>>({});
  const [viewerScrollX] = useState(() => new Animated.Value(0));
  const viewerListRef = useRef<FlatList<GalleryPhoto>>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageWidth = viewerWidth || windowWidth;

  useEffect(() => {
    let active = true;
    void Promise.all([
      supabase
        .from('businesses')
        .select(
          'id, name, slug, status, business_type, description, category_summary, phone, email, website_url, address_line_1, address_line_2, city, region_code, postal_code, service_area, primary_color, accent_color, timezone',
        )
        .eq('id', businessId)
        .maybeSingle(),
      supabase
        .from('business_photos')
        .select('id, role, caption, media_assets(alt_text, storage_path, status, width, height)')
        .eq('business_id', businessId)
        .order('display_order'),
      supabase
        .from('offering_sections')
        .select('id, name, description')
        .eq('business_id', businessId)
        .eq('is_visible', true)
        .is('archived_at', null)
        .order('display_order'),
      supabase
        .from('offering_items')
        .select(
          'id, section_id, media_asset_id, name, description, price_minor, price_text, currency, is_available, is_featured, media_assets(storage_path, status, alt_text, width, height)',
        )
        .eq('business_id', businessId)
        .eq('is_visible', true)
        .is('archived_at', null)
        .order('display_order'),
      supabase
        .from('events')
        .select(
          'id, title, description, starts_at, address_text, media_assets(storage_path, status, alt_text, width, height)',
        )
        .eq('business_id', businessId)
        .is('archived_at', null)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at')
        .limit(6),
      supabase
        .from('loyalty_programs')
        .select(
          'id, name, reward_description, program_type, stamps_required, points_per_dollar, points_required',
        )
        .eq('business_id', businessId)
        .eq('is_active', true)
        .maybeSingle(),
      supabase
        .from('business_hours')
        .select('day_of_week, opens_at, closes_at, is_closed')
        .eq('business_id', businessId)
        .order('day_of_week'),
      session
        ? supabase
            .from('business_follows')
            .select('business_id')
            .eq('business_id', businessId)
            .eq('customer_id', session.user.id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      session
        ? supabase
            .from('event_saves')
            .select('event_id, reminder_enabled')
            .eq('customer_id', session.user.id)
        : Promise.resolve({ data: [], error: null }),
      session
        ? supabase
            .from('loyalty_memberships')
            .select('id, program_id, is_active')
            .eq('business_id', businessId)
            .eq('customer_id', session.user.id)
            .eq('is_active', true)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase.rpc('get_business_location_stops', {
        p_business_id: businessId,
        p_from: new Date().toISOString(),
        p_to: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      }),
      session
        ? supabase
            .from('business_members')
            .select('id')
            .eq('business_id', businessId)
            .eq('user_id', session.user.id)
            .eq('is_active', true)
            .limit(1)
        : Promise.resolve({ data: [], error: null }),
    ]).then(
      ([
        businessResult,
        photoResult,
        sectionResult,
        itemResult,
        eventResult,
        loyaltyResult,
        hourResult,
        followResult,
        savesResult,
        membershipResult,
        locationResult,
        ownerResult,
      ]) => {
        if (!active) return;
        const firstError = [
          businessResult.error,
          photoResult.error,
          sectionResult.error,
          itemResult.error,
          eventResult.error,
          loyaltyResult.error,
          hourResult.error,
          followResult.error,
          savesResult.error,
          membershipResult.error,
          ownerResult.error,
          locationResult.error &&
          !/function .*get_business_location_stops.*does not exist/i.test(
            locationResult.error.message,
          )
            ? locationResult.error
            : null,
        ].find(Boolean);
        if (firstError)
          setError(userMessageFromError(firstError, 'We could not load this business page.'));
        else if (!businessResult.data) setError('This business page is unavailable.');
        else {
          setBusiness(businessResult.data as BusinessPageData);
          setPhotos((photoResult.data ?? []) as PhotoData[]);
          setSections((sectionResult.data ?? []) as SectionData[]);
          setItems((itemResult.data ?? []) as ItemData[]);
          setEvents((eventResult.data ?? []) as EventData[]);
          setLoyalty((loyaltyResult.data as LoyaltyData | null) ?? null);
          setHours((hourResult.data ?? []) as HourData[]);
          setLocationStops((locationResult.data ?? []) as LocationStopData[]);
          setFollowing(Boolean(followResult.data));
          setEventReminders(
            Object.fromEntries(
              (savesResult.data ?? []).map(
                (row: { event_id: string; reminder_enabled: boolean }) => [
                  row.event_id,
                  Boolean(row.reminder_enabled),
                ],
              ),
            ),
          );
          setLoyaltyMembership((membershipResult.data as LoyaltyMembershipData | null) ?? null);
          setOwnsBusiness(Boolean(ownerResult.data?.length));
        }
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [businessId, session]);

  const resolvedPhotos = useMemo<GalleryPhoto[]>(
    () =>
      photos.flatMap((photo) => {
        const asset = Array.isArray(photo.media_assets)
          ? photo.media_assets[0]
          : photo.media_assets;
        return asset?.status === 'ready'
          ? [
              {
                ...photo,
                url: storagePublicUrl(asset.storage_path),
                altText: asset.alt_text,
                aspectRatio:
                  asset.width > 0 && asset.height > 0 ? asset.width / asset.height : 4 / 3,
              },
            ]
          : [];
      }),
    [photos],
  );

  useEffect(() => {
    if (!viewerVisible) return;
    viewerListRef.current?.scrollToOffset({ offset: viewerIndex * pageWidth, animated: false });
  }, [pageWidth, viewerIndex, viewerVisible]);

  function requireAccount(intent: CustomerAuthIntent) {
    setGateIntent(intent);
  }

  async function openExternal(url: string, fallbackMessage: string) {
    try {
      await Linking.openURL(url);
    } catch {
      setActionMessage(fallbackMessage);
    }
  }

  async function toggleFollow() {
    if (!business) return;
    if (!session) {
      requireAccount({ kind: 'follow', businessId: business.id, businessName: business.name });
      return;
    }
    const next = !following;
    setFollowing(next);
    onFollowingChange?.(next);
    const result = next
      ? await supabase
          .from('business_follows')
          .insert({ business_id: business.id, customer_id: session.user.id })
      : await supabase
          .from('business_follows')
          .delete()
          .eq('business_id', business.id)
          .eq('customer_id', session.user.id);
    if (result.error) {
      setFollowing(!next);
      onFollowingChange?.(!next);
      setActionMessage(
        userMessageFromError(result.error, 'We could not update your follow preference.'),
      );
    } else {
      await nearbyAlerts.refresh();
    }
  }

  async function toggleEventReminder(eventId: string) {
    const event = events.find((candidate) => candidate.id === eventId);
    if (!session) {
      if (business && event) {
        requireAccount({
          kind: 'event_reminder',
          businessId: business.id,
          businessName: business.name,
          targetId: event.id,
          targetName: event.title,
        });
      }
      return;
    }
    const existingReminder = Object.prototype.hasOwnProperty.call(eventReminders, eventId);
    const isReminded = eventReminders[eventId] === true;
    const nextEnabled = !isReminded;
    setActionPending(`event:${eventId}`);
    setActionMessage(null);
    setEventReminders((current) => ({ ...current, [eventId]: nextEnabled }));
    const result = existingReminder
      ? await supabase
          .from('event_saves')
          .update({ reminder_enabled: nextEnabled })
          .eq('event_id', eventId)
          .eq('customer_id', session.user.id)
      : await supabase.from('event_saves').insert({
          event_id: eventId,
          customer_id: session.user.id,
          reminder_enabled: true,
          reminder_minutes_before: 1440,
        });
    setActionPending(null);
    if (result.error) {
      setEventReminders((current) => ({ ...current, [eventId]: isReminded }));
      setActionMessage(
        userMessageFromError(result.error, 'We could not update that event reminder.'),
      );
    }
  }

  async function toggleLoyaltyMembership() {
    if (!loyalty || !business) return;
    if (!session) {
      requireAccount({
        kind: 'join_rewards',
        businessId: business.id,
        businessName: business.name,
      });
      return;
    }
    setActionPending('loyalty');
    setActionMessage(null);
    if (loyaltyMembership) {
      const { error: leaveError } = await supabase.rpc('leave_loyalty_program', {
        p_membership_id: loyaltyMembership.id,
      });
      setActionPending(null);
      if (leaveError) {
        setActionMessage(
          userMessageFromError(leaveError, 'We could not leave this rewards program.'),
        );
        return;
      }
      setLoyaltyMembership(null);
      return;
    }
    const { data, error: joinError } = await supabase.rpc('join_loyalty_program', {
      p_program_id: loyalty.id,
    });
    setActionPending(null);
    if (joinError) {
      setActionMessage(
        userMessageFromError(joinError, 'We could not add this program to your rewards.'),
      );
      return;
    }
    setLoyaltyMembership({ id: data as string, program_id: loyalty.id, is_active: true });
  }

  function requestReport(target: ReportTarget) {
    if (!session && business) {
      requireAccount({
        kind:
          target.type === 'business'
            ? 'report_business'
            : target.type === 'event'
              ? 'report_event'
              : 'report_offering',
        businessId: business.id,
        businessName: business.name,
        ...(target.type === 'event'
          ? { targetId: target.eventId, targetName: target.label }
          : target.type === 'offering_item'
            ? { targetId: target.offeringItemId, targetName: target.label }
            : {}),
      });
      return;
    }
    setSafetyOpen(false);
    setReportTarget(target);
  }

  function confirmBlock() {
    if (!business) return;
    if (!session) {
      requireAccount({
        kind: 'block_business',
        businessId: business.id,
        businessName: business.name,
      });
      return;
    }
    Alert.alert(
      `Block ${business.name}?`,
      'This business, its events, and its rewards will stop appearing in Explore, Following, and Calendar. You can unblock it later in Account.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block business',
          style: 'destructive',
          onPress: () => {
            setSafetyOpen(false);
            setActionPending('block');
            void blockBusiness(session.user.id, business.id).then(({ error: blockError }) => {
              setActionPending(null);
              if (blockError) {
                setActionMessage(
                  userMessageFromError(blockError, 'We could not block this business.'),
                );
                return;
              }
              void nearbyAlerts.refresh();
              onBlocked?.(business.id);
            });
          },
        },
      ],
    );
  }

  const menuCategories = useMemo(
    () => buildMenuCategoryDisplay(sections, items),
    [items, sections],
  );
  const weeklyHours = useMemo(() => groupWeeklyHours(hours), [hours]);

  if (loading) return <ActivityIndicator color={Brand.primaryBright} style={styles.loader} />;
  if (error || !business)
    return (
      <View style={styles.errorCard}>
        <ThemedText style={styles.errorText}>{error ?? 'Business unavailable.'}</ThemedText>
      </View>
    );

  const isMenuBusiness =
    business.business_type === 'food_drink' || business.business_type === 'mobile';
  const activeMenuSectionId = menuCategories.some(
    (category) => category.id === selectedMenuSectionId,
  )
    ? selectedMenuSectionId
    : null;
  const visibleMenuCategories = activeMenuSectionId
    ? menuCategories.filter((category) => category.id === activeMenuSectionId)
    : menuCategories;
  const collapseAbout = shouldCollapseBusinessDescription(business.description);
  const cover = resolvedPhotos.find((photo) => photo.role === 'cover');
  const logo = resolvedPhotos.find((photo) => photo.role === 'logo');
  const gallery = resolvedPhotos.filter((photo) => photo.role === 'gallery');
  const address = [
    business.address_line_1,
    business.address_line_2,
    business.city,
    business.region_code,
    business.postal_code,
  ]
    .filter(Boolean)
    .join(', ');
  const websiteUrl = normalizeWebsiteUrl(business.website_url);
  const directionsPlatform =
    Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
  const directionsUrl = buildDirectionsUrl(directionsPlatform, {
    address: address || null,
    label: business.name,
  });
  const publicUrl = businessPublicUrl(business.slug);
  const todayHours = getTodayHours(hours, new Date(), business.timezone);
  const nextStop = locationStops[0] ?? null;
  const resumeIntent = parseCustomerAuthIntent({
    kind: resumeAction,
    businessId: business.id,
    businessName: business.name,
    targetId: resumeTargetId,
  });
  const safetyAvailable = shouldShowSafetyControls(preview, ownsBusiness);
  const customerActions: CustomerAction[] = [
    ...(!preview
      ? [
          {
            key: 'follow',
            label: following ? 'Following' : 'Follow',
            icon: {
              ios: following ? 'heart.fill' : 'heart',
              android: following ? 'favorite' : 'favorite_border',
              web: following ? 'favorite' : 'favorite_border',
            },
            primary: true,
            onPress: () => void toggleFollow(),
          } satisfies CustomerAction,
        ]
      : []),
    ...(business.phone
      ? [
          {
            key: 'call',
            label: 'Call',
            icon: { ios: 'phone.fill', android: 'call', web: 'call' },
            onPress: () =>
              void openExternal(
                `tel:${business.phone}`,
                'Calling is not available on this device.',
              ),
          } satisfies CustomerAction,
        ]
      : []),
    ...(business.email
      ? [
          {
            key: 'email',
            label: 'Email',
            icon: { ios: 'envelope.fill', android: 'email', web: 'email' },
            onPress: () =>
              void openExternal(
                `mailto:${business.email}`,
                'Email is not available on this device.',
              ),
          } satisfies CustomerAction,
        ]
      : []),
    ...(websiteUrl
      ? [
          {
            key: 'website',
            label: 'Website',
            icon: { ios: 'globe', android: 'language', web: 'language' },
            onPress: () => void openExternal(websiteUrl, 'We could not open this website.'),
          } satisfies CustomerAction,
        ]
      : []),
    ...(directionsUrl
      ? [
          {
            key: 'directions',
            label: 'Directions',
            icon: { ios: 'map.fill', android: 'directions', web: 'directions' },
            onPress: () => void openExternal(directionsUrl, 'We could not open directions.'),
          } satisfies CustomerAction,
        ]
      : []),
    {
      key: 'share',
      label: 'Share',
      icon: { ios: 'square.and.arrow.up', android: 'share', web: 'share' },
      onPress: () => {
        if (!publicUrl) {
          setActionMessage('A public sharing link is not available in this staging build.');
          return;
        }
        void Share.share({
          title: business.name,
          message: `${business.name}\n${publicUrl}`,
          url: publicUrl,
        }).catch(() => setActionMessage('We could not open sharing on this device.'));
      },
    },
  ];

  return (
    <View style={styles.page}>
      {(preview || business.status !== 'active') && (
        <View style={styles.previewBanner}>
          <ThemedText style={styles.previewText} type="smallBold">
            Private page preview · {getBusinessStatusLabel(business.status)}
          </ThemedText>
        </View>
      )}
      {cover && (
        <View style={[styles.hero, { backgroundColor: colors.backgroundSelected }]}>
          <Image
            accessibilityLabel={cover.altText ?? ''}
            cachePolicy="memory-disk"
            contentFit="cover"
            source={{ uri: cover.url }}
            style={styles.cover}
          />
        </View>
      )}
      <View style={styles.businessIdentity}>
        <BusinessLogo name={business.name} uri={logo?.url} size={64} decorative />
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <ThemedText themeColor="textSecondary" type="small">
            {business.category_summary || 'Local business'}
          </ThemedText>
          <ThemedText type="title">{business.name}</ThemedText>
        </View>
      </View>

      <View style={[styles.glance, { borderColor: colors.divider }]}>
        <ThemedText type="subtitle">At a glance</ThemedText>
        {business.business_type === 'mobile' ? (
          nextStop ? (
            <View style={styles.glanceRow}>
              <SymbolView
                name={{ ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' }}
                tintColor={business.primary_color}
                style={styles.glanceIcon}
              />
              <View style={styles.glanceCopy}>
                <ThemedText type="smallBold">
                  Next stop · {formatStopDate(nextStop.starts_at)}
                </ThemedText>
                <ThemedText themeColor="textSecondary" type="small">
                  {nextStop.title} · {formatStopTimeRange(nextStop.starts_at, nextStop.ends_at)}
                </ThemedText>
                <ThemedText themeColor="textSecondary" type="small">
                  {nextStop.address_text || 'Map pin available'}
                </ThemedText>
              </View>
            </View>
          ) : (
            <ThemedText themeColor="textSecondary">No upcoming stop is published yet.</ThemedText>
          )
        ) : business.business_type === 'services' && business.service_area ? (
          <View style={styles.glanceRow}>
            <SymbolView
              name={{ ios: 'map', android: 'map', web: 'map' }}
              tintColor={business.primary_color}
              style={styles.glanceIcon}
            />
            <View style={styles.glanceCopy}>
              <ThemedText type="smallBold">Service area</ThemedText>
              <ThemedText themeColor="textSecondary">{business.service_area}</ThemedText>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.glanceRow}>
              <SymbolView
                name={{ ios: 'mappin', android: 'location_on', web: 'location_on' }}
                tintColor={business.primary_color}
                style={styles.glanceIcon}
              />
              <ThemedText style={styles.glanceCopy} themeColor="textSecondary">
                {address || 'Location details coming soon.'}
              </ThemedText>
            </View>
            {hours.length > 0 && (
              <View style={styles.glanceRow}>
                <SymbolView
                  name={{ ios: 'clock', android: 'schedule', web: 'schedule' }}
                  tintColor={business.primary_color}
                  style={styles.glanceIcon}
                />
                <ThemedText style={styles.glanceCopy} type="smallBold">
                  {todayHours.label}
                </ThemedText>
              </View>
            )}
          </>
        )}
      </View>

      <PickupOrderCta
        businessId={business.id}
        physicalState={todayHours.state}
        nextHours={todayHours.state === 'closed' ? todayHours.label : null}
      />
      <CustomerActionRow
        actions={customerActions}
        colorScheme={scheme === 'dark' ? 'dark' : 'light'}
      />
      {resumeIntent && session ? (
        <View style={styles.resumeNotice}>
          <ThemedText type="smallBold">You’re signed in.</ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            Finish the action you started below.
          </ThemedText>
        </View>
      ) : null}
      {actionMessage ? (
        <View style={styles.actionMessage}>
          <ThemedText type="small">{actionMessage}</ThemedText>
        </View>
      ) : null}

      {!!business.description.trim() && (
        <View style={styles.aboutSection}>
          <ThemedText type="subtitle">About</ThemedText>
          <ThemedText
            {...(!aboutExpanded && collapseAbout ? { numberOfLines: 5 } : {})}
            style={styles.aboutText}
            themeColor="textSecondary"
          >
            {business.description.trim()}
          </ThemedText>
          {collapseAbout && (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: aboutExpanded }}
              onPress={() => setAboutExpanded((expanded) => !expanded)}
              style={styles.aboutToggle}
            >
              <ThemedText type="smallBold">{aboutExpanded ? 'Show less' : 'Read more'}</ThemedText>
            </Pressable>
          )}
        </View>
      )}

      {business.business_type === 'mobile' && (locationStops.length > 0 || hours.length === 0) && (
        <PageSection
          title={businessScheduleLabel(business.business_type, locationStops.length, hours.length)}
        >
          <ThemedText themeColor="textSecondary" type="small">
            Scheduled stops from this mobile business. Tap Directions to open the pin in your map
            app.
          </ThemedText>
          {locationStops.length ? (
            <View style={styles.locationStops}>
              <BusinessLocationMap
                stops={locationStops}
                height={220}
                {...(onMapInteractionChange ? { onInteractionChange: onMapInteractionChange } : {})}
              />
              {locationStops.map((stop) => (
                <View key={stop.id} style={styles.locationStop}>
                  <View
                    style={[styles.locationStopAccent, { backgroundColor: business.primary_color }]}
                  />
                  <View style={styles.locationStopBody}>
                    <View style={styles.locationStopHeader}>
                      <ThemedText style={{ color: business.primary_color }} type="smallBold">
                        {formatStopDate(stop.starts_at)}
                      </ThemedText>
                    </View>
                    <ThemedText type="subtitle">{stop.title}</ThemedText>
                    <ThemedText themeColor="textSecondary" type="small">
                      {formatStopTimeRange(stop.starts_at, stop.ends_at)}
                    </ThemedText>
                    <ThemedText themeColor="textSecondary" type="small">
                      {stop.address_text || 'Map pin set'}
                    </ThemedText>
                    <Pressable
                      accessibilityRole="link"
                      onPress={() => {
                        const url = buildDirectionsUrl(directionsPlatform, {
                          latitude: stop.latitude,
                          longitude: stop.longitude,
                          address: stop.address_text,
                          label: stop.title,
                        });
                        if (url) void openExternal(url, 'We could not open directions.');
                      }}
                      style={[styles.locationStopAction, { borderColor: business.primary_color }]}
                    >
                      <ThemedText style={{ color: business.primary_color }} type="smallBold">
                        Get directions
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <ThemedText themeColor="textSecondary" type="small">
              No upcoming stops have been published yet.
            </ThemedText>
          )}
        </PageSection>
      )}

      {(business.business_type !== 'mobile' ||
        (locationStops.length === 0 && hours.length > 0)) && (
        <PageSection
          title={businessScheduleLabel(business.business_type, locationStops.length, hours.length)}
        >
          <View style={styles.hoursStatus}>
            <View
              style={[
                styles.hoursStatusDot,
                todayHours.state === 'open'
                  ? styles.hoursStatusDotOpen
                  : styles.hoursStatusDotClosed,
              ]}
            />
            <ThemedText style={styles.hoursStatusText} type="smallBold">
              {todayHours.label}
            </ThemedText>
          </View>
          {weeklyHours.length > 0 ? (
            <View style={styles.hours}>
              {weeklyHours.map((group) => (
                <View key={`${group.dayLabel}-${group.hoursLabel}`} style={styles.hourRow}>
                  <ThemedText style={styles.hourDay} type="smallBold">
                    {group.dayLabel}
                  </ThemedText>
                  <ThemedText
                    style={group.isClosed ? styles.closedHours : styles.hourValue}
                    themeColor="textSecondary"
                  >
                    {group.hoursLabel}
                  </ThemedText>
                </View>
              ))}
            </View>
          ) : (
            <ThemedText themeColor="textSecondary">Weekly schedule unavailable.</ThemedText>
          )}
        </PageSection>
      )}

      {menuCategories.length > 0 && (
        <View style={styles.menuSection}>
          <View style={styles.menuHeading}>
            <ThemedText type="subtitle">
              {isMenuBusiness ? 'Menu' : 'Products & services'}
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              {isMenuBusiness ? 'Browse what’s available.' : 'Explore what this business offers.'}
            </ThemedText>
          </View>
          {menuCategories.length > 1 && (
            <HorizontalScrollRow
              accessibilityLabel={isMenuBusiness ? 'Menu categories' : 'Offering categories'}
              contentContainerStyle={styles.menuCategorySelector}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: activeMenuSectionId === null }}
                onPress={() => setSelectedMenuSectionId(null)}
                style={[
                  styles.menuCategoryChip,
                  activeMenuSectionId === null && styles.menuCategoryChipSelected,
                ]}
              >
                <ThemedText
                  style={activeMenuSectionId === null ? styles.menuCategoryChipTextSelected : null}
                  type="smallBold"
                >
                  All
                </ThemedText>
              </Pressable>
              {menuCategories.map((category) => {
                const selected = activeMenuSectionId === category.id;
                return (
                  <Pressable
                    key={category.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setSelectedMenuSectionId(category.id)}
                    style={[styles.menuCategoryChip, selected && styles.menuCategoryChipSelected]}
                  >
                    <ThemedText
                      style={selected ? styles.menuCategoryChipTextSelected : null}
                      type="smallBold"
                    >
                      {category.name}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </HorizontalScrollRow>
          )}
          {visibleMenuCategories.map((category) => (
            <View key={category.id} style={styles.menuCategory}>
              <View style={styles.menuCategoryHeading}>
                <ThemedText style={styles.menuCategoryTitle}>{category.name}</ThemedText>
                {category.description && (
                  <ThemedText style={styles.menuCategoryDescription} themeColor="textSecondary">
                    {category.description}
                  </ThemedText>
                )}
              </View>
              <View style={styles.menuItems}>
                {category.items.map((display) => {
                  const item = display.item as ItemData;
                  const asset = Array.isArray(item.media_assets)
                    ? item.media_assets[0]
                    : item.media_assets;
                  const imageUrl =
                    asset?.status === 'ready' ? storagePublicUrl(asset.storage_path) : null;
                  return (
                    <View
                      key={item.id}
                      accessibilityLabel={
                        `${display.name}${display.priceLabel ? `, ${display.priceLabel}` : ''}` +
                        `${display.description ? `, ${display.description}` : ''}`
                      }
                      style={[
                        styles.itemRow,
                        { backgroundColor: colors.backgroundElement, borderColor: colors.divider },
                      ]}
                    >
                      {imageUrl && (
                        <Image
                          accessibilityLabel={asset.alt_text ?? `${display.name} photo`}
                          cachePolicy="memory-disk"
                          contentFit="cover"
                          source={{ uri: imageUrl }}
                          style={styles.itemImage}
                          transition={180}
                        />
                      )}
                      <View style={styles.itemCopy}>
                        <View style={styles.itemTitleRow}>
                          <ThemedText style={styles.itemName}>{display.name}</ThemedText>
                          {!!display.priceLabel && (
                            <ThemedText numberOfLines={1} style={styles.itemPrice} type="smallBold">
                              {display.priceLabel}
                            </ThemedText>
                          )}
                        </View>
                        {display.description && (
                          <ThemedText
                            numberOfLines={3}
                            style={styles.itemDescription}
                            themeColor="textSecondary"
                          >
                            {display.description}
                          </ThemedText>
                        )}
                        {(item.is_featured || safetyAvailable) && (
                          <View style={styles.itemFooter}>
                            {item.is_featured ? (
                              <View style={styles.itemFeaturedBadge}>
                                <ThemedText style={styles.itemFeaturedText} type="smallBold">
                                  Featured
                                </ThemedText>
                              </View>
                            ) : (
                              <View />
                            )}
                            {safetyAvailable && (
                              <Pressable
                                accessibilityLabel={display.reportAccessibilityLabel}
                                accessibilityRole="button"
                                onPress={() => setMenuOptionsItem(item)}
                                style={styles.itemOverflow}
                              >
                                <SymbolView
                                  name={{
                                    ios: 'ellipsis',
                                    android: 'more_horiz',
                                    web: 'more_horiz',
                                  }}
                                  tintColor={colors.textSecondary}
                                  style={styles.itemOverflowIcon}
                                />
                              </Pressable>
                            )}
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      )}

      {events.length > 0 && (
        <View style={styles.sectionGroup}>
          <ThemedText type="subtitle">Coming up</ThemedText>
          {events.map((event) => (
            <View
              key={event.id}
              style={[
                styles.eventCard,
                { backgroundColor: colors.backgroundElement, borderColor: colors.divider },
              ]}
            >
              <ThemedText style={styles.eventTitle}>{event.title}</ThemedText>
              <BusinessIdentityRow name={business.name} uri={logo?.url} />
              {(() => {
                const eventAsset = Array.isArray(event.media_assets)
                  ? event.media_assets[0]
                  : event.media_assets;
                return eventAsset?.status === 'ready' ? (
                  <Image
                    accessibilityLabel={eventAsset.alt_text ?? `${event.title} cover`}
                    cachePolicy="memory-disk"
                    contentFit="contain"
                    source={{ uri: storagePublicUrl(eventAsset.storage_path) }}
                    style={[
                      styles.eventImage,
                      {
                        aspectRatio:
                          eventAsset.width > 0 && eventAsset.height > 0
                            ? eventAsset.width / eventAsset.height
                            : 16 / 9,
                      },
                    ]}
                    transition={180}
                  />
                ) : null;
              })()}
              <ThemedText style={styles.eventDate}>
                {formatEventDateTime(event.starts_at)}
              </ThemedText>
              {event.description && (
                <ThemedText style={styles.eventDescription} themeColor="textSecondary">
                  {event.description}
                </ThemedText>
              )}
              <View style={styles.eventActions}>
                {!preview && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: eventReminders[event.id] === true }}
                    disabled={actionPending === `event:${event.id}`}
                    onPress={() => void toggleEventReminder(event.id)}
                    style={[
                      styles.inlineAction,
                      eventReminders[event.id] && styles.inlineActionSelected,
                    ]}
                  >
                    <SymbolView
                      name={{
                        ios: eventReminders[event.id] ? 'bell.fill' : 'bell',
                        android: eventReminders[event.id]
                          ? 'notifications_active'
                          : 'notifications_none',
                        web: eventReminders[event.id]
                          ? 'notifications_active'
                          : 'notifications_none',
                      }}
                      tintColor={eventReminders[event.id] ? Brand.onPrimary : colors.text}
                      style={styles.eventActionIcon}
                    />
                    <ThemedText
                      style={eventReminders[event.id] ? styles.inlineActionTextSelected : undefined}
                      type="smallBold"
                    >
                      {actionPending === `event:${event.id}`
                        ? 'Updating…'
                        : eventReminders[event.id]
                          ? 'Reminder on'
                          : 'Remind me'}
                    </ThemedText>
                  </Pressable>
                )}
                {event.address_text ? (
                  <Pressable
                    accessibilityRole="link"
                    onPress={() => {
                      const url = buildDirectionsUrl(directionsPlatform, {
                        address: event.address_text,
                        label: event.title,
                      });
                      if (url) void openExternal(url, 'We could not open directions.');
                    }}
                    style={styles.inlineAction}
                  >
                    <SymbolView
                      name={{ ios: 'map.fill', android: 'directions', web: 'directions' }}
                      tintColor={colors.text}
                      style={styles.eventActionIcon}
                    />
                    <ThemedText type="smallBold">Directions</ThemedText>
                  </Pressable>
                ) : null}
              </View>
              {safetyAvailable && (
                <Pressable
                  onPress={() =>
                    requestReport({
                      type: 'event',
                      businessId: business.id,
                      eventId: event.id,
                      label: event.title,
                    })
                  }
                  style={styles.quietAction}
                >
                  <ThemedText themeColor="textSecondary" type="small">
                    Report event
                  </ThemedText>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      )}

      {loyalty && (
        <View
          style={[
            styles.rewardCard,
            { backgroundColor: colors.backgroundElement, borderColor: colors.divider },
          ]}
        >
          <View style={{ overflow: 'hidden', borderRadius: 16 }}>
            <BusinessBrandHeader
              name={business.name}
              title={loyalty.name}
              color={business.primary_color}
              logoUri={logo?.url}
            />
          </View>
          <ThemedText themeColor="textSecondary">{loyalty.reward_description}</ThemedText>
          <ThemedText type="smallBold">
            {loyalty.program_type === 'points'
              ? `${loyalty.points_per_dollar ?? 1} point${loyalty.points_per_dollar === 1 ? '' : 's'} per $1 · Redeem at ${loyalty.points_required ?? 0} points`
              : `Reward every ${loyalty.stamps_required} visits`}
          </ThemedText>
          {!preview && (
            <AppButton
              variant={loyaltyMembership ? 'secondary' : 'primary'}
              loading={actionPending === 'loyalty'}
              label={
                actionPending === 'loyalty'
                  ? 'Updating…'
                  : loyaltyMembership
                    ? 'In your rewards · Leave'
                    : 'Add to my rewards'
              }
              onPress={() => void toggleLoyaltyMembership()}
            />
          )}
        </View>
      )}

      {gallery.length > 0 && (
        <View style={styles.sectionGroup}>
          <ThemedText type="subtitle">Photos</ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            Tap a photo to view it full screen and swipe through the gallery.
          </ThemedText>
          <View style={styles.gallery}>
            {gallery.map((photo, index) => (
              <Pressable
                key={photo.id}
                accessibilityHint="Opens this photo full screen"
                accessibilityLabel={photo.altText ?? photo.caption ?? 'Business photo'}
                accessibilityRole="button"
                onPress={() => {
                  setViewerIndex(index);
                  viewerScrollX.setValue(index * pageWidth);
                  onViewerChange?.(true);
                  setViewerVisible(true);
                }}
                style={styles.galleryItem}
              >
                <Image
                  cachePolicy="memory-disk"
                  contentFit="contain"
                  source={{ uri: photo.url }}
                  style={[styles.galleryImage, { aspectRatio: photo.aspectRatio }]}
                  transition={180}
                />
                {!!photo.caption && (
                  <ThemedText numberOfLines={2} themeColor="textSecondary" type="small">
                    {photo.caption}
                  </ThemedText>
                )}
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {safetyAvailable && (
        <View style={styles.safetyArea}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setSafetyOpen(true)}
            style={styles.safetyButton}
          >
            <SymbolView
              name={{ ios: 'ellipsis.circle', android: 'more_horiz', web: 'more_horiz' }}
              tintColor={colors.textSecondary}
              style={styles.safetyIcon}
            />
            <ThemedText themeColor="textSecondary" type="smallBold">
              Safety and reporting
            </ThemedText>
          </Pressable>
        </View>
      )}

      <SignInGate
        message={gateIntent ? authIntentExplanation(gateIntent) : ''}
        onCancel={() => setGateIntent(null)}
        onContinue={() => {
          if (!gateIntent) return;
          try {
            savePendingAuthIntent(gateIntent);
            setGateIntent(null);
            router.push('/account');
          } catch {
            setActionMessage('We could not save that action. Please try again.');
          }
        }}
        visible={Boolean(gateIntent)}
      />

      <ReportDialog
        onClose={() => setReportTarget(null)}
        onSuccess={setActionMessage}
        reporterId={session?.user.id ?? null}
        target={reportTarget}
      />

      <Modal
        animationType="fade"
        onRequestClose={() => setMenuOptionsItem(null)}
        transparent
        visible={Boolean(menuOptionsItem)}
      >
        <View style={styles.safetyModalRoot}>
          <Pressable
            accessibilityLabel="Close item options"
            onPress={() => setMenuOptionsItem(null)}
            style={styles.safetyBackdrop}
          />
          <View style={[styles.itemOptionsSheet, { backgroundColor: colors.backgroundElement }]}>
            <ThemedText type="subtitle">{menuOptionsItem?.name ?? 'Item options'}</ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                const item = menuOptionsItem;
                setMenuOptionsItem(null);
                if (!item) return;
                requestReport({
                  type: 'offering_item',
                  businessId: business.id,
                  offeringItemId: item.id,
                  label: item.name,
                });
              }}
              style={styles.itemOptionsAction}
            >
              <SymbolView
                name={{ ios: 'exclamationmark.bubble', android: 'report', web: 'report' }}
                tintColor={colors.textSecondary}
                style={styles.itemOptionsIcon}
              />
              <ThemedText type="smallBold">Report item</ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setMenuOptionsItem(null)}
              style={styles.itemOptionsAction}
            >
              <ThemedText themeColor="textSecondary" type="smallBold">
                Cancel
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setSafetyOpen(false)}
        transparent
        visible={safetyOpen}
      >
        <View style={styles.safetyModalRoot}>
          <Pressable
            accessibilityLabel="Close safety options"
            onPress={() => setSafetyOpen(false)}
            style={styles.safetyBackdrop}
          />
          <View style={[styles.safetySheet, { backgroundColor: colors.backgroundElement }]}>
            <ThemedText type="subtitle">Safety options</ThemedText>
            <ThemedText themeColor="textSecondary" type="small">
              Reports are private. Blocking removes this business from your customer views.
            </ThemedText>
            <Pressable
              onPress={() =>
                requestReport({ type: 'business', businessId: business.id, label: business.name })
              }
              style={[styles.safetyOption, { borderColor: colors.divider }]}
            >
              <ThemedText type="smallBold">Report this business</ThemedText>
            </Pressable>
            <Pressable
              disabled={actionPending === 'block'}
              onPress={confirmBlock}
              style={[styles.safetyOption, { borderColor: colors.divider }]}
            >
              <ThemedText style={styles.destructiveText} type="smallBold">
                {actionPending === 'block' ? 'Blocking…' : 'Block this business'}
              </ThemedText>
            </Pressable>
            <Pressable onPress={() => setSafetyOpen(false)} style={styles.quietAction}>
              <ThemedText type="smallBold">Cancel</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => {
          onViewerChange?.(false);
          setViewerVisible(false);
        }}
        presentationStyle="overFullScreen"
        statusBarTranslucent
        visible={viewerVisible}
      >
        <View style={styles.viewer}>
          <View style={styles.viewerHeader}>
            <ThemedText style={styles.viewerTitle} type="smallBold">
              Business photos
            </ThemedText>
            <Pressable
              accessibilityLabel="Close photo viewer"
              accessibilityRole="button"
              onPress={() => {
                onViewerChange?.(false);
                setViewerVisible(false);
              }}
              style={styles.viewerClose}
            >
              <ThemedText style={styles.viewerCloseText} type="smallBold">
                Close
              </ThemedText>
            </Pressable>
          </View>
          <AnimatedFlatList
            data={gallery}
            extraData={{ viewerIndex, loadedAspectRatios }}
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
            initialScrollIndex={viewerIndex}
            keyExtractor={(photo) => photo.id}
            horizontal
            bounces={false}
            decelerationRate="fast"
            disableIntervalMomentum
            onMomentumScrollEnd={(event) => {
              const nextIndex = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
              setViewerIndex(Math.max(0, Math.min(nextIndex, gallery.length - 1)));
            }}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: viewerScrollX } } }], {
              useNativeDriver: true,
            })}
            scrollEventThrottle={16}
            pagingEnabled
            snapToAlignment="start"
            snapToOffsets={gallery.map((_, index) => index * pageWidth)}
            snapToInterval={pageWidth}
            renderItem={({ item, index }) => (
              <View style={[styles.viewerSlide, { width: pageWidth, height: windowHeight - 96 }]}>
                <Image
                  accessibilityLabel={item.altText ?? item.caption ?? 'Business photo'}
                  cachePolicy="memory-disk"
                  contentPosition="center"
                  contentFit="contain"
                  onLoad={(event) => {
                    const source = event.source;
                    if (!source?.width || !source?.height) return;
                    const aspectRatio = source.width / source.height;
                    setLoadedAspectRatios((current) =>
                      current[item.url] === aspectRatio
                        ? current
                        : { ...current, [item.url]: aspectRatio },
                    );
                  }}
                  source={{ uri: item.url }}
                  style={[
                    styles.viewerImage,
                    {
                      height: imageDisplayHeight(
                        loadedAspectRatios[item.url] ?? item.aspectRatio,
                        pageWidth,
                        Math.max(280, windowHeight - 250),
                      ),
                    },
                  ]}
                />
                <View style={styles.viewerCaption}>
                  <ThemedText style={styles.viewerCounter} type="smallBold">
                    {index + 1} / {gallery.length}
                  </ThemedText>
                  <ThemedText style={styles.viewerCaptionText}>
                    {item.caption || item.altText || 'Business photo'}
                  </ThemedText>
                </View>
              </View>
            )}
            showsHorizontalScrollIndicator={false}
          />
          <View
            accessibilityLabel={`Photo ${viewerIndex + 1} of ${gallery.length}`}
            accessibilityRole="adjustable"
            style={styles.viewerDots}
          >
            {gallery.map((photo, index) => (
              <BusinessPagerDot
                key={`${photo.id}-dot`}
                index={index}
                pageWidth={pageWidth}
                scrollX={viewerScrollX}
              />
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function imageDisplayHeight(aspectRatio: number, pageWidth: number, maxHeight: number) {
  const naturalHeight = pageWidth / Math.max(0.2, aspectRatio);
  const safeMaxHeight = Math.max(1, maxHeight);
  const minimumHeight = Math.min(240, safeMaxHeight);
  return Math.min(safeMaxHeight, Math.max(minimumHeight, Math.round(naturalHeight)));
}

function BusinessPagerDot({
  index,
  pageWidth,
  scrollX,
}: {
  readonly index: number;
  readonly pageWidth: number;
  readonly scrollX: Animated.Value;
}) {
  const center = index * pageWidth;
  const distance = Math.max(1, pageWidth);
  return (
    <Animated.View
      style={[
        styles.viewerDot,
        {
          opacity: scrollX.interpolate({
            inputRange: [center - distance, center, center + distance],
            outputRange: [0.42, 1, 0.42],
            extrapolate: 'clamp',
          }),
          transform: [
            {
              scale: scrollX.interpolate({
                inputRange: [center - distance, center, center + distance],
                outputRange: [0.82, 1.5, 0.82],
                extrapolate: 'clamp',
              }),
            },
          ],
        },
      ]}
    />
  );
}

function PageSection({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <ThemedText type="subtitle">{title}</ThemedText>
      {children}
    </View>
  );
}
function formatTime(value: string | null) {
  if (!value) return '—';
  const [hourText, minute = '00'] = value.split(':');
  const hour = Number(hourText);
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? 'PM' : 'AM'}`;
}
function formatStopDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Scheduled stop';
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
}
function formatStopTimeRange(startsAt: string, endsAt: string) {
  const starts = new Date(startsAt);
  const ends = new Date(endsAt);
  if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime()))
    return 'Time details coming soon';
  return `${formatTime(`${String(starts.getHours()).padStart(2, '0')}:${String(starts.getMinutes()).padStart(2, '0')}`)} – ${formatTime(`${String(ends.getHours()).padStart(2, '0')}:${String(ends.getMinutes()).padStart(2, '0')}`)}`;
}
const styles = StyleSheet.create({
  page: { gap: Spacing.three },
  loader: { marginVertical: Spacing.six },
  previewBanner: {
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    backgroundColor: '#E4F4EC',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  previewText: { color: '#164E38' },
  businessIdentity: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  hero: {
    minHeight: 192,
    borderRadius: Radius.hero,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  cover: { position: 'absolute', inset: 0 },
  heroShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.34)' },
  heroContent: { padding: Spacing.four, gap: Spacing.two },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  logoImage: { width: '100%', height: '100%' },
  kicker: { textTransform: 'uppercase', letterSpacing: 1.4 },
  businessName: { fontSize: 34, lineHeight: 39, fontWeight: '800', letterSpacing: -0.6 },
  glance: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  glanceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  glanceIcon: { width: 20, height: 20 },
  glanceCopy: { flex: 1, gap: 2 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  resumeNotice: {
    borderRadius: Radius.medium,
    backgroundColor: 'rgba(23,107,77,0.12)',
    padding: Spacing.three,
    gap: Spacing.one,
  },
  actionMessage: {
    borderRadius: Radius.medium,
    backgroundColor: 'rgba(120,140,128,0.12)',
    padding: Spacing.three,
  },
  aboutSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Brand.border,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  aboutText: { fontSize: 15, lineHeight: 23 },
  aboutToggle: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  primaryAction: {
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  secondaryAction: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Brand.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  twoColumn: { gap: Spacing.three },
  locationStops: { gap: Spacing.two, marginTop: Spacing.two },
  locationStop: {
    flexDirection: 'row',
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: 'rgba(138,147,142,0.35)',
    backgroundColor: 'rgba(120,140,128,0.07)',
    overflow: 'hidden',
  },
  locationStopAccent: { width: 4 },
  locationStopBody: { flex: 1, gap: Spacing.one, padding: Spacing.three },
  locationStopHeader: { flexDirection: 'row', alignItems: 'center' },
  locationStopAction: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: Radius.small,
    borderWidth: 1,
    paddingHorizontal: 15,
    marginTop: Spacing.one,
  },
  sectionGroup: { gap: Spacing.three },
  card: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Brand.border,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
    gap: Spacing.two,
  },
  hoursStatus: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  hoursStatusDot: { width: 9, height: 9, borderRadius: 5 },
  hoursStatusDotOpen: { backgroundColor: Brand.primaryBright },
  hoursStatusDotClosed: { backgroundColor: '#87938D' },
  hoursStatusText: { flex: 1, fontSize: 15, lineHeight: 21 },
  hours: { gap: 10 },
  hourRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  hourDay: { width: 92, fontSize: 14, lineHeight: 21 },
  hourValue: { flex: 1, fontSize: 14, lineHeight: 21, textAlign: 'right' },
  closedHours: { flex: 1, fontSize: 14, lineHeight: 21, textAlign: 'right' },
  menuSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Brand.border,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
  menuHeading: { gap: 4 },
  menuCategorySelector: { gap: Spacing.one, paddingRight: Spacing.three },
  menuCategoryChip: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Brand.border,
    paddingHorizontal: 15,
  },
  menuCategoryChipSelected: { backgroundColor: Brand.primary, borderColor: Brand.primary },
  menuCategoryChipTextSelected: { color: Brand.onPrimary },
  menuCategory: { gap: Spacing.two },
  menuCategoryHeading: { gap: 4 },
  menuCategoryTitle: { fontSize: 21, lineHeight: 27, fontWeight: '700' },
  menuCategoryDescription: { fontSize: 14, lineHeight: 21 },
  menuItems: { gap: 10 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    minHeight: 96,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.medium,
    padding: 12,
  },
  itemImage: { width: 72, height: 72, borderRadius: 12, backgroundColor: 'rgba(120,140,128,0.12)' },
  itemCopy: { flex: 1, minWidth: 0, gap: 6 },
  itemTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  itemName: { flex: 1, minWidth: 0, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  itemDescription: { fontSize: 14, lineHeight: 20 },
  itemFooter: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemFeaturedBadge: {
    alignSelf: 'center',
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(23,107,77,0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  itemFeaturedText: { color: Brand.primaryBright },
  itemPrice: {
    color: Brand.primaryBright,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    textAlign: 'right',
    flexShrink: 0,
    maxWidth: '42%',
  },
  itemOverflow: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  itemOverflowIcon: { width: 22, height: 22 },
  quietAction: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  eventCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.medium,
    padding: Spacing.three,
    gap: 12,
  },
  eventTitle: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  eventDate: { color: Brand.primaryBright, fontSize: 15, lineHeight: 21, fontWeight: '700' },
  eventDescription: { fontSize: 15, lineHeight: 22, fontWeight: '500' },
  eventImage: { width: '100%', borderRadius: 14, backgroundColor: 'rgba(120,140,128,0.10)' },
  eventActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  inlineAction: {
    alignSelf: 'flex-start',
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Brand.border,
    paddingHorizontal: 16,
  },
  inlineActionSelected: { backgroundColor: Brand.primary, borderColor: Brand.primary },
  inlineActionTextSelected: { color: Brand.onPrimary },
  eventActionIcon: { width: 18, height: 18 },
  rewardCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.medium,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  rewardEyebrow: { color: Brand.primaryBright, letterSpacing: 0.7 },
  rewardAction: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: Radius.small,
    backgroundColor: Brand.primary,
    paddingHorizontal: 16,
    marginTop: Spacing.one,
  },
  rewardActionText: { color: Brand.onPrimary },
  safetyArea: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Brand.border,
    paddingTop: Spacing.two,
  },
  safetyButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    justifyContent: 'center',
  },
  safetyIcon: { width: 18, height: 18 },
  safetyModalRoot: { flex: 1, justifyContent: 'flex-end' },
  safetyBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  safetySheet: {
    borderTopLeftRadius: Radius.large,
    borderTopRightRadius: Radius.large,
    padding: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  itemOptionsSheet: {
    borderTopLeftRadius: Radius.large,
    borderTopRightRadius: Radius.large,
    padding: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.two,
  },
  itemOptionsAction: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  itemOptionsIcon: { width: 20, height: 20 },
  safetyOption: {
    minHeight: 48,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
  },
  destructiveText: { color: '#B42318' },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, alignItems: 'flex-start' },
  galleryItem: {
    width: '48%',
    gap: Spacing.one,
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: 'rgba(120,140,128,0.12)',
  },
  galleryImage: { width: '100%', backgroundColor: 'rgba(120,140,128,0.08)' },
  viewer: { flex: 1, backgroundColor: '#050806', justifyContent: 'center' },
  viewerHeader: {
    position: 'absolute',
    zIndex: 2,
    top: 42,
    left: 20,
    right: 20,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewerTitle: { color: '#FFFFFF', letterSpacing: 0.3 },
  viewerClose: {
    minHeight: 44,
    borderRadius: Radius.small,
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  viewerCloseText: { color: '#FFFFFF' },
  viewerSlide: { justifyContent: 'center', paddingTop: 36, paddingBottom: 18 },
  viewerImage: { width: '100%', alignSelf: 'center' },
  viewerCaption: { minHeight: 90, paddingHorizontal: 24, paddingTop: 10, gap: 4 },
  viewerCounter: { color: '#B7C4BD' },
  viewerCaptionText: { color: '#FFFFFF' },
  viewerDots: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 20,
  },
  viewerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
  viewerDotActive: {},
  errorCard: { borderRadius: 16, backgroundColor: '#F8E6E6', padding: Spacing.three },
  errorText: { color: '#761F1F' },
});
