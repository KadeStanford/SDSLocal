import { fail, hash } from './square-security.ts';

// Avoid letters/digits that are hard to distinguish when read aloud. Eight
// characters provide >38 bits; codes are also short lived and staff-only.
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function newPickupShortCode() {
  let value = '';
  const ceiling = Math.floor(256 / alphabet.length) * alphabet.length;
  while (value.length < 8) {
    for (const byte of crypto.getRandomValues(new Uint8Array(16))) {
      if (byte < ceiling) value += alphabet[byte % alphabet.length];
      if (value.length === 8) break;
    }
  }
  return value;
}
export function normalizePickupShortCode(value: string) {
  const normalized = value.toUpperCase().replace(/[\s-]/g, '');
  if (!/^[A-HJ-NP-Z2-9]{8}$/.test(normalized))
    fail(
      'INVALID_PICKUP_CODE',
      'Enter the 8-character pickup code shown on the customer’s screen.',
    );
  return normalized;
}
export const pickupShortCodeHash = (businessId: string, value: string) =>
  hash(`pickup-manual:${businessId.toLowerCase()}:${normalizePickupShortCode(value)}`);
