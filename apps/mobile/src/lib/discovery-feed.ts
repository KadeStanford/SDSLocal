import {
  distanceInMiles,
  isBusinessOpenNow,
  type BusinessHour,
  type DiscoveryBusiness,
} from './discovery-core';

export type DiscoveryDaypart = 'breakfast' | 'lunch' | 'afternoon' | 'dinner' | 'evening';
export interface FeedBusiness extends DiscoveryBusiness {
  readonly timezone?: string;
  readonly hours?: readonly BusinessHour[];
  /** Future curated tags can supplement today's category/menu text without changing the planner. */
  readonly discoveryTags?: readonly string[];
  readonly stops?:
    | readonly {
        readonly starts_at: string;
        readonly ends_at: string;
        readonly is_published?: boolean;
        readonly latitude?: number | null;
        readonly longitude?: number | null;
      }[]
    | null;
}
export interface DiscoveryWeather {
  readonly observedAt: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly condition: 'rain' | 'clear' | 'cloudy' | 'snow';
  readonly temperatureC: number;
}
export interface DiscoveryExposure {
  readonly at: number;
  readonly visit: string;
  readonly sectionIds: readonly string[];
  readonly businessIds: readonly string[];
}
export interface DiscoveryContext {
  readonly now: Date;
  readonly timeZone?: string;
  readonly city?: string;
  readonly seasonLatitude?: number;
  readonly coordinates?: { readonly latitude: number; readonly longitude: number } | undefined;
  readonly radiusMiles?: number;
  readonly visit: string;
  readonly history?: readonly DiscoveryExposure[];
  readonly weather?: DiscoveryWeather;
}
export interface DiscoveryFeedSection {
  readonly id: string;
  readonly title: string;
  readonly reason: string;
  readonly businessIds: readonly string[];
  readonly layout: 'featured' | 'compact';
}
export interface DiscoveryFeedPlan {
  readonly daypart: DiscoveryDaypart;
  readonly season: string | null;
  readonly timeZone: string;
  readonly sections: readonly DiscoveryFeedSection[];
  /** Complete matching sets; selecting a section never loses cards to feed deduplication. */
  readonly filters: readonly Omit<DiscoveryFeedSection, 'layout'>[];
}
type Recipe = {
  id: string;
  title: string;
  reason: string;
  family: string;
  priority: number;
  matches: (b: FeedBusiness) => boolean;
};
const DAY = 86_400_000;
const normalize = (value: string) => value.trim().toLowerCase();
const text = (b: FeedBusiness) =>
  `${b.category_summary ?? ''} ${b.offering_search_text} ${b.description} ${(b.discoveryTags ?? []).join(' ')}`.toLowerCase();
const food = (b: FeedBusiness) => b.business_type === 'food_drink' || b.business_type === 'mobile';
const matches = (pattern: RegExp) => (b: FeedBusiness) => pattern.test(text(b));
const coffee = matches(/\b(coffee|cafe|café|espresso|latte|cold brew|tea)\b/);
const breakfast = matches(
  /\b(breakfast|brunch|pastries|pastry|biscuit|biscuit[s]?|pancakes?|waffles?|bagels?|eggs?)\b/,
);
const lunch = matches(
  /\b(lunch|sandwich(?:es)?|bowls?|salads?|tacos?|burgers?|muffuletta|wraps?)\b/,
);
const dinner = matches(
  /\b(dinner|supper|restaurant|southern plates|entrees?|steak|pizza|seafood|pasta|catfish|cocktails?)\b/,
);

