import type { DiscoveryBusiness } from './discovery-core';

// Query-side expansions are intentionally directional: dinner can find a pizzeria,
// but a search for pizza should not match every restaurant. No external search API.
const concepts: Record<string, readonly string[]> = {
  dinner: [
    'dinner',
    'supper',
    'restaurant',
    'bistro',
    'steak',
    'pizza',
    'pasta',
    'seafood',
    'entree',
    'taco',
    'burger',
    'barbecue',
  ],
  breakfast: ['breakfast', 'brunch', 'pancake', 'waffle', 'omelet', 'biscuit', 'bagel'],
  lunch: ['lunch', 'restaurant', 'sandwich', 'salad', 'wrap', 'bowl', 'taco', 'burger'],
  food: ['restaurant', 'food', 'kitchen', 'cafe', 'bakery', 'pizza', 'sandwich', 'taco'],
  coffee: ['coffee', 'cafe', 'espresso', 'latte', 'cappuccino', 'cold brew'],
  dessert: ['dessert', 'bakery', 'cake', 'cookie', 'ice cream', 'pastry', 'sweet'],
  florist: ['florist', 'flower', 'bouquet', 'floral'],
  clothing: ['clothing', 'apparel', 'boutique', 'fashion'],
  gift: ['gift', 'souvenir', 'gift shop'],
  haircut: ['haircut', 'barber', 'hair salon', 'hair studio', 'cut and finish'],
  plumber: ['plumber', 'plumbing', 'drain', 'pipe repair'],
  cleaning: ['cleaning', 'cleaner', 'housekeeping', 'maid'],
  auto: ['auto', 'automotive', 'car repair', 'mechanic'],
  massage: ['massage', 'massage therapy'],
  nail: ['nail', 'manicure', 'pedicure'],
  lawn: ['lawn', 'landscaping', 'mowing', 'yard care'],
  hvac: ['hvac', 'air conditioning', 'heating', 'cooling'],
  birthday: ['birthday', 'celebration', 'special day'],
};
const aliases: Record<string, string> = {
  supper: 'dinner',
  dine: 'dinner',
  eat: 'food',
  eateries: 'food',
  restaurants: 'food',
  restaurant: 'food',
  restraunts: 'food',
  restraunt: 'food',
  flowers: 'florist',
  flower: 'florist',
  florists: 'florist',
  clothes: 'clothing',
  apparel: 'clothing',
  haircuts: 'haircut',
  plumbers: 'plumber',
  housekeeping: 'cleaning',
  mechanic: 'auto',
  bbq: 'barbecue',
};
const filler = new Set(
  'i im me my we our want would like need looking look find please somewhere somewhere local nearby near around a an the for to of in at with and places place get can you us some best good'.split(
    ' ',
  ),
);
export function searchWords(text: string): string[] {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}
function singular(word: string): string {
  if (word.endsWith('ies') && word.length > 5) return word.slice(0, -3) + 'y';
  if (/(ches|shes|xes|sses)$/.test(word)) return word.slice(0, -2);
  return word.length > 3 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word;
}
// One edit or adjacent transposition only; short words are never fuzzy matched.
function closeWord(a: string, b: string): boolean {
  if (a.length < 5 || b.length < 5 || Math.abs(a.length - b.length) > 1) return false;
  if (a.length === b.length) {
    const diff = [...a].flatMap((c, i) => (c === b[i] ? [] : [i]));
    return (
      diff.length === 1 ||
      (diff.length === 2 &&
        diff[1] === diff[0]! + 1 &&
        a[diff[0]!] === b[diff[1]!] &&
        a[diff[1]!] === b[diff[0]!])
    );
  }
  const [short, long] = a.length < b.length ? [a, b] : [b, a];
  let i = 0;
  while (short[i] === long[i] && i < short.length) i++;
  return short.slice(i) === long.slice(i + 1);
}
const vocabulary = [...new Set([...Object.keys(concepts), ...Object.keys(aliases)])];
export function discoverySearchIntent(query: string) {
  const all = searchWords(query).slice(0, 24);
  const openNow = /\bopen\s+now\b/.test(all.join(' '));
  const pickup = /\b(order\s+ahead|pickup|takeout)\b/.test(all.join(' '));
  const words = all.filter(
    (w) =>
      !filler.has(w) &&
      !(openNow && ['open', 'now'].includes(w)) &&
      !(pickup && ['order', 'ahead', 'pickup', 'takeout'].includes(w)),
  );
  const tokens = words.map((w) => {
    const fixed = vocabulary.includes(w) ? w : (vocabulary.find((v) => closeWord(w, v)) ?? w);
    return aliases[fixed] ?? singular(fixed);
  });
  return { tokens, openNow, pickup, broad: tokens.length === 1 && Boolean(concepts[tokens[0]!]) };
}
function termMatch(term: string, words: readonly string[], namePrefix = false): number {
  if (words.some((w) => singular(w) === singular(term))) return 1;
  if (namePrefix && term.length >= 2 && words.some((w) => w.startsWith(term))) return 0.8;
  if (term.length >= 4 && words.some((w) => w.startsWith(term) && term.length / w.length >= 0.7))
    return 0.8;
  if (words.some((w) => closeWord(term, w))) return 0.65;
  return 0;
}
function phraseMatch(phrase: string, words: readonly string[]): number {
  const terms = searchWords(phrase);
  return terms.length === 1
    ? termMatch(terms[0]!, words)
    : words.join(' ').includes(terms.join(' '))
      ? 1
      : 0;
}
export function businessSearchScore(b: DiscoveryBusiness, query: string): number {
  if (!query.trim()) return 1;
  const intent = discoverySearchIntent(query);
  if (intent.openNow && !b.isOpenNow) return 0;
  if (intent.pickup && !b.supportsPickupOrdering) return 0;
  const fields = [
    [searchWords(b.name), 120],
    [searchWords(b.category_summary ?? ''), 85],
    [searchWords(b.offering_search_text), 35],
    [searchWords(b.description), 20],
    [searchWords(b.city ?? ''), 25],
  ] as const;
  if (!intent.tokens.length) return intent.openNow || intent.pickup ? 1 : 0;
  let score = 0;
  for (const token of intent.tokens) {
    const alternatives = concepts[token] ?? [token];
    let best = 0;
    for (const [words, weight] of fields) {
      best = Math.max(best, termMatch(token, words, weight === 120) * weight);
      for (const synonym of alternatives)
        best = Math.max(best, phraseMatch(synonym, words) * weight * 0.85);
    }
    // Every meaningful term must have evidence. Never silently drop niche modifiers.
    if (!best) return 0;
    score += best;
  }
  const raw = searchWords(query).join(' '),
    name = searchWords(b.name).join(' ');
  if (raw === name) score += 250;
  else if (name.includes(raw)) score += 100;
  return score;
}

/** Correct offering lookup tokens using only words present in the public catalog. */
export function offeringSearchQuery(
  query: string,
  businesses: readonly DiscoveryBusiness[],
): string {
  const intent = discoverySearchIntent(query);
  if (intent.broad) return '';
  const words = [...new Set(businesses.flatMap((b) => searchWords(b.offering_search_text)))].sort();
  return searchWords(query)
    .filter((w) => !filler.has(w) && !['now', 'open', 'pickup', 'takeout'].includes(w))
    .slice(0, 12)
    .map((w) => (words.includes(w) ? w : (words.find((v) => closeWord(w, v)) ?? w)))
    .join(' ');
}
