import { createDiscoveryHistory } from './discovery-history';
export const discoveryHistory = createDiscoveryHistory({
  getItem: (key) => globalThis.localStorage.getItem(key),
  setItem: (key, value) => globalThis.localStorage.setItem(key, value),
});