function validCoordinates(
  value: { latitude: number; longitude: number } | undefined,
): value is { latitude: number; longitude: number } {
  return Boolean(
    value &&
    Number.isFinite(value.latitude) &&
    Math.abs(value.latitude) <= 90 &&
    Number.isFinite(value.longitude) &&
    Math.abs(value.longitude) <= 180,
  );
}
export function discoveryLocalMoment(now: Date, requestedZone?: string, latitude?: number) {
  let timeZone = requestedZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      month: 'numeric',
      hourCycle: 'h23',
    }).formatToParts(now);
  } catch {
    timeZone = 'UTC';
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      month: 'numeric',
      hourCycle: 'h23',
    }).formatToParts(now);
  }
  const hour = Number(parts.find((p) => p.type === 'hour')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  const daypart: DiscoveryDaypart =
    hour >= 5 && hour < 11
      ? 'breakfast'
      : hour >= 11 && hour < 15
        ? 'lunch'
        : hour >= 15 && hour < 17
          ? 'afternoon'
          : hour >= 17 && hour < 21
            ? 'dinner'
            : 'evening';
  const seasons = ['winter', 'spring', 'summer', 'autumn'];
  const index = Math.floor((month % 12) / 3);
  const season =
    typeof latitude === 'number' && Number.isFinite(latitude)
      ? seasons[(index + (latitude < 0 ? 2 : 0)) % 4]!
      : null;
  return { daypart, season, timeZone };
}
function hash(input: string) {
  let value = 2166136261;
  for (let i = 0; i < input.length; i++) value = Math.imul(value ^ input.charCodeAt(i), 16777619);
  return (value >>> 0) / 4294967296;
}
export function pruneDiscoveryHistory(
  history: readonly DiscoveryExposure[],
  now: number,
): DiscoveryExposure[] {
  return history.filter((entry) => entry.at <= now && now - entry.at < 7 * DAY).slice(-8);
}
function openNow(b: FeedBusiness, now: Date) {
  return b.hours
    ? b.hours.length > 0
      ? isBusinessOpenNow(b.hours, now, b.timezone)
      : undefined
    : b.isOpenNow;
}
/** Only current or imminent, published stops can establish a mobile business's locality. */
export function mobileDiscoveryDistance(b: FeedBusiness, context: DiscoveryContext): number | null {
  if (!validCoordinates(context.coordinates)) return null;
  const distances = (b.stops ?? [])
    .filter((stop) => {
      const start = Date.parse(stop.starts_at),
        end = Date.parse(stop.ends_at);
      return (
        stop.is_published === true &&
        Number.isFinite(start) &&
        Number.isFinite(end) &&
        start < end &&
        end > context.now.getTime() &&
        start <= context.now.getTime() + 6 * 3_600_000
      );
    })
    .flatMap((stop) => {
      const point =
        typeof stop.latitude === 'number' && typeof stop.longitude === 'number'
          ? { latitude: stop.latitude, longitude: stop.longitude }
          : undefined;
      return validCoordinates(point) ? [distanceInMiles(context.coordinates!, point)] : [];
    });
  return distances.length ? Math.min(...distances) : null;
}
export function buildDiscoveryFeed(
  businesses: readonly FeedBusiness[],
  context: DiscoveryContext,
): DiscoveryFeedPlan {
  const moment = discoveryLocalMoment(
    context.now,
    context.timeZone,
    context.coordinates?.latitude ?? context.seasonLatitude,
  );
  const radius = Number.isFinite(context.radiusMiles)
    ? Math.min(100, Math.max(1, context.radiusMiles!))
    : 15;
  const geo = validCoordinates(context.coordinates);
  const history = pruneDiscoveryHistory(context.history ?? [], context.now.getTime());
  const seen = (id: string, field: 'businessIds' | 'sectionIds') =>
    history.reduce(
      (score, entry, index) =>
        score + (entry[field].includes(id) ? (index + 1) / history.length : 0),
      0,
    );
  const distances = new Map<string, number | null>();
  const uniqueIds = new Set<string>();
  const pool = businesses.filter((b) => {
    if (b.status !== 'active') return false;
    if (uniqueIds.has(b.id)) return false;
    uniqueIds.add(b.id);
    if (context.city && normalize(b.city ?? '') !== normalize(context.city)) return false;
    const distance =
      b.business_type === 'mobile'
        ? mobileDiscoveryDistance(b, context)
        : typeof b.distanceMiles === 'number' &&
            Number.isFinite(b.distanceMiles) &&
            b.distanceMiles >= 0
          ? b.distanceMiles
          : null;
    distances.set(b.id, distance);
    // Do not label an unknown or stale mobile/base location as nearby.
    return !geo || (distance !== null && distance <= radius);
  });
  const available = (b: FeedBusiness) => openNow(b, context.now) !== false;
  const recipes: Recipe[] = [];
  const add = (
    id: string,
    title: string,
    reason: string,
    family: string,
    priority: number,
    predicate: Recipe['matches'],
  ) => recipes.push({ id, title, reason, family, priority, matches: predicate });
  const meal = { breakfast, lunch, dinner };
  if (moment.daypart in meal) {
    const part = moment.daypart as keyof typeof meal;
    add(
      part,
      {
        breakfast: 'Breakfast to start your day',
        lunch: 'Your lunch break',
        dinner: 'Dinner plans, made local',
      }[part],
      'Matched to the local time and published menu or category.',
      'food',
      100,
      (b) => food(b) && available(b) && meal[part](b),
    );
  }
  if (['breakfast', 'lunch', 'afternoon'].includes(moment.daypart))
    add(
      'coffee',
      moment.daypart === 'breakfast' ? 'Your morning coffee' : 'Time for a coffee break',
      'Coffee and tea businesses with relevant published offerings.',
      'food',
      moment.daypart === 'breakfast' ? 82 : 60,
      (b) => food(b) && available(b) && coffee(b),
    );
  if (moment.daypart === 'afternoon' || moment.daypart === 'dinner')
    add(
      'treats',
      'A little something sweet',
      'Desserts and treats listed by these businesses.',
      'food',
      66,
      (b) =>
        food(b) &&
        available(b) &&
        matches(/\b(desserts?|ice cream|beignets?|bakery|cookies?|pastries)\b/)(b),
    );
  if (moment.daypart === 'evening')
    add(
      'open-evening',
      'Still open to explore',
      'Businesses with confirmed opening hours right now.',
      'food',
      100,
      (b) => openNow(b, context.now) === true,
    );
  if (geo)
    add(
      'mobile',
      'Mobile stops near you',
      'Published stops active now or starting within six hours.',
      'mobile',
      76,
      (b) => b.business_type === 'mobile' && mobileDiscoveryDistance(b, context) !== null,
    );
  add(
    'services',
    'A little help, close to home',
    'Local service businesses to explore at your own pace.',
    'services',
    64,
    (b) => b.business_type === 'services',
  );
  add(
    'shops',
    'Shop your neighborhood',
    'Retailers, makers, and local shops.',
    'retail',
    51,
    (b) => b.business_type === 'retail',
  );
  add(
    'rewards',
    'Make your next visit count',
    'Businesses with an active rewards program.',
    'rewards',
    48,
    (b) => b.has_active_rewards === true,
  );
  add('new', 'Recently added', 'Businesses added within the last 30 days.', 'new', 50, (b) => {
    const age = context.now.getTime() - Date.parse(b.created_at);
    return age >= 0 && age <= 30 * DAY;
  });
  add(
    'community',
    'Something to look forward to',
    'Local venues, classes, and community experiences.',
    'community',
    45,
    (b) =>
      ['entertainment_venue', 'general'].includes(b.business_type ?? '') &&
      matches(/\b(music|comedy|classes|workshops|events)\b/)(b),
  );
  // New business categories become useful shelves as their local inventory grows.
  // A single specialist stays discoverable through Services/Explore until there is a group.
  const retailCategories = [
    { id: 'boutiques', title: 'Boutique finds', pattern: /\bboutiques?\b/ },
    {
      id: 'clothing',
      title: 'Refresh your wardrobe',
      pattern: /\b(clothing|apparel|fashion|outfitters)\b/,
    },
    { id: 'gifts', title: 'Thoughtful gifts, close by', pattern: /\b(gifts?|gift shops?)\b/ },
    {
      id: 'florists',
      title: 'Flowers for any occasion',
      pattern: /\b(florists?|flowers?|floral|bouquets?)\b/,
    },
  ];
  for (const category of retailCategories) {
    add(
      category.id,
      category.title,
      'Local shops matched by their published category and offerings.',
      'retail',
      69,
      (b) => b.business_type === 'retail' && category.pattern.test(text(b)),
    );
  }
  const categoryGroups = new Map<string, { label: string; ids: Set<string>; family: string }>();
  for (const b of pool) {
    if (!['services', 'retail', 'general', 'entertainment_venue'].includes(b.business_type ?? ''))
      continue;
    const label = b.category_summary?.split(',')[0]?.trim();
    if (b.business_type === 'retail' && retailCategories.some((c) => c.pattern.test(text(b))))
      continue;
    if (
      !label ||
      label.length > 40 ||
      /^(home services|services|gifts|general|local business)$/i.test(label)
    )
      continue;
    const key = normalize(label);
    const group = categoryGroups.get(key) ?? {
      label,
      ids: new Set<string>(),
      family: b.business_type!,
    };
    group.ids.add(b.id);
    categoryGroups.set(key, group);
  }
  for (const [category, group] of categoryGroups) {
    if (group.ids.size < 2) continue;
    add(
      `category:${category}`,
      group.label,
      'A growing category with multiple businesses in your area.',
      group.family,
      68,
      (b) => group.ids.has(b.id),
    );
  }
  if (moment.season) {
    const seasonal: Record<string, RegExp> = {
      spring: /\b(spring|gardening|garden|flowers)\b/,
      summer: /\b(summer|ice cream|snowballs?|smoothies?)\b/,
      autumn: /\b(autumn|fall menu|pumpkin|harvest)\b/,
      winter: /\b(winter|holiday|hot chocolate|gifts)\b/,
    };
    add(
      'seasonal',
      {
        spring: 'A fresh start for spring',
        summer: 'Summer around the parish',
        autumn: 'A taste of the season',
        winter: 'Winter finds, close to home',
      }[moment.season]!,
      'Seasonal terms in the business’s published offerings or category.',
      'seasonal',
      70,
      (b) => seasonal[moment.season!]!.test(text(b)),
    );
  }
  const weather = context.weather;
  const weatherAge = weather ? context.now.getTime() - Date.parse(weather.observedAt) : Infinity;
  const weatherUsable =
    weather &&
    geo &&
    validCoordinates(weather) &&
    weatherAge >= 0 &&
    weatherAge <= 90 * 60_000 &&
    distanceInMiles(context.coordinates!, weather) <= 20 &&
    Number.isFinite(weather.temperatureC);
  if (weatherUsable) {
    if (weather.condition === 'rain')
      add(
        'rain-coffee',
        'Coffee for a rainy day',
        'Recent local weather, matched with coffee and tea offerings.',
        'food',
        105,
        (b) => food(b) && available(b) && coffee(b),
      );
    else if (weather.temperatureC >= 28)
      add(
        'cool-down',
        'Something to cool you down',
        'Warm local weather and cold drinks or frozen treats on the menu.',
        'food',
        95,
        (b) =>
          food(b) &&
          available(b) &&
          matches(/\b(cold brew|iced|ice cream|smoothies?|snowballs?)\b/)(b),
      );
    else if (weather.temperatureC <= 10)
      add(
        'warm-up',
        'Warm up with something local',
        'Cool local weather and warm drinks or soups on the menu.',
        'food',
        95,
        (b) => food(b) && available(b) && matches(/\b(soup|coffee|hot chocolate|tea)\b/)(b),
      );
  }
  const rank = (b: FeedBusiness, recipeId: string) =>
    (openNow(b, context.now) === true ? 7 : 0) +
    (distances.get(b.id) != null ? Math.max(0, 8 - distances.get(b.id)!) : 0) -
    seen(b.id, 'businessIds') * 8 +
    (history.at(-1)?.businessIds[0] === b.id ? -12 : 0) +
    hash(`${context.visit}:${recipeId}:${b.id}`) * 6;
  const candidates = recipes
    .map((recipe) => ({
      ...recipe,
      businessIds: pool
        .filter(recipe.matches)
        .sort((a, b) => rank(b, recipe.id) - rank(a, recipe.id) || a.id.localeCompare(b.id))
        .map((b) => b.id),
      score:
        recipe.priority -
        seen(recipe.id, 'sectionIds') * 3 +
        hash(`${context.visit}:${recipe.id}`) * 8,
    }))
    .filter((recipe) => recipe.businessIds.length)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const sections: DiscoveryFeedSection[] = [];
  const used = new Set<string>();
  const mobileIds = new Set(candidates.find((c) => c.id === 'mobile')?.businessIds ?? []);
  const familyCounts = new Map<string, number>();
  for (const candidate of candidates) {
    if (
      sections.length >= 5 ||
      (familyCounts.get(candidate.family) ?? 0) >=
        (['food', 'retail'].includes(candidate.family) ? 2 : 1)
    )
      continue;
    const availableIds = candidate.businessIds.filter((id) => !used.has(id));
    const preserveMobileShelf =
      candidate.family === 'food' && availableIds.some((id) => !mobileIds.has(id));
    const ids = availableIds.filter((id) => !preserveMobileShelf || !mobileIds.has(id)).slice(0, 6);
    // A category carousel needs a choice, not a single business under its own heading.
    // Sparse matches stay available through filters and the general discovery row.
    if (ids.length < 2) continue;
    sections.push({
      id: candidate.id,
      title: candidate.title,
      reason: candidate.reason,
      businessIds: ids,
      layout: sections.length === 0 ? 'featured' : 'compact',
    });
    ids.forEach((id) => used.add(id));
    familyCounts.set(candidate.family, (familyCounts.get(candidate.family) ?? 0) + 1);
  }
  const remaining = pool
    .filter((b) => !used.has(b.id))
    .sort((a, b) => rank(b, 'explore') - rank(a, 'explore') || a.id.localeCompare(b.id));
  if (remaining.length)
    sections.push({
      id: 'explore',
      title: sections.length ? 'More to explore' : geo ? 'Discoveries near you' : 'Explore local',
      reason: 'More businesses in your selected area.',
      businessIds: remaining.map((b) => b.id),
      layout: sections.length ? 'compact' : 'featured',
    });
  return {
    ...moment,
    sections,
    filters: candidates.map(({ id, title, reason, businessIds }) => ({
      id,
      title,
      reason,
      businessIds,
    })),
  };
}
