import { offeringSearchQuery } from '@/lib/discovery-search';
import {
  discoverySuggestions,
  offeringPrefixQuery,
  type DiscoverySuggestion,
} from '@/lib/discovery-autocomplete';
import { DiscoveryAutocomplete } from '@/components/discovery-autocomplete';
import { CustomerAction } from '@/components/customer-ui';
import { CustomerBrand } from '@/components/customer-brand';
import { upcomingEventPath } from '@/lib/event-directory';
import { DiscoveryFiltersSheet } from '@/components/discovery-filters-sheet';
import { DiscoverySearchBar } from '@/components/discovery-search-bar';
import { usePullRefresh } from '@/hooks/use-pull-refresh';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { dataDisplayState } from '@/lib/ui-presentation';
import { useScreenBottomPadding } from '@/hooks/use-screen-bottom-padding';
import { AppButton } from '@/components/app-button';
import { ListLoading, StateNotice } from '@/components/data-state';
import { hasActiveLoyalty, type BusinessCardData } from '@/components/business-card';
import { EventCard } from '@/components/event-card';
import { OfferingSearchResultCard } from '@/components/offering-search-result-card';
import { SymbolView } from 'expo-symbols';
import * as Location from 'expo-location';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  Keyboard,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DiscoveryHomeHeader } from '@/components/discovery-home-header';
import { DiscoveryShortcuts } from '@/components/discovery-shortcuts';
import { DiscoveryBusinessFeed } from '@/components/discovery-business-feed';
import { AppChrome } from '@/components/app-chrome';
import { PublicBusinessPageContent } from '@/components/public-business-page';
import { SwipeBackView } from '@/components/swipe-back-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Colors, Radius, Spacing } from '@/constants/theme';
import { storagePublicUrl } from '@/lib/storage-url';
import { supabase } from '@/lib/supabase';
import { loadBusinessReviewSummaries } from '@/lib/business-review-summary';
import { userMessageFromError } from '@/lib/user-error';
import { filterBlockedBusinesses, loadBlockedBusinessIds } from '@/lib/customer-safety';
import {
  buildCategoryOptions,
  buildUpcomingEventItems,
  businessResultCountLabel,
  DISCOVERY_EVENT_QUERY_LIMIT,
  discoveryEventHorizonEnd,
  distanceInMiles,
  formatMenuItemPrice,
  filterDiscoveryBusinesses,
  isBusinessOpenNow,
  upcomingEventPreviewState,
  upcomingEventsPath,
  upcomingSeeAllLabel,
  type DiscoveryFeature,
  type DiscoveryEvent,
  type UpcomingEventItem,
} from '@/lib/discovery-core';
import { useAuth } from '@/providers/auth-provider';
import { pickupCapabilities } from '@/lib/square-commerce';
import { pickupDiscoveryEnabled } from '@/lib/pickup-discovery';
import {
  buildDiscoveryFeed,
  mobileDiscoveryDistance,
  type DiscoveryFeedPlan,
} from '@/lib/discovery-feed';
import { discoveryHistory } from '@/lib/discovery-history-storage';

interface SearchableOffering {
  readonly id: string;
  readonly business_id: string;
  readonly section_id: string;
  readonly name: string;
  readonly description: string;
  readonly price_minor: number | null;
  readonly price_text: string | null;
  readonly currency: string;
  readonly media_assets:
    | { readonly storage_path: string; readonly status: string; readonly alt_text: string | null }
    | readonly {
        readonly storage_path: string;
        readonly status: string;
        readonly alt_text: string | null;
      }[]
    | null;
}

interface SearchOfferingResult extends SearchableOffering {
  readonly sectionName: string;
}

async function knownDiscoveryLocation() {
  try {
    const permission = await Location.getForegroundPermissionsAsync();
    if (permission.status !== 'granted') return null;
    const point = await Location.getLastKnownPositionAsync({ maxAge: 300_000 });
    return point ? { latitude: point.coords.latitude, longitude: point.coords.longitude } : null;
  } catch {
    return null;
  }
}

