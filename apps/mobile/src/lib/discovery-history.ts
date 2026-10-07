import { pruneDiscoveryHistory, type DiscoveryExposure } from './discovery-feed';

export function createDiscoveryHistory(storage: {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}) {
  const cache = new Map<string, DiscoveryExposure[]>();
  const keyFor = (scope: string) => `discovery-history-v1:${scope}`;
  return {
    read(scope: string, now: number): DiscoveryExposure[] {
      try {
        const saved = storage.getItem(keyFor(scope));
        if (!saved) return pruneDiscoveryHistory(cache.get(scope) ?? [], now);
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter((entry): entry is DiscoveryExposure =>
            Boolean(
              entry &&
              typeof entry === 'object' &&
              Number.isFinite(entry.at) &&
              typeof entry.visit === 'string' &&
              Array.isArray(entry.businessIds) &&
              entry.businessIds.every((id: unknown) => typeof id === 'string') &&
              Array.isArray(entry.sectionIds) &&
              entry.sectionIds.every((id: unknown) => typeof id === 'string'),
            ),
          );
          const result = pruneDiscoveryHistory(valid, now);
          cache.set(scope, result);
          return result;
        }
      } catch {
        /* A damaged or unavailable local store must not block discovery. */
      }
      return pruneDiscoveryHistory(cache.get(scope) ?? [], now);
    },
    record(scope: string, entry: DiscoveryExposure) {
      const current = this.read(scope, entry.at).filter((item) => item.visit !== entry.visit);
      const next = pruneDiscoveryHistory(
        [
          ...current,
          {
            ...entry,
            businessIds: entry.businessIds.slice(0, 3),
            sectionIds: entry.sectionIds.slice(0, 4),
          },
        ],
        entry.at,
      );
      cache.set(scope, next);
      try {
        storage.setItem(keyFor(scope), JSON.stringify(next));
      } catch {
        /* Keep this visit's fallback in memory. */
      }
    },
  };
}
