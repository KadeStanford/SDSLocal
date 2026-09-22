import type { IdentityPhoto } from './business-identity';

export type DiscoverySort = 'name' | 'recent';
export type DiscoveryAudience = 'all' | 'following';
export const DISCOVERY_EVENT_HORIZON_DAYS = 90;
export const DISCOVERY_EVENT_QUERY_LIMIT = 250;
export const DISCOVER_LOCAL_SECTION_TITLE = 'Explore local';
export type DiscoveryFeature = 'all' | 'rewards' | 'events' | 'pickup';

export interface DiscoveryEvent {
  readonly id?: string;
  readonly business_id?: string;
  readonly title?: string;
  readonly address_text?: string | null;
  readonly starts_at: string;
  readonly is_published: boolean;
  readonly publish_at: string | null;
  readonly archived_at: string | null;
}

export type DiscoveryPresentationMode = 'compact-list' | 'curated';

export function discoveryPresentationMode(businessCount: number): DiscoveryPresentationMode {
  return businessCount < 12 ? 'compact-list' : 'curated';
}

function titleCase(value: string): string {
  return value.toLocaleLowerCase().replace(/(^|\s)\p{L}/gu, (match) => match.toLocaleUpperCase());
}

export function canonicalCategoryLabel(summary: string | null): string {
  const first =
    summary
      ?.split(',')
      .map((part) => part.trim())
      .find(Boolean) ?? 'Local business';
  const normalized = titleCase(first);
  return normalized.length <= 18 ? normalized : `${normalized.slice(0, 17).trimEnd()}…`;
}

export interface CategoryOption {
  readonly value: string;
  readonly label: string;
}

export function buildCategoryOptions(
  summaries: readonly (string | null)[],
): readonly CategoryOption[] {
  const usedLabels = new Set<string>();
  const options: CategoryOption[] = [{ value: 'all', label: 'All' }];
  for (const value of [
    ...new Set(summaries.filter((item): item is string => Boolean(item?.trim()))),
  ].sort()) {
    const label = canonicalCategoryLabel(value);
    if (usedLabels.has(label.toLocaleLowerCase())) continue;
    usedLabels.add(label.toLocaleLowerCase());
    options.push({ value: label, label });
  }
  return options;
}

export interface DiscoveryStop {
  readonly starts_at: string;
  readonly ends_at: string;
  readonly is_published?: boolean;
}

export interface DiscoveryBusiness {
  readonly business_photos?: readonly IdentityPhoto[] | null;
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category_summary: string | null;
  readonly offering_search_text: string;
  readonly city: string | null;
  readonly created_at: string;
  readonly status?: string;
  readonly business_type?: string;
  readonly has_active_rewards?: boolean;
  readonly supportsPickupOrdering?: boolean;
  readonly events?: readonly DiscoveryEvent[] | null;
  readonly stops?: readonly DiscoveryStop[] | null;
}

export interface DiscoveryFilters {
  readonly audience: DiscoveryAudience;
  readonly feature: DiscoveryFeature;
  readonly category: string;
  readonly city: string;
  readonly sort: DiscoverySort;
}

export const DEFAULT_DISCOVERY_FILTERS: DiscoveryFilters = {
  audience: 'all',
  feature: 'all',
  category: 'all',
  city: 'all',
  sort: 'name',
};

export function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

export function isPublishedUpcomingEvent(event: DiscoveryEvent, now: Date): boolean {
  const start = Date.parse(event.starts_at);
  return (
    Number.isFinite(start) &&
    start > now.getTime() &&
    event.archived_at === null &&
    (event.is_published ||
      (event.publish_at !== null && Date.parse(event.publish_at) <= now.getTime()))
  );
}

export function discoveryEventHorizonEnd(now: Date): Date {
  return new Date(now.getTime() + DISCOVERY_EVENT_HORIZON_DAYS * 24 * 60 * 60 * 1000);
}

export function hasUpcomingStop(business: DiscoveryBusiness, now: Date): boolean {
  if (business.business_type !== 'mobile') return false;
  return (business.stops ?? []).some((stop) => {
    const end = Date.parse(stop.ends_at);
    return Number.isFinite(end) && end >= now.getTime() && stop.is_published !== false;
  });
}

export type BusinessStatusIndicator = 'pickup' | 'stop' | 'following' | 'event' | 'rewards';

export function businessCardAccessibilityLabel(
  business: Pick<DiscoveryBusiness, 'name' | 'supportsPickupOrdering'>,
) {
  return `Open ${business.name}${business.supportsPickupOrdering ? '. Order ahead available' : ''}`;
}

