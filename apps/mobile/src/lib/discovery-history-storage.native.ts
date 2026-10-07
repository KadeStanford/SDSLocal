import Storage from 'expo-sqlite/kv-store';
import { createDiscoveryHistory } from './discovery-history';
export const discoveryHistory = createDiscoveryHistory({
  getItem: (key) => Storage.getItemSync(key),
  setItem: (key, value) => Storage.setItemSync(key, value),
});
