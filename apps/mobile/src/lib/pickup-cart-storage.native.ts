import Storage from 'expo-sqlite/kv-store';
import { createPickupCartStorage } from './pickup-cart-core';
export const pickupCartStorage = createPickupCartStorage({
  getItem: (key) => Storage.getItemSync(key),
  setItem: (key, value) => Storage.setItemSync(key, value),
  removeItem: (key) => Storage.removeItemSync(key),
});