export function businessStatusIndicators(
  business: DiscoveryBusiness,
  followingIds: ReadonlySet<string>,
  now: Date,
): readonly BusinessStatusIndicator[] {
  const candidates: BusinessStatusIndicator[] = [];
  // Pickup is a durable capability, followed by time-sensitive stops; retain
  // the existing following/event/rewards order for the remaining compact slot.
  if (business.supportsPickupOrdering) candidates.push('pickup');
  if (hasUpcomingStop(business, now)) candidates.push('stop');
  if (followingIds.has(business.id)) candidates.push('following');
  if ((business.events ?? []).some((event) => isPublishedUpcomingEvent(event, now)))
    candidates.push('event');
  if (business.has_active_rewards) candidates.push('rewards');
  return candidates.slice(0, 2);
}

export interface UpcomingEventItem {
  readonly businessPhotos?: readonly IdentityPhoto[] | null | undefined;
  readonly id: string;
  readonly businessId: string;
  readonly businessName: string;
  readonly title: string;
  readonly startsAt: string;
  readonly address: string | null;
}

export function buildUpcomingEventItems(
  events: readonly DiscoveryEvent[],
  businesses: readonly Pick<DiscoveryBusiness, 'id' | 'name' | 'business_photos'>[],
  now: Date,
): readonly UpcomingEventItem[] {
  const names = new Map(businesses.map((business) => [business.id, business.name]));
  const photos = new Map(businesses.map((business) => [business.id, business.business_photos]));
  const seenIds = new Set<string>();
  return events
    .filter(
      (event) =>
        Boolean(event.id && event.business_id && event.title && names.has(event.business_id)) &&
        isPublishedUpcomingEvent(event, now) &&
        !seenIds.has(event.id!) &&
        Boolean(seenIds.add(event.id!)),
    )
    .sort(
      (a, b) =>
        Date.parse(a.starts_at) - Date.parse(b.starts_at) || (a.id ?? '').localeCompare(b.id ?? ''),
    )
    .map((event) => ({
      id: event.id!,
      businessId: event.business_id!,
      businessName: names.get(event.business_id!)!,
      ...(photos.get(event.business_id!) ? { businessPhotos: photos.get(event.business_id!) } : {}),
      title: event.title!,
      startsAt: event.starts_at,
      address: event.address_text ?? null,
    }));
}

export function limitEventPreview<T>(events: readonly T[], maximumVisible: number): readonly T[] {
  const limit = Math.max(0, Math.floor(maximumVisible));
  return events.slice(0, limit);
}

export function upcomingEventPreviewState<T>(events: readonly T[], maximumVisible = 2) {
  const preview = limitEventPreview(events, maximumVisible);
  return {
    preview,
    totalCount: events.length,
    showSeeAll: events.length > preview.length,
  } as const;
}

export function upcomingEventsPath() {
  return '/calendar?scope=all-upcoming' as const;
}

export function businessResultCountLabel(count: number, loading = false): string | null {
  if (loading) return null;
  const safeCount = Math.max(0, Math.floor(count));
  return `${safeCount} ${safeCount === 1 ? 'result' : 'results'}`;
}

export function upcomingSeeAllLabel(totalCount: number): string | null {
  const safeCount = Math.max(0, Math.floor(totalCount));
  return safeCount > 2 ? `See all ${safeCount}` : null;
}

export function formatEventDateTime(value: string, now = new Date()): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date and time unavailable';
  const includeYear = date.getFullYear() !== now.getFullYear();
  const dateText = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(includeYear ? { year: 'numeric' as const } : {}),
  }).format(date);
  const timeText = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
  return `${dateText} · ${timeText}`;
}

export function discoverBottomContentInset(tabInset: number, safeAreaBottom: number): number {
  return Math.max(120, tabInset + safeAreaBottom + 48);
}

export function matchesBusinessSearch(business: DiscoveryBusiness, query: string): boolean {
  const search = normalizeSearch(query);
  if (!search) return true;
  return [
    business.name,
    business.description,
    business.category_summary,
    business.offering_search_text,
    business.city,
  ].some((value) => normalizeSearch(value ?? '').includes(search));
}

