import { useColorScheme } from '@/hooks/use-color-scheme';
import { dataDisplayState } from '@/lib/ui-presentation';
import { useScreenBottomPadding } from '@/hooks/use-screen-bottom-padding';
import { AppButton } from '@/components/app-button';
import { ListLoading, StateNotice } from '@/components/data-state';
import { BusinessCard, hasActiveLoyalty, type BusinessCardData } from '@/components/business-card';
import { EventCard } from '@/components/event-card';
import { SymbolView } from 'expo-symbols';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppChrome } from '@/components/app-chrome';
import { HorizontalScrollRow } from '@/components/horizontal-scroll-row';
import { PublicBusinessPageContent } from '@/components/public-business-page';
import { ChoicePicker } from '@/components/choice-picker';
import { SwipeBackView } from '@/components/swipe-back-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Colors, Radius, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { userMessageFromError } from '@/lib/user-error';
import { filterBlockedBusinesses, loadBlockedBusinessIds } from '@/lib/customer-safety';
import {
  buildCategoryOptions,
  buildUpcomingEventItems,
  businessResultCountLabel,
  DISCOVER_LOCAL_SECTION_TITLE,
  DISCOVERY_EVENT_QUERY_LIMIT,
  discoveryEventHorizonEnd,
  filterDiscoveryBusinesses,
  upcomingEventPreviewState,
  upcomingEventsPath,
  upcomingSeeAllLabel,
  type DiscoveryEvent,
  type UpcomingEventItem,
} from '@/lib/discovery-core';
import { useAuth } from '@/providers/auth-provider';
import { pickupCapabilities } from '@/lib/square-commerce';
import { pickupDiscoveryEnabled } from '@/lib/pickup-discovery';

