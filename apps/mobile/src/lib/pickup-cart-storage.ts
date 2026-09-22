import { createPickupCartStorage } from './pickup-cart-core';
export const pickupCartStorage = createPickupCartStorage({
  getItem: (key) => globalThis.localStorage.getItem(key),
  setItem: (key, value) => globalThis.localStorage.setItem(key, value),
  removeItem: (key) => globalThis.localStorage.removeItem(key),
});
