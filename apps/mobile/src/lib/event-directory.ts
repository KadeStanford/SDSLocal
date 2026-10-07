export type DirectoryEvent = {
  id: string;
  title: string;
  businessId: string;
  businessName: string;
  city: string;
  category: string;
  startsAt: string;
  timezone: string;
  address: string;
  imageUri?: string | null;
};
export type EventDirectoryFilter = {
  query: string;
  city: string;
  category: string;
  when: 'any' | 'today' | 'week' | 'weekend';
};
export const defaultEventDirectoryFilter: EventDirectoryFilter = {
  query: '',
  city: '',
  category: '',
  when: 'any',
};

function localDate(value: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(value);
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return Date.UTC(n('year'), n('month') - 1, n('day'));
}
export function filterDirectoryEvents<T extends DirectoryEvent>(
  events: readonly T[],
  filter: EventDirectoryFilter,
  now: Date,
) {
  const q = filter.query.trim().toLocaleLowerCase();
  return events
    .filter((event) => {
      const date = new Date(event.startsAt);
      if (!Number.isFinite(date.getTime()) || date < now) return false;
      if (filter.city && event.city !== filter.city) return false;
      if (filter.category && event.category !== filter.category) return false;
      if (
        q &&
        !`${event.title} ${event.businessName} ${event.category} ${event.city} ${event.address}`
          .toLocaleLowerCase()
          .includes(q)
      )
        return false;
      const today = localDate(now, event.timezone || 'America/Chicago');
      const day = localDate(date, event.timezone || 'America/Chicago');
      const distance = (day - today) / 86400000;
      if (filter.when === 'today') return distance === 0;
      if (filter.when === 'week') return distance >= 0 && distance < 7;
      if (filter.when === 'weekend') {
        const weekday = new Date(today).getUTCDay();
        const start = weekday === 0 ? 0 : (6 - weekday + 7) % 7;
        return distance >= start && distance <= start + (weekday === 0 ? 0 : 1);
      }
      return true;
    })
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt) || a.id.localeCompare(b.id));
}

/** Bounded shelves avoid rendering hundreds of event cards in the landing view. */
export function eventDirectorySections<T extends DirectoryEvent>(events: readonly T[], now: Date) {
  const available = filterDirectoryEvents(events, defaultEventDirectoryFilter, now);
  const sections: { title: string; events: T[]; filter: Partial<EventDirectoryFilter> }[] = [];
  const used = new Set<string>();
  const add = (title: string, candidates: T[], filter: Partial<EventDirectoryFilter>) => {
    const unique = candidates.filter((e) => !used.has(e.id));
    const seenBusiness = new Set<string>();
    const diverse = [
      ...unique.filter((e) => {
        if (seenBusiness.has(e.businessId)) return false;
        seenBusiness.add(e.businessId);
        return true;
      }),
      ...unique,
    ];
    const picked = [...new Map(diverse.map((e) => [e.id, e])).values()].slice(0, 4);
    if (!picked.length) return;
    picked.forEach((e) => used.add(e.id));
    sections.push({ title, events: picked, filter });
  };
  add(
    'Happening soon',
    filterDirectoryEvents(available, { ...defaultEventDirectoryFilter, when: 'week' }, now),
    { when: 'week' },
  );
  add(
    'This weekend',
    filterDirectoryEvents(available, { ...defaultEventDirectoryFilter, when: 'weekend' }, now),
    { when: 'weekend' },
  );
  const categories = [...new Set(available.map((e) => e.category).filter(Boolean))];
  for (const category of categories) {
    if (sections.length >= 4) break;
    add(
      category,
      available.filter((e) => e.category === category),
      { category },
    );
  }
  if (sections.length < 3) add('Plan ahead', available, {});
  return sections;
}

export function upcomingEventPath(eventId: string) {
  return `/calendar?scope=all-upcoming&eventId=${encodeURIComponent(eventId)}`;
}