export default function DiscoverScreen() {
  const params = useLocalSearchParams<{
    businessId?: string;
    resumeAction?: string;
    targetId?: string;
  }>();
  const { session } = useAuth();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [businesses, setBusinesses] = useState<BusinessCardData[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'following'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [sort, setSort] = useState<'name' | 'recent'>('name');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [eventRecords, setEventRecords] = useState<DiscoveryEvent[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [featureFilter, setFeatureFilter] = useState<'all' | 'rewards' | 'events' | 'pickup'>(
    'all',
  );
  const [pickupError, setPickupError] = useState<string | null>(null);
  const [businessViewerOpen, setBusinessViewerOpen] = useState(false);
  const [mapInteractionActive, setMapInteractionActive] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(
    typeof params.businessId === 'string' ? params.businessId : null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const discoverScrollRef = useRef<ScrollView>(null);
  const discoverScrollOffset = useRef(0);
  const [discoverReturnOffset, setDiscoverReturnOffset] = useState(0);
  const loadRequestId = useRef(0);

  const loadBusinesses = useCallback(async () => {
    const requestId = ++loadRequestId.current;
    setLoading(true);
    setError(null);
    const now = new Date();
    const horizon = discoveryEventHorizonEnd(now);
    const [businessResult, eventResult, stopResult, followingResult, blockedResult, pickupResult] =
      await Promise.all([
        supabase
          .from('businesses')
          .select(
            'id, name, description, category_summary, offering_search_text, city, region_code, created_at, primary_color, status, business_type, business_photos(role, media_assets(storage_path, status)), loyalty_programs(id, is_active)',
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
          .select('business_id, starts_at, ends_at, is_published')
          .eq('is_published', true)
          .gte('ends_at', now.toISOString())
          .lte('starts_at', horizon.toISOString())
          .order('starts_at')
          .limit(100),
        session
          ? supabase
              .from('business_follows')
              .select('business_id')
              .eq('customer_id', session.user.id)
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
      ]);
    const queryError =
      businessResult.error ??
      eventResult.error ??
      stopResult.error ??
      followingResult.error ??
      blockedResult.error;
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
      const loaded = ((businessResult.data ?? []) as unknown as BusinessCardData[]).map(
        (business) => ({
          ...business,
          events: eventsByBusiness.get(business.id) ?? [],
          stops: stopsByBusiness.get(business.id) ?? [],
          has_active_rewards: hasActiveLoyalty(business.loyalty_programs),
          supportsPickupOrdering: pickupResult.data.some((row) => row.business_id === business.id),
          pickupStatus: pickupResult.data.find((row) => row.business_id === business.id)
            ?.pickup_status,
        }),
      );
      setBusinesses(filterBlockedBusinesses(loaded, blockedResult.data));
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

  useFocusEffect(
    useCallback(() => {
      void loadBusinesses();
    }, [loadBusinesses]),
  );

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
        businesses,
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
      businesses,
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
  const activeFilterCount = [
    filter !== 'all',
    featureFilter !== 'all',
    categoryFilter !== 'all',
    cityFilter !== 'all',
    sort !== 'name',
  ].filter(Boolean).length;
  const filterSummary = [
    filter === 'following' ? 'Following' : 'All businesses',
    featureFilter === 'pickup'
      ? 'Order ahead'
      : featureFilter === 'rewards'
        ? 'Rewards'
        : featureFilter === 'events'
          ? 'Upcoming events'
          : null,
    categoryFilter !== 'all' ? categoryFilter : null,
    cityFilter !== 'all' ? cityFilter : null,
    sort === 'recent' ? 'Recently added' : 'A–Z',
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
    error ?? (featureFilter === 'pickup' ? pickupError : null),
  );
  const openBusiness = (businessId: string) => {
    setDiscoverReturnOffset(discoverScrollOffset.current);
    setSelectedBusinessId(businessId);
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
            activeFilterCount={activeFilterCount}
            bottomContentInset={bottomContentInset}
            categories={categories}
            categoryFilter={categoryFilter}
            eventPreview={eventPreview}
            filterSummary={filterSummary}
            followingIds={followingIds}
            query={query}
            scrollOffset={discoverReturnOffset}
            totalUpcomingEvents={upcomingEvents.length}
            visibleBusinesses={visibleBusinesses}
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
              <Pressable onPress={closeBusiness} style={styles.backButton}>
                <ThemedText type="smallBold">‹ Discover</ThemedText>
              </Pressable>
              <PublicBusinessPageContent
                businessId={selectedBusinessId}
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
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadBusinesses} />}
          scrollEventThrottle={16}
        >
          <AppChrome />
          <View style={styles.heading}>
            <ThemedText style={styles.screenTitle}>Discover</ThemedText>
            <ThemedText numberOfLines={2} style={styles.screenSubtitle} themeColor="textSecondary">
              Find food, shops, services, and events.
            </ThemedText>
          </View>
          <View style={[styles.searchWrap, { backgroundColor: colors.backgroundElement }]}>
            <SymbolView
              name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
              tintColor={colors.textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              accessibilityLabel="Search businesses"
              value={query}
              onChangeText={setQuery}
              placeholder="Search businesses and services"
              placeholderTextColor={colors.textSecondary}
              returnKeyType="search"
              style={[styles.search, { color: colors.text }]}
            />
            {!!query && (
              <Pressable
                accessibilityLabel="Clear search"
                onPress={() => setQuery('')}
                style={styles.searchClear}
              >
                <SymbolView
                  name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }}
                  tintColor={colors.textSecondary}
                  style={styles.searchIcon}
                />
              </Pressable>
            )}
          </View>
          <HorizontalScrollRow contentContainerStyle={styles.categoryScrollContent}>
            <View style={styles.categorySelector} accessibilityRole="radiogroup">
              {categories.map((category) => (
                <CategoryChip
                  key={category.value}
                  label={category.label}
                  selected={categoryFilter === category.value}
                  onPress={() => setCategoryFilter(category.value)}
                />
              ))}
            </View>
          </HorizontalScrollRow>
          <View style={styles.filterToolbar}>
            <View style={styles.filterSummary}>
              {resultCountLabel && (
                <ThemedText style={styles.toolbarCount}>{resultCountLabel}</ThemedText>
              )}
              {(query || activeFilterCount > 0) && (
                <ThemedText numberOfLines={1} themeColor="textSecondary" type="small">
                  {filterSummary}
                </ThemedText>
              )}
            </View>
            <Pressable
              accessibilityLabel={`Filters${activeFilterCount ? `, ${activeFilterCount} active` : ''}`}
              accessibilityRole="button"
              onPress={() => setFiltersOpen((open) => !open)}
              style={[styles.filterToggle, filtersOpen && styles.filterToggleActive]}
            >
              <ThemedText
                style={filtersOpen ? styles.filterTextSelected : undefined}
                type="smallBold"
              >
                Filters{activeFilterCount ? ` ${activeFilterCount}` : ''}
              </ThemedText>
            </Pressable>
          </View>
          <Modal
            animationType="slide"
            onRequestClose={() => setFiltersOpen(false)}
            transparent
            visible={filtersOpen}
          >
            <View style={styles.filterModalRoot}>
              <Pressable
                accessibilityLabel="Close filters"
                accessibilityRole="button"
                onPress={() => setFiltersOpen(false)}
                style={styles.filterModalBackdrop}
              />
              <View
                style={[
                  styles.filterPanel,
                  styles.filterSheet,
                  {
                    backgroundColor: colors.backgroundElement,
                    borderColor: colors.divider,
                    paddingBottom: Math.max(Spacing.four, insets.bottom + Spacing.four),
                  },
                ]}
              >
                <View style={styles.filterSheetHandle} />
                <View style={styles.filterSheetHeader}>
                  <View>
                    <ThemedText type="subtitle">Filters</ThemedText>
                    <ThemedText themeColor="textSecondary" type="small">
                      Narrow your results without losing your place.
                    </ThemedText>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setFiltersOpen(false)}
                    style={styles.filterDoneButton}
                  >
                    <ThemedText style={styles.filterTextSelected} type="smallBold">
                      Done
                    </ThemedText>
                  </Pressable>
                </View>
                <ScrollView
                  contentContainerStyle={styles.filterSheetContent}
                  showsVerticalScrollIndicator={false}
                  style={styles.filterSheetScroll}
                >
                  {session && (
                    <View style={styles.filterGroup} accessibilityRole="radiogroup">
                      <ThemedText themeColor="textSecondary" type="smallBold">
                        Show
                      </ThemedText>
                      <View style={styles.filters}>
                        {(['all', 'following'] as const).map((value) => (
                          <FilterChip
                            key={value}
                            label={
                              value === 'all'
                                ? 'All businesses'
                                : `Following (${followingIds.size})`
                            }
                            selected={filter === value}
                            onPress={() => setFilter(value)}
                          />
                        ))}
                      </View>
                    </View>
                  )}
                  <View style={styles.filterGroup} accessibilityRole="radiogroup">
                    <ThemedText themeColor="textSecondary" type="smallBold">
                      Highlights
                    </ThemedText>
                    <View style={styles.filters}>
                      <FilterChip
                        label="Everything"
                        selected={featureFilter === 'all'}
                        onPress={() => setFeatureFilter('all')}
                      />
                      <FilterChip
                        label="Rewards"
                        selected={featureFilter === 'rewards'}
                        onPress={() => setFeatureFilter('rewards')}
                      />
                      {pickupDiscoveryEnabled(process.env.EXPO_PUBLIC_APP_ENV) && (
                        <FilterChip
                          label="Order ahead"
                          selected={featureFilter === 'pickup'}
                          onPress={() => setFeatureFilter('pickup')}
                        />
                      )}
                      <FilterChip
                        label="Upcoming events"
                        selected={featureFilter === 'events'}
                        onPress={() => setFeatureFilter('events')}
                      />
                    </View>
                  </View>
                  <ChoicePicker
                    label="Category"
                    options={[
                      { value: 'all', label: 'All categories' },
                      ...categories
                        .filter((category) => category.value !== 'all')
                        .map((category) => ({ value: category.value, label: category.label })),
                    ]}
                    value={categoryFilter}
                    onChange={(value) => setCategoryFilter(value)}
                  />
                  <View style={styles.filterGroup}>
                    <ThemedText themeColor="textSecondary" type="smallBold">
                      Location
                    </ThemedText>
                    <HorizontalScrollRow>
                      <View style={styles.chipRow} accessibilityRole="radiogroup">
                        <FilterChip
                          label="All cities"
                          selected={cityFilter === 'all'}
                          onPress={() => setCityFilter('all')}
                        />
                        {cities.map((city) => (
                          <FilterChip
                            key={city}
                            label={city}
                            selected={cityFilter === city}
                            onPress={() => setCityFilter(city)}
                          />
                        ))}
                      </View>
                    </HorizontalScrollRow>
                  </View>
                  <View style={styles.filterGroup} accessibilityRole="radiogroup">
                    <ThemedText themeColor="textSecondary" type="smallBold">
                      Sort by
                    </ThemedText>
                    <View style={styles.filters}>
                      <FilterChip
                        label="A–Z"
                        selected={sort === 'name'}
                        onPress={() => setSort('name')}
                      />
                      <FilterChip
                        label="Recently added"
                        selected={sort === 'recent'}
                        onPress={() => setSort('recent')}
                      />
                    </View>
                  </View>
                  {activeFilterCount > 0 && (
                    <Pressable
                      onPress={() => {
                        setFilter('all');
                        setFeatureFilter('all');
                        setCategoryFilter('all');
                        setCityFilter('all');
                        setSort('name');
                      }}
                      style={styles.clearButton}
                    >
                      <ThemedText type="smallBold">Clear all filters</ThemedText>
                    </Pressable>
                  )}
                </ScrollView>
              </View>
            </View>
          </Modal>

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
          ) : displayState === 'error' ? null : displayState === 'empty' ? (
            <View style={styles.emptyCard}>
              <ThemedText type="subtitle">Nothing found</ThemedText>
              <ThemedText themeColor="textSecondary">
                {filter === 'following'
                  ? 'Businesses you follow will appear here.'
                  : 'Try a different business name, category, or city.'}
              </ThemedText>
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
            </View>
          ) : (
            <View style={styles.resultsLayout}>
              {!query.trim() && activeFilterCount === 0 && upcomingEvents.length > 0 && (
                <UpcomingEvents
                  events={eventPreview}
                  totalCount={upcomingEvents.length}
                  onOpenBusiness={openBusiness}
                  onSeeAll={() => router.push(upcomingEventsPath() as Href)}
                />
              )}
              <ThemedText style={styles.localHeading}>{DISCOVER_LOCAL_SECTION_TITLE}</ThemedText>
              <View style={styles.list}>
                {visibleBusinesses.map((business) => (
                  <BusinessCard
                    key={business.id}
                    business={business}
                    isFollowing={followingIds.has(business.id)}
                    onPress={() => openBusiness(business.id)}
                  />
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function DiscoverDestinationUnderlay({
  activeFilterCount,
  bottomContentInset,
  categories,
  categoryFilter,
  eventPreview,
  filterSummary,
  followingIds,
  query,
  scrollOffset,
  totalUpcomingEvents,
  visibleBusinesses,
}: {
  readonly activeFilterCount: number;
  readonly bottomContentInset: number;
  readonly categories: readonly { readonly label: string; readonly value: string }[];
  readonly categoryFilter: string;
  readonly eventPreview: readonly UpcomingEventItem[];
  readonly filterSummary: string;
  readonly followingIds: ReadonlySet<string>;
  readonly query: string;
  readonly scrollOffset: number;
  readonly totalUpcomingEvents: number;
  readonly visibleBusinesses: readonly BusinessCardData[];
}) {
  const colors = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];

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
          <AppChrome />
          <View style={styles.heading}>
            <ThemedText style={styles.screenTitle}>Discover</ThemedText>
            <ThemedText numberOfLines={2} style={styles.screenSubtitle} themeColor="textSecondary">
              Find food, shops, services, and events.
            </ThemedText>
          </View>
          <View style={[styles.searchWrap, { backgroundColor: colors.backgroundElement }]}>
            <SymbolView
              name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
              tintColor={colors.textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              accessibilityLabel="Search businesses"
              editable={false}
              value={query}
              placeholder="Search businesses and services"
              placeholderTextColor={colors.textSecondary}
              style={[styles.search, { color: colors.text }]}
            />
          </View>
          <HorizontalScrollRow
            contentContainerStyle={styles.categoryScrollContent}
            scrollEnabled={false}
          >
            <View style={styles.categorySelector} accessibilityRole="radiogroup">
              {categories.map((category) => (
                <CategoryChip
                  key={category.value}
                  label={category.label}
                  selected={categoryFilter === category.value}
                  onPress={() => undefined}
                />
              ))}
            </View>
          </HorizontalScrollRow>
          <View style={styles.filterToolbar}>
            <View style={styles.filterSummary}>
              <ThemedText style={styles.toolbarCount}>
                {businessResultCountLabel(visibleBusinesses.length)}
              </ThemedText>
              {(query || activeFilterCount > 0) && (
                <ThemedText numberOfLines={1} themeColor="textSecondary" type="small">
                  {filterSummary}
                </ThemedText>
              )}
            </View>
            <View style={styles.filterToggle}>
              <ThemedText type="smallBold">
                Filters{activeFilterCount ? ` ${activeFilterCount}` : ''}
              </ThemedText>
            </View>
          </View>
          <View style={styles.resultsLayout}>
            {!query.trim() && activeFilterCount === 0 && totalUpcomingEvents > 0 && (
              <UpcomingEvents
                events={eventPreview}
                totalCount={totalUpcomingEvents}
                onOpenBusiness={() => undefined}
                onSeeAll={() => undefined}
              />
            )}
            <ThemedText style={styles.localHeading}>{DISCOVER_LOCAL_SECTION_TITLE}</ThemedText>
            <View style={styles.list}>
              {visibleBusinesses.map((business) => (
                <BusinessCard
                  key={business.id}
                  business={business}
                  isFollowing={followingIds.has(business.id)}
                  onPress={() => undefined}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function UpcomingEvents({
  events,
  totalCount,
  onOpenBusiness,
  onSeeAll,
}: {
  readonly events: readonly UpcomingEventItem[];
  readonly totalCount: number;
  readonly onOpenBusiness: (businessId: string) => void;
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
            onPress={() => onOpenBusiness(event.businessId)}
          />
        ))}{' '}
      </View>
    </View>
  );
}

function CategoryChip({
  label,
  selected,
  onPress,
}: {
  readonly label: string;
  readonly selected: boolean;
  readonly onPress: () => void;
}) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[
        styles.categoryChip,
        { backgroundColor: colors.backgroundElement },
        selected && styles.categoryChipSelected,
      ]}
    >
      <ThemedText
        numberOfLines={1}
        style={[styles.controlLabel, selected && styles.filterTextSelected]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  readonly label: string;
  readonly selected: boolean;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.filterButton, selected && styles.filterButtonSelected]}
    >
      <ThemedText
        numberOfLines={1}
        style={[styles.controlLabel, selected && styles.filterTextSelected]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.72 },
  container: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  heading: { gap: 4, paddingRight: 58 },
  screenTitle: { fontSize: 32, lineHeight: 38, fontWeight: '800', letterSpacing: -0.5 },
  screenSubtitle: { fontSize: 16, lineHeight: 22 },
  searchWrap: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.medium,
    paddingLeft: 16,
  },
  search: { minHeight: 50, flex: 1, paddingHorizontal: 12, fontSize: 16 },
  searchIcon: { width: 20, height: 20 },
  searchClear: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  categoryScrollContent: { paddingVertical: 2, paddingRight: Spacing.four },
  categorySelector: { flexDirection: 'row', gap: 10 },
  categoryChip: {
    minHeight: 44,
    maxWidth: 176,
    flexShrink: 0,
    justifyContent: 'center',
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
  },
  categoryChipSelected: { backgroundColor: Brand.primary },
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