export function filterDiscoveryBusinesses<T extends DiscoveryBusiness>(
  businesses: readonly T[],
  query: string,
  filters: DiscoveryFilters,
  followingIds: ReadonlySet<string>,
  blockedIds: ReadonlySet<string>,
  now: Date,
): T[] {
  const filtered = businesses.filter((business) => {
    if (business.status !== undefined && business.status !== 'active') return false;
    if (blockedIds.has(business.id)) return false;
    if (!matchesBusinessSearch(business, query)) return false;
    if (filters.audience === 'following' && !followingIds.has(business.id)) return false;
    if (
      filters.category !== 'all' &&
      canonicalCategoryLabel(business.category_summary) !== filters.category
    )
      return false;
    if (filters.city !== 'all' && business.city !== filters.city) return false;
    if (filters.feature === 'rewards' && !business.has_active_rewards) return false;
    if (filters.feature === 'pickup' && !business.supportsPickupOrdering) return false;
    if (
      filters.feature === 'events' &&
      !(business.events ?? []).some((event) => isPublishedUpcomingEvent(event, now))
    )
      return false;
    return true;
  });
  return [...filtered].sort((a, b) =>
    filters.sort === 'recent'
      ? Date.parse(b.created_at) - Date.parse(a.created_at) || a.name.localeCompare(b.name)
      : a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
  );
}

export type CuratedSectionKind = 'following' | 'events' | 'rewards' | 'mobile' | 'recent' | 'all';

export interface CuratedSection<T extends DiscoveryBusiness> {
  readonly kind: CuratedSectionKind;
  readonly title: string;
  readonly businesses: readonly T[];
}

export function buildCuratedSections<T extends DiscoveryBusiness>(
  businesses: readonly T[],
  followingIds: ReadonlySet<string>,
  now: Date,
): CuratedSection<T>[] {
  const active = businesses.filter(
    (business) => business.status === undefined || business.status === 'active',
  );
  if (discoveryPresentationMode(active.length) === 'compact-list') {
    return active.length
      ? [{ kind: 'all', title: 'Browse businesses', businesses: [...active] }]
      : [];
  }

  const used = new Set<string>();
  const take = (items: readonly T[], limit: number) =>
    items
      .filter((item) => !used.has(item.id))
      .slice(0, limit)
      .filter((item) => {
        used.add(item.id);
        return true;
      });
  const byName = [...active].sort(
    (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
  );
  const byRecent = [...active].sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || a.id.localeCompare(b.id),
  );
  const eventBusinesses = byName.filter((business) =>
    (business.events ?? []).some((event) => isPublishedUpcomingEvent(event, now)),
  );
  const mobileBusinesses = byName.filter((business) => hasUpcomingStop(business, now));
  const candidates: (Omit<CuratedSection<T>, 'businesses'> & {
    items: readonly T[];
    limit: number;
  })[] = [
    {
      kind: 'following',
      title: 'Following',
      items: byName.filter((item) => followingIds.has(item.id)),
      limit: 4,
    },
    { kind: 'events', title: 'Happening soon', items: eventBusinesses, limit: 4 },
    {
      kind: 'rewards',
      title: 'Rewards available',
      items: byName.filter((item) => item.has_active_rewards),
      limit: 4,
    },
    { kind: 'mobile', title: 'Mobile businesses on the move', items: mobileBusinesses, limit: 4 },
    { kind: 'recent', title: 'Recently added', items: byRecent, limit: 4 },
    { kind: 'all', title: 'Browse all businesses', items: byName, limit: 8 },
  ];
  return candidates
    .map(({ items, limit, ...section }) => ({ ...section, businesses: take(items, limit) }))
    .filter((section) => section.businesses.length > 0);
}

export function clearSearch(query: string): string {
  return query ? '' : query;
}

export function clearDiscoveryFilters(): DiscoveryFilters {
  return { ...DEFAULT_DISCOVERY_FILTERS };
}

export interface DiscoveryStateSnapshot {
  readonly query: string;
  readonly filters: DiscoveryFilters;
  readonly scrollOffset: number;
}

export function sanitizeDiscoveryState(snapshot: DiscoveryStateSnapshot): DiscoveryStateSnapshot {
  return {
    query: snapshot.query,
    filters: { ...snapshot.filters },
    scrollOffset: Math.max(0, Number.isFinite(snapshot.scrollOffset) ? snapshot.scrollOffset : 0),
  };
}

export interface BusinessHour {
  readonly day_of_week: number;
  readonly opens_at: string | null;
  readonly closes_at: string | null;
  readonly is_closed: boolean;
}

export interface TodayHoursSummary {
  readonly state: 'open' | 'closed' | 'unknown';
  readonly label: string;
  readonly hoursLabel: string | null;
}

export interface WeeklyHoursGroup {
  readonly dayLabel: string;
  readonly hoursLabel: string;
  readonly isClosed: boolean;
}

export interface MenuSectionInput {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
}

export interface MenuItemInput {
  readonly id: string;
  readonly section_id: string;
  readonly name: string;
  readonly description: string;
  readonly price_minor: number | null;
  readonly price_text: string | null;
  readonly currency: string;
  readonly is_available: boolean;
  readonly is_featured: boolean;
}

