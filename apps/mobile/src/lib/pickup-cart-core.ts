import { validRewardClaim } from './pickup-rewards';
import type { CartLine } from './square-commerce-core';
export interface CartStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
const ttl = 4 * 60 * 60 * 1000;
export function decodePickupCart(
  raw: string | null,
  businessId: string,
  now = Date.now(),
): CartLine[] {
  try {
    const data = JSON.parse(raw ?? 'null');
    if (
      !data ||
      data.version !== 1 ||
      data.businessId !== businessId ||
      !Number.isFinite(data.savedAt) ||
      data.savedAt > now + 60000 ||
      now - data.savedAt > ttl ||
      !Array.isArray(data.lines) ||
      data.lines.length > 30
    )
      return [];
    return data.lines
      .filter(
        (l: CartLine) =>
          typeof l?.variationId === 'string' &&
          l.variationId.length > 0 &&
          l.variationId.length <= 100 &&
          Number.isInteger(l.quantity) &&
          l.quantity >= 1 &&
          l.quantity <= 20 &&
          Array.isArray(l.modifierIds) &&
          l.modifierIds.length <= 100 &&
          new Set(l.modifierIds).size === l.modifierIds.length &&
          l.modifierIds.every((id) => typeof id === 'string' && id.length <= 100),
      )
      .map((l: CartLine) => ({
        variationId: l.variationId,
        quantity: l.quantity,
        modifierIds: [...l.modifierIds],
        ...(validRewardClaim(l.rewardClaim) ? { rewardClaim: l.rewardClaim } : {}),
        ...(Number.isSafeInteger(l.lastKnownUnitPrice) && l.lastKnownUnitPrice! >= 0
          ? { lastKnownUnitPrice: l.lastKnownUnitPrice }
          : {}),
      }));
  } catch {
    return [];
  }
}
export function createPickupCartStorage(store: CartStore) {
  return {
    read(businessId: string, now = Date.now()) {
      try {
        return decodePickupCart(store.getItem(`sds.pickup.cart.v1.${businessId}`), businessId, now);
      } catch {
        return [];
      }
    },
    save(businessId: string, lines: CartLine[], now = Date.now()) {
      try {
        const key = `sds.pickup.cart.v1.${businessId}`;
        if (!lines.length) store.removeItem(key);
        else
          store.setItem(
            key,
            JSON.stringify({
              version: 1,
              businessId,
              savedAt: now,
              lines: lines.map((l) => ({
                variationId: l.variationId,
                quantity: l.quantity,
                modifierIds: l.modifierIds,
                ...(validRewardClaim(l.rewardClaim) ? { rewardClaim: l.rewardClaim } : {}),
                ...(l.lastKnownUnitPrice !== undefined
                  ? { lastKnownUnitPrice: l.lastKnownUnitPrice }
                  : {}),
              })),
            }),
          );
        return true;
      } catch {
        return false;
      }
    },
  };
}