export default function DiscoverScreen() {
  const params = useLocalSearchParams<{
    businessId?: string;
    resumeAction?: string;
    targetId?: string;
  }>();
  const { session } = useAuth();
  const [businesses, setBusinesses] = useState<BusinessCardData[]>([]);
  const [searchOfferings, setSearchOfferings] = useState<SearchOfferingResult[]>([]);
  const [offeringResultQuery, setOfferingResultQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [initialOfferingQuery, setInitialOfferingQuery] = useState<string | undefined>();
  const [offeringSearchLoading, setOfferingSearchLoading] = useState(false);
  const [offeringSearchError, setOfferingSearchError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'following'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [sort, setSort] = useState<'name' | 'recent' | 'nearby'>('name');
  const [nearbyLocation, setNearbyLocation] = useState<{
    readonly latitude: number;
    readonly longitude: number;
  } | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [eventRecords, setEventRecords] = useState<DiscoveryEvent[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [featureFilter, setFeatureFilter] = useState<DiscoveryFeature>('all');
  const [pickupError, setPickupError] = useState<string | null>(null);
  const [ratingsError, setRatingsError] = useState(false);
  const [businessViewerOpen, setBusinessViewerOpen] = useState(false);
  const [mapInteractionActive, setMapInteractionActive] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(
    typeof params.businessId === 'string' ? params.businessId : null,
  );
  const [loading, setLoading] = useState(true);
  const [partialError, setPartialError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const discoverScrollRef = useRef<ScrollView>(null);
  const discoverScrollOffset = useRef(0);
  const [discoverReturnOffset, setDiscoverReturnOffset] = useState(0);
  const loadRequestId = useRef(0);
  const homeFocused = useRef(false);
  const [feedVisit, setFeedVisit] = useState(() => Date.now());
  const [collection, setCollection] = useState('all');

  const loadBusinesses = useCallback(async () => {
    const requestId = ++loadRequestId.current;
    setLoading(true);
    setError(null);
    setRatingsError(false);
    const now = new Date();
    setFeedVisit(now.getTime());
    setCollection('all');
    const horizon = discoveryEventHorizonEnd(now);
    const [
      businessResult,
      eventResult,
      stopResult,
      followingResult,
      blockedResult,
      pickupResult,
      hoursResult,
      locationsResult,
    ] = await Promise.all([
      supabase
        .from('businesses')
        .select(
          'id, name, description, category_summary, offering_search_text, city, region_code, created_at, primary_color, status, business_type, timezone, business_photos(role, media_assets(storage_path, status)), loyalty_programs(id, is_active)',
        )
        .eq('status', 'active')
        .order('name'),
      supabase
        .from('events')
        .select(
          'id, business_id, title, address_text, starts_at, is_published, publish_at, archived_at',
        )
        .is('archived_at', null)
        .gte('starts_at', now.toISOString())
        .lte('starts_at', horizon.toISOString())
        .order('starts_at')
        .limit(DISCOVERY_EVENT_QUERY_LIMIT),
      supabase
        .from('business_location_stops')
        .select('business_id, starts_at, ends_at, is_published, latitude, longitude')
        .eq('is_published', true)
        .gte('ends_at', now.toISOString())
        .lte('starts_at', horizon.toISOString())
        .order('starts_at')
        .limit(100),
      session
        ? supabase.from('business_follows').select('business_id').eq('customer_id', session.user.id)
        : Promise.resolve({ data: [], error: null }),
      session
        ? loadBlockedBusinessIds(session.user.id).then(
            (data) => ({ data, error: null }),
            (error: unknown) => ({ data: new Set<string>(), error }),
          )
        : Promise.resolve({ data: new Set<string>(), error: null }),
      pickupCapabilities().then(
        (data) => ({ data, failed: false }),
        () => ({ data: [], failed: true }),
      ),
      supabase
        .from('business_hours')
        .select('business_id, day_of_week, opens_at, closes_at, is_closed'),
      supabase.rpc('get_public_business_discovery_locations'),
    ]);
    const queryError = businessResult.error ?? blockedResult.error;
    setPartialError(Boolean(eventResult.error || stopResult.error || followingResult.error || hoursResult.error || locationsResult.error));
    if (requestId !== loadRequestId.current) return;
    setPickupError(
      pickupResult.failed ? 'Order-ahead options could not be checked. Please retry.' : null,
    );
    if (queryError)
      setError(userMessageFromError(queryError, 'We could not load local businesses.'));
    else {
      const eventsByBusiness = new Map<string, BusinessCardData['events']>();
      for (const event of eventResult.data ?? []) {
        const current = eventsByBusiness.get(event.business_id) ?? [];
        eventsByBusiness.set(event.business_id, [...current, event]);
      }
      const stopsByBusiness = new Map<string, NonNullable<BusinessCardData['stops']>>();
      for (const stop of stopResult.data ?? []) {
        const current = stopsByBusiness.get(stop.business_id) ?? [];
        stopsByBusiness.set(stop.business_id, [...current, stop]);
      }
      const hoursByBusiness = new Map<
        string,
        {
          day_of_week: number;
          opens_at: string | null;
          closes_at: string | null;
          is_closed: boolean;
        }[]
      >();
      for (const hour of hoursResult.data ?? []) {
        const current = hoursByBusiness.get(hour.business_id) ?? [];
        current.push(hour);
        hoursByBusiness.set(hour.business_id, current);
      }
      const locationsByBusiness = new Map<
        string,
        { latitude: number; longitude: number; location_kind: string; starts_at: string | null }[]
      >();
      for (const point of (locationsResult.data ?? []) as {
        business_id: string;
        latitude: number;
        longitude: number;
        location_kind: string;
        starts_at: string | null;
      }[]) {
        const current = locationsByBusiness.get(point.business_id) ?? [];
        current.push(point);
        locationsByBusiness.set(point.business_id, current);
      }
      const loaded = ((businessResult.data ?? []) as unknown as BusinessCardData[]).map(
        (business) => {
          const points = locationsByBusiness.get(business.id) ?? [];
          const point =
            points.find((candidate) => candidate.location_kind === 'business') ??
            points
              .filter((candidate) => candidate.location_kind === 'mobile_stop')
              .sort((a, b) =>
                String(a.starts_at ?? '').localeCompare(String(b.starts_at ?? '')),
              )[0];
          const hours = hoursByBusiness.get(business.id) ?? [];
          return {
            ...business,
            hours,
            events: eventsByBusiness.get(business.id) ?? [],
            stops: stopsByBusiness.get(business.id) ?? [],
            latitude: point?.latitude ?? null,
            longitude: point?.longitude ?? null,
            isOpenNow: isBusinessOpenNow(hours, now, business.timezone),
            has_active_rewards: hasActiveLoyalty(business.loyalty_programs),
            supportsPickupOrdering: pickupResult.data.some(
              (row) => row.business_id === business.id,
            ),
            pickupStatus: pickupResult.data.find((row) => row.business_id === business.id)
              ?.pickup_status,
          };
        },
      );
      setBusinesses(filterBlockedBusinesses(loaded, blockedResult.data));
      void loadBusinessReviewSummaries(
        loaded.map((business) => business.id),
        async (ids) => {
          const response = await supabase.rpc('get_public_business_review_summaries', {
            p_business_ids: ids,
          });
          return { data: response.data, error: response.error };
        },
      )
        .then((summaries) => {
          if (requestId !== loadRequestId.current) return;
          setBusinesses((current) =>
            current.map((business) => {
              const summary = summaries.get(business.id);
              return summary ? { ...business, reviewSummary: summary } : business;
            }),
          );
        })
        .catch(() => {
          // Business discovery remains usable; never invent a rating when the summary read fails.
          if (requestId === loadRequestId.current) setRatingsError(true);
        });
      setEventRecords((eventResult.data ?? []) as DiscoveryEvent[]);
      setBlockedIds(blockedResult.data);
      setFollowingIds(
        new Set(
          (followingResult.data ?? []).map((row: { business_id: string }) => row.business_id),
        ),
      );
    }
    setLoading(false);
  }, [session]);

  const pullRefresh = usePullRefresh(loadBusinesses);
  useFocusEffect(
    useCallback(() => {
      homeFocused.current = true;
      void loadBusinesses();
      let active = true;
      // Respect the existing OS permission; do not prompt merely for opening Home.
      void knownDiscoveryLocation().then((point) => {
        if (active) setNearbyLocation(point);
      });
      return () => {
        active = false;
        homeFocused.current = false;
      };
    }, [loadBusinesses]),
  );

  useEffect(() => {
    let active = true;
    let wasBackgrounded = AppState.currentState === 'background';
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'background') wasBackgrounded = true;
      if (next === 'active' && wasBackgrounded && homeFocused.current && !selectedBusinessId) {
        void loadBusinesses();
        void knownDiscoveryLocation().then((point) => {
          if (active && homeFocused.current) setNearbyLocation(point);
        });
      }
      if (next === 'active') wasBackgrounded = false;
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [loadBusinesses, selectedBusinessId]);

  const discoveryBusinesses = useMemo(
    () =>
      businesses.map((business) => ({
        ...business,
        distanceMiles:
          business.business_type === 'mobile' && nearbyLocation
            ? mobileDiscoveryDistance(business, {
                now: new Date(feedVisit),
                visit: String(feedVisit),
                coordinates: nearbyLocation,
              })
            : nearbyLocation &&
                typeof business.latitude === 'number' &&
                typeof business.longitude === 'number'
              ? distanceInMiles(nearbyLocation, {
                  latitude: business.latitude,
                  longitude: business.longitude,
                })
              : null,
      })),
    [businesses, nearbyLocation, feedVisit],
  );

  const enableNearbySort = async () => {
    setLocationMessage(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setLocationMessage('Allow location access to sort businesses by distance.');
        return false;
      }
      const position = await Location.getCurrentPositionAsync({});
      setNearbyLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      return true;
    } catch {
      setLocationMessage('Your location could not be read. Try again or choose another sort.');
      return false;
    }
  };

  const offeringQuery = useMemo(
    () => offeringSearchQuery(query, discoveryBusinesses),
    [query, discoveryBusinesses],
  );
  useEffect(() => {
    const searchTerm = offeringQuery;
    let active = true;
    const businessIds = [
      ...new Set(
        filterDiscoveryBusinesses(
          discoveryBusinesses,
          '',
          {
            audience: filter,
            feature: featureFilter,
            category: categoryFilter,
            city: cityFilter,
            sort,
          },
          followingIds,
          blockedIds,
          new Date(),
        ).map((business) => business.id),
      ),
    ];
    const canSearch = searchTerm.length >= 2 && businessIds.length > 0;
    const resetTimeout = setTimeout(() => {
      if (!active) return;
      setSearchOfferings([]);
      setOfferingResultQuery('');
      setOfferingSearchError(null);
      setOfferingSearchLoading(canSearch);
    }, 0);
    if (!canSearch) {
      return () => {
        active = false;
        clearTimeout(resetTimeout);
      };
    }

    const timeout = setTimeout(() => {
      void (async () => {
        try {
          const sectionResult = await supabase
            .from('offering_sections')
            .select('id, name')
            .eq('is_visible', true)
            .is('archived_at', null)
            .in('business_id', businessIds);
          if (sectionResult.error) throw sectionResult.error;
          if (!active) return;

          const sections = (sectionResult.data ?? []) as { id: string; name: string }[];
          if (!sections.length) {
            setSearchOfferings([]);
            return;
          }
          const sectionNames = new Map(sections.map((section) => [section.id, section.name]));
          const result = await supabase
            .from('offering_items')
            .select(
              'id, business_id, section_id, name, description, price_minor, price_text, currency, media_assets(storage_path, status, alt_text)',
            )
            .eq('is_visible', true)
            .eq('is_available', true)
            .is('archived_at', null)
            .in('business_id', businessIds)
            .in('section_id', [...sectionNames.keys()])
            .textSearch('search_document', offeringPrefixQuery(searchTerm))
            .order('is_featured', { ascending: false })
            .order('display_order', { ascending: true })
            .limit(30);
          if (result.error) throw result.error;
          if (!active) return;
          setOfferingResultQuery(searchTerm);
          setSearchOfferings(
            ((result.data ?? []) as unknown as SearchableOffering[]).flatMap((item) => {
              const sectionName = sectionNames.get(item.section_id);
              return sectionName ? [{ ...item, sectionName }] : [];
            }),
          );
        } catch {
          if (active)
            setOfferingSearchError(
              'Matching offerings could not load. Business matches are still available.',
            );
        } finally {
          if (active) setOfferingSearchLoading(false);
        }
      })();
    }, 250);

    return () => {
      active = false;
      clearTimeout(resetTimeout);
      clearTimeout(timeout);
    };
  }, [
    discoveryBusinesses,
    offeringQuery,
    filter,
    featureFilter,
    categoryFilter,
    cityFilter,
    sort,
    followingIds,
    blockedIds,
  ]);

  useEffect(() => {
    if (typeof params.businessId !== 'string') return;
    const timeout = setTimeout(() => setSelectedBusinessId(params.businessId as string), 0);
    return () => clearTimeout(timeout);
  }, [params.businessId]);

  const categories = useMemo(
    () => buildCategoryOptions(businesses.map((business) => business.category_summary)),
    [businesses],
  );
  const cities = Array.from(
    new Set(businesses.map((business) => business.city?.trim()).filter(Boolean)),
  ).sort((a, b) => (a ?? '').localeCompare(b ?? '')) as string[];

  const visibleBusinesses = useMemo(
    () =>
      filterDiscoveryBusinesses(
        discoveryBusinesses,
        query,
        {
          audience: filter,
          feature: featureFilter,
          category: categoryFilter,
          city: cityFilter,
          sort,
        },
        followingIds,
        blockedIds,
        new Date(),
      ),
    [
      discoveryBusinesses,
      query,
      filter,
      featureFilter,
      categoryFilter,
      cityFilter,
      sort,
      followingIds,
      blockedIds,
    ],
  );
  const offeringEligibleBusinessIds = useMemo(
    () =>
      new Set(
        filterDiscoveryBusinesses(
          discoveryBusinesses,
          '',
          {
            audience: filter,
            feature: featureFilter,
            category: categoryFilter,
            city: cityFilter,
            sort,
          },
          followingIds,
          blockedIds,
          new Date(),
        ).map((business) => business.id),
      ),
    [
      discoveryBusinesses,
      filter,
      featureFilter,
      categoryFilter,
      cityFilter,
      sort,
      followingIds,
      blockedIds,
    ],
  );
  const visibleSearchOfferings = useMemo(
    () =>
      offeringResultQuery === offeringQuery
        ? searchOfferings.filter((offering) =>
            offeringEligibleBusinessIds.has(offering.business_id),
          )
        : [],
    [searchOfferings, offeringEligibleBusinessIds, offeringResultQuery, offeringQuery],
  );
  const suggestions = useMemo(
    () =>
      discoverySuggestions({
        query,
        businesses: discoveryBusinesses.filter((b) => offeringEligibleBusinessIds.has(b.id)),
        offerings: visibleSearchOfferings,
        events: eventRecords,
        now: new Date(),
      }),
    [query, discoveryBusinesses, offeringEligibleBusinessIds, visibleSearchOfferings, eventRecords],
  );
  const businessesById = useMemo(
    () => new Map(discoveryBusinesses.map((business) => [business.id, business])),
    [discoveryBusinesses],
  );
  const activeFilterCount = [
    filter !== 'all',
    featureFilter !== 'all',
    categoryFilter !== 'all',
    cityFilter !== 'all',
    sort !== 'name',
  ].filter(Boolean).length;
  const feedScope = `${session?.user.id ?? 'guest'}:${cityFilter}:${nearbyLocation ? `${nearbyLocation.latitude.toFixed(1)},${nearbyLocation.longitude.toFixed(1)}` : 'city'}`;
  const feedHistory = useMemo(
    () => discoveryHistory.read(feedScope, feedVisit),
    [feedScope, feedVisit],
  );
  const curatedPlan = useMemo(() => {
    // Search, explicit feature filters, and sort choices retain their existing semantics.
    if (
      query.trim() ||
      filter !== 'all' ||
      featureFilter !== 'all' ||
      categoryFilter !== 'all' ||
      sort !== 'name'
    )
      return null;
    const nearest = [...visibleBusinesses]
      .filter((b) => b.distanceMiles != null)
      .sort((a, b) => (a.distanceMiles ?? Infinity) - (b.distanceMiles ?? Infinity))[0];
    const oneZone = new Set(visibleBusinesses.map((b) => b.timezone).filter(Boolean)).size === 1;
    const areaBusiness =
      cityFilter !== 'all'
        ? visibleBusinesses.find((b) => b.city === cityFilter)
        : (nearest ?? (oneZone ? visibleBusinesses[0] : undefined));
    return buildDiscoveryFeed(visibleBusinesses, {
      now: new Date(feedVisit),
      visit: String(feedVisit),
      history: feedHistory,
      ...(areaBusiness?.timezone ? { timeZone: areaBusiness.timezone } : {}),
      ...(typeof areaBusiness?.latitude === 'number'
        ? { seasonLatitude: areaBusiness.latitude }
        : {}),
      ...(cityFilter !== 'all'
        ? { city: cityFilter }
        : nearbyLocation
          ? { coordinates: nearbyLocation }
          : {}),
    });
  }, [
    visibleBusinesses,
    query,
    filter,
    featureFilter,
    categoryFilter,
    cityFilter,
    sort,
    nearbyLocation,
    feedVisit,
    feedHistory,
  ]);
  useEffect(() => {
    if (loading || error || !curatedPlan?.sections.length) return;
    discoveryHistory.record(feedScope, {
      at: feedVisit,
      visit: String(feedVisit),
      sectionIds: curatedPlan.sections.map((s) => s.id),
      businessIds: curatedPlan.sections.flatMap((s) => s.businessIds).slice(0, 3),
    });
  }, [curatedPlan, error, feedScope, feedVisit, loading]);
  const filterSummary = [
    filter === 'following' ? 'Following' : 'All businesses',
    featureFilter === 'accepting-pickup'
      ? 'Accepting pickup'
      : featureFilter === 'pickup'
        ? 'Order ahead'
        : featureFilter === 'rewards'
          ? 'Rewards'
          : featureFilter === 'events'
            ? 'Upcoming events'
            : featureFilter === 'open-now'
              ? 'Open now'
              : null,
    categoryFilter !== 'all' ? categoryFilter : null,
    cityFilter !== 'all' ? cityFilter : null,
    sort === 'recent'
      ? 'Recently added'
      : sort === 'nearby'
        ? 'Nearby'
        : query.trim()
          ? 'Best match'
          : 'A–Z',
  ]
    .filter(Boolean)
    .join(' · ');
  const upcomingEvents = useMemo(
    () => buildUpcomingEventItems(eventRecords, businesses, new Date()),
    [businesses, eventRecords],
  );
  const eventPresentation = upcomingEventPreviewState(upcomingEvents);
  const eventPreview = eventPresentation.preview;
  const resultCountLabel = businessResultCountLabel(
    visibleBusinesses.length,
    loading && businesses.length === 0,
  );
  const bottomContentInset = useScreenBottomPadding();
  const displayState = dataDisplayState(
    loading,
    visibleBusinesses.length,
    error ??
      (featureFilter === 'pickup' || featureFilter === 'accepting-pickup' ? pickupError : null),
  );
  const shouldShowEmptyState =
    displayState === 'empty' &&
    !offeringSearchLoading &&
    visibleSearchOfferings.length === 0 &&
    !suggestions.some((s) => s.kind === 'event');
  const openBusiness = (businessId: string) => {
    setSearchFocused(false);
    setInitialOfferingQuery(undefined);
    Keyboard.dismiss();
    setDiscoverReturnOffset(discoverScrollOffset.current);
    setSelectedBusinessId(businessId);
  };
  const openSuggestion = (suggestion: DiscoverySuggestion) => {
    setSearchFocused(false);
    Keyboard.dismiss();
    if (suggestion.kind === 'event') {
      router.push(upcomingEventPath(suggestion.targetId) as Href);
    } else {
      openBusiness(suggestion.businessId);
      if (suggestion.kind !== 'business') setInitialOfferingQuery(suggestion.title);
    }
  };
  const closeBusiness = () => {
    setSelectedBusinessId(null);
  };

  if (selectedBusinessId) {
    return (
      <SwipeBackView
        enabled={!businessViewerOpen && !mapInteractionActive}
        onSwipeBack={closeBusiness}
        underlay={
          <DiscoverDestinationUnderlay
            area={cityFilter === 'all' ? 'Explore your area' : cityFilter}
            activeFilterCount={activeFilterCount}
            bottomContentInset={bottomContentInset}
            categories={categories}
            categoryFilter={categoryFilter}
            eventPreview={eventPreview}
            featureFilter={featureFilter}
            filterSummary={filterSummary}
            followingIds={followingIds}
            query={query}
            scrollOffset={discoverReturnOffset}
            totalUpcomingEvents={upcomingEvents.length}
            visibleBusinesses={visibleBusinesses}
            curatedPlan={curatedPlan}
            collection={collection}
          />
        }
      >
        <ThemedView style={styles.container}>
          <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
              contentInsetAdjustmentBehavior="automatic"
              contentContainerStyle={[styles.content, { paddingBottom: bottomContentInset }]}
              scrollEnabled={!businessViewerOpen && !mapInteractionActive}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <CustomerAction label="Back to Home" icon="back" iconOnly onPress={closeBusiness} />
                <CustomerBrand />
              </View>
              <PublicBusinessPageContent
                key={selectedBusinessId}
                businessId={selectedBusinessId}
                initialOfferingQuery={initialOfferingQuery}
                {...(typeof params.resumeAction === 'string'
                  ? { resumeAction: params.resumeAction }
                  : {})}
                {...(typeof params.targetId === 'string'
                  ? { resumeTargetId: params.targetId }
                  : {})}
                onViewerChange={setBusinessViewerOpen}
                onMapInteractionChange={setMapInteractionActive}
                onBlocked={(businessId) => {
                  setBusinesses((current) =>
                    current.filter((business) => business.id !== businessId),
                  );
                  setFollowingIds((current) => {
                    const next = new Set(current);
                    next.delete(businessId);
                    return next;
                  });
                  closeBusiness();
                }}
                onFollowingChange={(following) => {
                  setFollowingIds((current) => {
                    const next = new Set(current);
                    if (following) next.add(selectedBusinessId);
                    else next.delete(selectedBusinessId);
                    return next;
                  });
                }}
              />
            </ScrollView>
          </SafeAreaView>
        </ThemedView>
      </SwipeBackView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          ref={discoverScrollRef}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[styles.content, { paddingBottom: bottomContentInset }]}
          contentOffset={{ x: 0, y: Math.max(0, discoverReturnOffset) }}
          keyboardShouldPersistTaps="handled"
          onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
            discoverScrollOffset.current = event.nativeEvent.contentOffset.y;
          }}
          refreshControl={
            <RefreshControl refreshing={pullRefresh.refreshing} onRefresh={pullRefresh.onRefresh} />
          }
          scrollEventThrottle={16}
        >
          <DiscoveryHomeHeader
            actions={<AppChrome inline />}
            area={cityFilter === 'all' ? 'Explore your area' : cityFilter}
            onChooseArea={() => setFiltersOpen(true)}
          >
            <DiscoverySearchBar
              onBrandSurface
              query={query}
              onQuery={(value) => {
                setQuery(value);
                setSearchFocused(true);
              }}
              onFocus={() => setSearchFocused(true)}
              onSubmit={() => {
                setSearchFocused(false);
                Keyboard.dismiss();
              }}
              suggestions={
                searchFocused && query.trim().length >= 2 ? (
                  <DiscoveryAutocomplete
                    suggestions={suggestions}
                    loading={offeringSearchLoading}
                    onSelect={openSuggestion}
                    onSeeResults={() => {
                      setSearchFocused(false);
                      Keyboard.dismiss();
                    }}
                  />
                ) : null
              }
              onFilters={() => {
                setSearchFocused(false);
                Keyboard.dismiss();
                setFiltersOpen((open) => !open);
              }}
              active={activeFilterCount}
              count={query || activeFilterCount ? resultCountLabel : undefined}
              summary={query || activeFilterCount > 0 ? filterSummary : undefined}
            />
          </DiscoveryHomeHeader>
          {!curatedPlan && (
            <DiscoveryShortcuts
              value={featureFilter}
              pickupEnabled={pickupDiscoveryEnabled(process.env.EXPO_PUBLIC_APP_ENV)}
              onChange={setFeatureFilter}
            />
          )}
          {filtersOpen && (
            <DiscoveryFiltersSheet
              searchActive={Boolean(query.trim())}
              initial={{
                category: categoryFilter,
                city: cityFilter,
                audience: filter,
                feature: featureFilter,
                sort,
              }}
              categories={categories}
              cities={cities}
              {...(session ? { followingCount: followingIds.size } : {})}
              pickupEnabled={pickupDiscoveryEnabled(process.env.EXPO_PUBLIC_APP_ENV)}
              countResults={(draft) =>
                filterDiscoveryBusinesses(
                  discoveryBusinesses,
                  query,
                  draft,
                  followingIds,
                  blockedIds,
                  new Date(),
                ).length
              }
              error={locationMessage}
              onClose={() => {
                setFiltersOpen(false);
                setLocationMessage(null);
              }}
              onApply={async (draft) => {
                if (draft.sort === 'nearby' && !(await enableNearbySort())) return false;
                setFilter(draft.audience);
                setFeatureFilter(draft.feature);
                setCategoryFilter(draft.category);
                setCityFilter(draft.city);
                setSort(draft.sort);
                setLocationMessage(null);
                setFiltersOpen(false);
                return true;
              }}
            />
          )}

          {ratingsError && (
            <View style={{ gap: Spacing.two }}>
              <StateNotice message="Ratings are temporarily unavailable." />
              <AppButton
                label="Retry ratings"
                variant="tertiary"
                onPress={() => void loadBusinesses()}
              />
            </View>
          )}
          {pickupError && (
            <View style={{ gap: Spacing.two }}>
              <StateNotice message={pickupError} />
              <AppButton
                label="Retry pickup options"
                variant="secondary"
                onPress={() => void loadBusinesses()}
              />
            </View>
          )}
          {partialError && <View style={{ gap: 8 }}><ThemedText themeColor="textSecondary">Some event, location or opening-hours details couldn’t load. Business browsing is still available.</ThemedText><AppButton label="Retry missing details" variant="secondary" onPress={() => void loadBusinesses()} /></View>}
          {error && (
            <View style={{ gap: Spacing.two }}>
              <StateNotice kind="error" message={error} />
              <AppButton
                label="Try again"
                variant="secondary"
                onPress={() => void loadBusinesses()}
              />
            </View>
          )}
          {displayState === 'loading' ? (
            <ListLoading label="Loading businesses" />
          ) : displayState === 'error' ? null : shouldShowEmptyState ? (
            <View style={styles.emptyCard}>
              <ThemedText type="subtitle">Nothing found</ThemedText>
              <ThemedText themeColor="textSecondary">
                {filter === 'following'
                  ? 'Businesses you follow will appear here.'
                  : featureFilter === 'accepting-pickup'
                    ? 'No matches for these filters. Clear some filters or browse businesses that offer order-ahead.'
                    : 'Try a different business, menu item, category, or city.'}
              </ThemedText>
              {query.trim().length === 1 && (
                <ThemedText type="small" themeColor="textSecondary">
                  Type one more character to search individual offerings.
                </ThemedText>
              )}
              {(query ||
                categoryFilter !== 'all' ||
                cityFilter !== 'all' ||
                filter !== 'all' ||
                featureFilter !== 'all') && (
                <Pressable
                  onPress={() => {
                    setQuery('');
                    setFilter('all');
                    setFeatureFilter('all');
                    setCategoryFilter('all');
                    setCityFilter('all');
                    setSort('name');
                  }}
                  style={styles.clearButton}
                >
                  <ThemedText type="smallBold">Clear filters</ThemedText>
                </Pressable>
              )}
              {!!offeringSearchError && (
                <ThemedText type="small" themeColor="textSecondary">
                  {offeringSearchError}
                </ThemedText>
              )}
            </View>
          ) : (
            <View style={styles.resultsLayout}>
              <DiscoveryBusinessFeed
                title={query.trim() ? 'Places for you' : 'Explore local'}
                businesses={visibleBusinesses}
                followingIds={followingIds}
                onOpenBusiness={openBusiness}
                plan={curatedPlan}
                collection={collection}
                onCollectionChange={setCollection}
              >
                {!query.trim() && activeFilterCount === 0 && upcomingEvents.length > 0 ? (
                  <UpcomingEvents
                    events={eventPreview}
                    totalCount={upcomingEvents.length}
                    onOpenEvent={(id) => router.push(upcomingEventPath(id) as Href)}
                    onSeeAll={() => router.push(upcomingEventsPath() as Href)}
                  />
                ) : null}
              </DiscoveryBusinessFeed>
              {suggestions.some((s) => s.kind === 'event') && (
                <View style={styles.searchResultsSection}>
                  <ThemedText style={styles.localHeading}>Matching events</ThemedText>
                  {suggestions
                    .filter((s) => s.kind === 'event')
                    .map((s) => {
                      const event = eventRecords.find((e) => e.id === s.targetId);
                      const business = businessesById.get(s.businessId);
                      return event && business ? (
                        <EventCard
                          key={s.id}
                          title={s.title}
                          businessName={business.name}
                          photos={business.business_photos}
                          startsAt={event.starts_at}
                          metadata={event.address_text ?? business.city ?? ''}
                          onPress={() => openSuggestion(s)}
                        />
                      ) : null;
                    })}
                </View>
              )}
              {query.trim().length === 1 && (
                <ThemedText type="small" themeColor="textSecondary">
                  Type one more character to search individual offerings.
                </ThemedText>
              )}
              {offeringQuery.length >= 2 && (
                <View style={styles.searchResultsSection}>
                  <ThemedText style={styles.localHeading}>Menu items & services</ThemedText>
                  {offeringSearchLoading ? (
                    <ThemedText
                      type="small"
                      themeColor="textSecondary"
                      accessibilityLiveRegion="polite"
                    >
                      Searching local offerings…
                    </ThemedText>
                  ) : offeringSearchError ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {offeringSearchError}
                    </ThemedText>
                  ) : visibleSearchOfferings.length ? (
                    <View style={styles.list}>
                      {visibleSearchOfferings.map((offering) => {
                        const business = businessesById.get(offering.business_id);
                        if (!business) return null;
                        const assets = Array.isArray(offering.media_assets)
                          ? offering.media_assets
                          : offering.media_assets
                            ? [offering.media_assets]
                            : [];
                        const asset = assets.find((entry) => entry.status === 'ready');
                        return (
                          <OfferingSearchResultCard
                            key={offering.id}
                            businessId={business.id}
                            name={offering.name}
                            description={offering.description}
                            sectionName={offering.sectionName}
                            price={formatMenuItemPrice(offering)}
                            businessName={business.name}
                            location={
                              [business.city, business.region_code].filter(Boolean).join(', ') ||
                              undefined
                            }
                            imageUrl={asset ? storagePublicUrl(asset.storage_path) : null}
                            pickupAvailability={
                              pickupDiscoveryEnabled(process.env.EXPO_PUBLIC_APP_ENV) &&
                              business.supportsPickupOrdering
                                ? business.pickupStatus
                                : undefined
                            }
                            onPress={() => openBusiness(business.id)}
                          />
                        );
                      })}
                    </View>
                  ) : (
                    <ThemedText type="small" themeColor="textSecondary">
                      No exact item matches. Try a specific item or explore the businesses above.
                    </ThemedText>
                  )}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function DiscoverDestinationUnderlay({
  area,
  activeFilterCount,
  bottomContentInset,
  categories,
  categoryFilter,
  eventPreview,
  featureFilter,
  filterSummary,
  followingIds,
  query,
  scrollOffset,
  totalUpcomingEvents,
  visibleBusinesses,
  curatedPlan,
  collection,
}: {
  readonly activeFilterCount: number;
  readonly bottomContentInset: number;
  readonly categories: readonly { readonly label: string; readonly value: string }[];
  readonly categoryFilter: string;
  readonly area: string;
  readonly eventPreview: readonly UpcomingEventItem[];
  readonly featureFilter: DiscoveryFeature;
  readonly filterSummary: string;
  readonly followingIds: ReadonlySet<string>;
  readonly query: string;
  readonly scrollOffset: number;
  readonly totalUpcomingEvents: number;
  readonly visibleBusinesses: readonly BusinessCardData[];
  readonly curatedPlan: DiscoveryFeedPlan | null;
  readonly collection: string;
}) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[styles.content, { paddingBottom: bottomContentInset }]}
          contentOffset={{ x: 0, y: Math.max(0, scrollOffset) }}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
        >
          <DiscoveryHomeHeader
            area={area}
            onChooseArea={() => undefined}
            actions={<AppChrome inline />}
          >
            <DiscoverySearchBar
              onBrandSurface
              query={query}
              onQuery={() => {}}
              onFilters={() => {}}
              active={activeFilterCount}
              count={
                query || activeFilterCount
                  ? businessResultCountLabel(visibleBusinesses.length)
                  : undefined
              }
              summary={query || activeFilterCount > 0 ? filterSummary : undefined}
            />
          </DiscoveryHomeHeader>
          {!curatedPlan && (
            <DiscoveryShortcuts
              value={featureFilter}
              pickupEnabled={pickupDiscoveryEnabled(process.env.EXPO_PUBLIC_APP_ENV)}
              onChange={() => {}}
              interactive={false}
            />
          )}
          <View style={styles.resultsLayout}>
            <DiscoveryBusinessFeed
              businesses={visibleBusinesses}
              followingIds={followingIds}
              onOpenBusiness={() => undefined}
              plan={curatedPlan}
              collection={collection}
            >
              {!query.trim() && activeFilterCount === 0 && totalUpcomingEvents > 0 ? (
                <UpcomingEvents
                  events={eventPreview}
                  totalCount={totalUpcomingEvents}
                  onOpenEvent={() => undefined}
                  onSeeAll={() => undefined}
                />
              ) : null}
            </DiscoveryBusinessFeed>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function UpcomingEvents({
  events,
  totalCount,
  onOpenEvent,
  onSeeAll,
}: {
  readonly events: readonly UpcomingEventItem[];
  readonly totalCount: number;
  readonly onOpenEvent: (eventId: string) => void;
  readonly onSeeAll: () => void;
}) {
  const colors = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const seeAllLabel = upcomingSeeAllLabel(totalCount);
  return (
    <View style={styles.eventSection}>
      <View style={styles.sectionHeading}>
        <ThemedText numberOfLines={1} style={styles.sectionTitle} type="subtitle">
          Coming up
        </ThemedText>
        {seeAllLabel && (
          <Pressable
            accessibilityLabel={`See all ${totalCount} upcoming events`}
            accessibilityRole="button"
            hitSlop={4}
            onPress={onSeeAll}
            style={({ pressed }) => [styles.seeAllAction, pressed && styles.pressed]}
          >
            <ThemedText
              numberOfLines={1}
              style={[styles.seeAllText, { color: colors.accent }]}
              type="smallBold"
            >
              {seeAllLabel}
            </ThemedText>
            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              tintColor={colors.textSecondary}
              style={styles.seeAllIcon}
            />
          </Pressable>
        )}
      </View>
      <View style={styles.eventList}>
        {events.map((event) => (
          <EventCard
            key={event.id}
            title={event.title}
            businessName={event.businessName}
            photos={event.businessPhotos}
            startsAt={event.startsAt}
            metadata={[
              new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(
                new Date(event.startsAt),
              ),
              event.address,
            ]
              .filter(Boolean)
              .join(' · ')}
            onPress={() => onOpenEvent(event.id)}
          />
        ))}{' '}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.72 },
  container: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    padding: 20,
    gap: 18,
  },
  searchWrap: {
    minHeight: 54,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingLeft: 16,
  },
  search: { minHeight: 50, flex: 1, paddingHorizontal: 12, fontSize: 16 },
  searchIcon: { width: 20, height: 20 },
  searchClear: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  categoryScrollContent: { paddingVertical: 4, paddingRight: Spacing.four },
  categorySelector: { flexDirection: 'row', gap: 16 },
  categoryChip: {
    minHeight: 44,
    maxWidth: 176,
    flexShrink: 0,
    justifyContent: 'center',
    borderBottomWidth: 1,
    paddingHorizontal: 2,
  },
  filterToolbar: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  filterSummary: { flex: 1, gap: 2 },
  toolbarCount: { fontSize: 15, lineHeight: 21, fontWeight: '700' },
  filterToggle: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 21,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'rgba(120,140,128,0.10)',
    paddingHorizontal: 14,
  },
  filterToggleActive: { backgroundColor: Brand.primary, borderColor: Brand.primary },
  filterPanel: {
    gap: Spacing.three,
    borderRadius: Radius.large,
    backgroundColor: 'rgba(120,140,128,0.08)',
    padding: Spacing.three,
  },
  filterModalRoot: { flex: 1, justifyContent: 'flex-end' },
  filterModalBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(4, 12, 8, 0.58)',
  },
  filterSheet: {
    width: '100%',
    maxHeight: '78%',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    gap: Spacing.three,
  },
  filterSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  filterSheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: Radius.pill,
    backgroundColor: Brand.border,
    opacity: 0.65,
  },
  filterDoneButton: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: Radius.small,
    backgroundColor: Brand.primary,
    paddingHorizontal: 18,
  },
  filterSheetScroll: { flexGrow: 0, flexShrink: 1 },
  filterSheetContent: { gap: Spacing.four, paddingBottom: Spacing.two },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  filterGroup: { gap: Spacing.two },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingRight: Spacing.four,
  },
  filterButton: {
    minHeight: 44,
    alignSelf: 'flex-start',
    flexShrink: 0,
    justifyContent: 'center',
    borderRadius: Radius.small,
    borderWidth: 1,
    borderColor: Brand.border,
    paddingHorizontal: 16,
  },
  filterButtonSelected: { backgroundColor: Brand.primary, borderColor: Brand.primary },
  controlLabel: { fontSize: 15, lineHeight: 21, fontWeight: '700' },
  filterTextSelected: { color: Brand.onPrimary },
  list: { gap: 10 },
  resultsLayout: { gap: Spacing.four },
  searchResultsSection: { gap: Spacing.two },
  localHeading: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  sectionTitle: { flex: 1, minWidth: 0 },
  seeAllAction: {
    minWidth: 44,
    minHeight: 44,
    flexShrink: 1,
    maxWidth: '55%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
    paddingLeft: Spacing.two,
  },
  seeAllText: { color: Brand.primaryBright, flexShrink: 1 },
  seeAllIcon: { width: 16, height: 16 },
  eventSection: { gap: 12 },
  eventList: { gap: 10 },
  eventRow: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  eventDateBlock: {
    width: 52,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(47,176,124,0.13)',
  },
  eventMonth: { color: Brand.primaryBright, textTransform: 'uppercase' },
  eventDay: { fontSize: 20, lineHeight: 22, fontWeight: '800' },
  eventCopy: { flex: 1, gap: 3 },
  eventTitle: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  eventMetadata: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  eventChevron: { width: 20, height: 20 },
  backButton: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  errorCard: {
    borderRadius: 16,
    backgroundColor: '#F8E6E6',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  errorText: { color: '#761F1F' },
  retryButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: Radius.small,
    backgroundColor: Brand.primary,
    paddingHorizontal: 16,
  },
  emptyCard: {
    borderRadius: 20,
    backgroundColor: 'rgba(120,140,128,0.10)',
    padding: Spacing.four,
    gap: Spacing.two,
  },
  clearButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
  },
});