export interface MenuItemDisplay<T extends MenuItemInput = MenuItemInput> {
  readonly item: T;
  readonly name: string;
  readonly description: string;
  readonly priceLabel: string;
  readonly reportAccessibilityLabel: string;
}

export interface MenuCategoryDisplay<T extends MenuItemInput = MenuItemInput> {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly items: readonly MenuItemDisplay<T>[];
}

function parseClock(value: string | null): number | null {
  if (!value || !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)) return null;
  const [hours = 0, minutes = 0] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function formatBusinessTime(value: string | null): string | null {
  const minutes = parseClock(value);
  if (minutes === null) return null;
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
}

export function getTodayHours(
  hours: readonly BusinessHour[],
  now: Date,
  timezone?: string,
): TodayHoursSummary {
  const parts = timezone
    ? Object.fromEntries(
        new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          weekday: 'short',
          hour: 'numeric',
          minute: 'numeric',
          hourCycle: 'h23',
        })
          .formatToParts(now)
          .map((p) => [p.type, p.value]),
      )
    : null;
  const today = parts
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday!)
    : now.getDay();
  const todayMinutes = parts
    ? Number(parts.hour) * 60 + Number(parts.minute)
    : now.getHours() * 60 + now.getMinutes();
  const previous = hours.find((item) => item.day_of_week === (today + 6) % 7);
  const previousOpens = parseClock(previous?.opens_at ?? null);
  const previousCloses = parseClock(previous?.closes_at ?? null);
  if (
    previous &&
    !previous.is_closed &&
    previousOpens !== null &&
    previousCloses !== null &&
    previousCloses <= previousOpens &&
    todayMinutes < previousCloses
  ) {
    const closeText = formatBusinessTime(previous.closes_at);
    return {
      state: 'open',
      label: closeText ? `Open until ${closeText}` : 'Open',
      hoursLabel: closeText ? `Open until ${closeText}` : null,
    };
  }
  const row = hours.find((item) => item.day_of_week === today);
  if (!row) return nextOpeningSummary(hours, today);
  if (row.is_closed) return nextOpeningSummary(hours, today, null, 'closed');
  const opens = parseClock(row.opens_at);
  const closes = parseClock(row.closes_at);
  const openText = formatBusinessTime(row.opens_at);
  const closeText = formatBusinessTime(row.closes_at);
  if (opens === null || closes === null || !openText || !closeText)
    return { state: 'unknown', label: 'Hours unavailable', hoursLabel: null };
  const overnight = closes <= opens;
  const isOpen = overnight ? todayMinutes >= opens : todayMinutes >= opens && todayMinutes < closes;
  if (isOpen)
    return {
      state: 'open',
      label: `Open until ${closeText}`,
      hoursLabel: `${openText}–${closeText}`,
    };
  if (!overnight && todayMinutes < opens)
    return {
      state: 'closed',
      label: `Closed · Opens today at ${openText}`,
      hoursLabel: `${openText}–${closeText}`,
    };
  return nextOpeningSummary(hours, today, `${openText}–${closeText}`, 'closed');
}

const fullDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const shortDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const displayDayOrder = [1, 2, 3, 4, 5, 6, 0];

function nextOpeningSummary(
  hours: readonly BusinessHour[],
  today: number,
  hoursLabel: string | null = null,
  fallbackState: TodayHoursSummary['state'] = 'unknown',
): TodayHoursSummary {
  for (let offset = 1; offset <= 7; offset += 1) {
    const day = (today + offset) % 7;
    const next = hours.find((item) => item.day_of_week === day);
    const opens = parseClock(next?.opens_at ?? null);
    const openingText = formatBusinessTime(next?.opens_at ?? null);
    if (next && !next.is_closed && opens !== null && openingText) {
      return {
        state: 'closed',
        label: `Closed · Opens ${fullDayNames[day]} at ${openingText}`,
        hoursLabel,
      };
    }
  }
  return {
    state: fallbackState,
    label: fallbackState === 'closed' ? 'Closed today' : 'Hours unavailable',
    hoursLabel,
  };
}

