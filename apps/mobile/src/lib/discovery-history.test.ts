import { expect, it } from 'vitest';
import { createDiscoveryHistory } from './discovery-history';
it('bounds, expires and isolates local history, without duplicate entries for one visit', () => {
  const data = new Map<string, string>();
  const store = createDiscoveryHistory({
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v);
    },
  });
  for (let i = 0; i < 12; i++)
    store.record('a', {
      at: 1000 + i,
      visit: String(i),
      businessIds: ['a', 'b', 'c', 'd'],
      sectionIds: ['breakfast'],
    });
  expect(store.read('a', 2000)).toHaveLength(8);
  expect(store.read('b', 2000)).toEqual([]);
  store.record('a', { at: 1011, visit: '11', businessIds: ['new'], sectionIds: ['coffee'] });
  expect(store.read('a', 2000)).toHaveLength(8);
  expect(store.read('a', 2000).at(-1)?.businessIds).toEqual(['new']);
  expect(store.read('a', 8 * 86_400_000)).toEqual([]);
});
it('survives corrupted storage and unavailable device persistence', () => {
  const corrupt = createDiscoveryHistory({ getItem: () => '{broken', setItem: () => {} });
  expect(corrupt.read('a', 100)).toEqual([]);
  const unavailable = createDiscoveryHistory({
    getItem: () => {
      throw Error();
    },
    setItem: () => {
      throw Error();
    },
  });
  unavailable.record('a', { at: 100, visit: 'one', businessIds: ['a'], sectionIds: [] });
  expect(unavailable.read('a', 101)).toHaveLength(1);
});
