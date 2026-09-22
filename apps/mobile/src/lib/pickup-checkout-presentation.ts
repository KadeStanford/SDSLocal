import { normalizePickupPhone } from './pickup-order-flow';
import type { PickupSlot } from './square-commerce-core';

export function pickupClockLabel(slot: PickupSlot) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: slot.timezone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(slot.at));
}
export function pickupTimezoneLabel(slot: PickupSlot) {
  return (
    new Intl.DateTimeFormat('en-US', { timeZone: slot.timezone, timeZoneName: 'longGeneric' })
      .formatToParts(new Date(slot.at))
      .find((p) => p.type === 'timeZoneName')?.value ?? slot.timezone
  );
}
export function visiblePickupSlots(
  slots: PickupSlot[],
  selected: PickupSlot | null,
  limit: number,
) {
  const selectedIndex = slots.findIndex(
    (s) => s.at === selected?.at && s.stopId === selected.stopId,
  );
  return slots.slice(0, Math.max(limit, selectedIndex + 1));
}
export function formattedPickupPhone(value: string) {
  const normalized = normalizePickupPhone(value);
  if (!normalized) return value;
  return `(${normalized.slice(2, 5)}) ${normalized.slice(5, 8)}-${normalized.slice(8)}`;
}