export function groupWeeklyHours(hours: readonly BusinessHour[]): readonly WeeklyHoursGroup[] {
  const rows = displayDayOrder
    .map((day, order) => {
      const row = hours.find((item) => item.day_of_week === day);
      if (!row) return null;
      if (row.is_closed) return { day, order, hoursLabel: 'Closed', isClosed: true, key: 'closed' };
      const opens = parseClock(row.opens_at);
      const closes = parseClock(row.closes_at);
      const opensText = formatBusinessTime(row.opens_at);
      const closesText = formatBusinessTime(row.closes_at);
      if (opens === null || closes === null || !opensText || !closesText) return null;
      const overnight = closes <= opens;
      const hoursLabel = `${opensText}–${closesText}${overnight ? ' (overnight)' : ''}`;
      return { day, order, hoursLabel, isClosed: false, key: hoursLabel };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const groups: {
    startDay: number;
    endDay: number;
    endOrder: number;
    hoursLabel: string;
    isClosed: boolean;
    key: string;
  }[] = [];
  for (const row of rows) {
    const previous = groups.at(-1);
    if (previous && previous.key === row.key && row.order === previous.endOrder + 1) {
      previous.endDay = row.day;
      previous.endOrder = row.order;
    } else {
      groups.push({
        startDay: row.day,
        endDay: row.day,
        endOrder: row.order,
        hoursLabel: row.hoursLabel,
        isClosed: row.isClosed,
        key: row.key,
      });
    }
  }
  return groups.map((group) => ({
    dayLabel:
      group.startDay === group.endDay
        ? (fullDayNames[group.startDay] ?? 'Day')
        : `${shortDayNames[group.startDay] ?? 'Day'}–${shortDayNames[group.endDay] ?? 'Day'}`,
    hoursLabel: group.hoursLabel,
    isClosed: group.isClosed,
  }));
}

export function businessScheduleLabel(
  businessType: string,
  publishedStopCount: number,
  weeklyHourCount: number,
): 'Hours' | 'Schedule' | 'Where to find us' {
  if (businessType !== 'mobile') return 'Hours';
  if (publishedStopCount > 0) return 'Where to find us';
  return weeklyHourCount > 0 ? 'Schedule' : 'Where to find us';
}

export function formatMenuItemPrice(
  item: Pick<MenuItemInput, 'price_minor' | 'price_text' | 'currency'>,
): string {
  const custom = item.price_text?.trim();
  if (custom) return custom;
  if (item.price_minor === null || !Number.isFinite(item.price_minor)) return '';
  const currency = ['USD', 'CAD', 'EUR', 'GBP', 'AUD'].includes(item.currency)
    ? item.currency
    : 'USD';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(item.price_minor / 100);
  } catch {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
      item.price_minor / 100,
    );
  }
}

export function menuItemReportAccessibilityLabel(name: string): string {
  return `More options for ${name.trim() || 'this item'}`;
}

export function buildMenuCategoryDisplay<T extends MenuItemInput>(
  sections: readonly MenuSectionInput[],
  items: readonly T[],
): readonly MenuCategoryDisplay<T>[] {
  return sections.flatMap((section) => {
    const sectionItems = items
      .filter((item) => item.section_id === section.id)
      .map((item) => {
        const name = item.name.trim() || 'Menu item';
        return {
          item,
          name,
          description: item.description.trim(),
          priceLabel: item.is_available ? formatMenuItemPrice(item) : 'Unavailable',
          reportAccessibilityLabel: menuItemReportAccessibilityLabel(name),
        };
      });
    if (!sectionItems.length) return [];
    return [
      {
        id: section.id,
        name: section.name.trim() || 'Menu',
        description: section.description?.trim() || null,
        items: sectionItems,
      },
    ];
  });
}

export function shouldCollapseBusinessDescription(description: string): boolean {
  return description.trim().length > 260;
}

export type BusinessPageSection =
  | 'identity'
  | 'glance'
  | 'actions'
  | 'stops'
  | 'offerings'
  | 'hours'
  | 'rewards'
  | 'events'
  | 'photos'
  | 'about';

export function businessPageSectionOrder(businessType: string): readonly BusinessPageSection[] {
  if (businessType === 'mobile')
    return [
      'identity',
      'glance',
      'actions',
      'about',
      'stops',
      'offerings',
      'events',
      'rewards',
      'photos',
    ];
  if (businessType === 'food_drink')
    return [
      'identity',
      'glance',
      'actions',
      'about',
      'hours',
      'offerings',
      'events',
      'rewards',
      'photos',
    ];
  if (businessType === 'services')
    return [
      'identity',
      'glance',
      'actions',
      'about',
      'hours',
      'offerings',
      'events',
      'rewards',
      'photos',
    ];
  return [
    'identity',
    'glance',
    'actions',
    'about',
    'hours',
    'offerings',
    'events',
    'rewards',
    'photos',
  ];
}

export function businessImageFallback(name: string, color: string) {
  return { letter: name.trim().slice(0, 1).toLocaleUpperCase() || '•', color };
}
