import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { type CartLine } from './square-commerce-core';
import { pickupCartStorage } from './pickup-cart-storage';
import { squareBrowserTimeout, squareBrowserUrl, squareSandboxAccountsUrl } from './square-browser';
import { loadPublicPickupCapabilities } from './pickup-discovery';

export function pickupCapabilities(businessIds?: string[]) {
  return squareBrowserTimeout(
    loadPublicPickupCapabilities(process.env.EXPO_PUBLIC_APP_ENV, () =>
      supabase.rpc('get_pickup_status', { p_business_ids: businessIds ?? null }),
    ),
  );
}

export async function commerce<T>(action: string, body: Record<string, unknown>): Promise<T> {
  if (!supabase || !['development', 'staging'].includes(process.env.EXPO_PUBLIC_APP_ENV ?? ''))
    throw new Error('Square Sandbox ordering is not available in this environment.');
  const { data, error } = await squareBrowserTimeout(
    supabase.functions.invoke('square-commerce', {
      body: { ...body, action },
      timeout: 24000,
    }),
  );
  if (error) {
    let message = 'Ordering is unavailable. Check your connection and retry.';
    let code: string | undefined;
    let providerCode: string | undefined;
    let providerRequestId: string | undefined;
    try {
      const detail = await error.context?.json();
      if (typeof detail?.error === 'string') message = detail.error;
      if (typeof detail?.code === 'string') code = detail.code;
      if (typeof detail?.providerCode === 'string') providerCode = detail.providerCode;
      if (
        typeof detail?.providerRequestId === 'string' &&
        /^req_[A-Za-z0-9]+$/.test(detail.providerRequestId)
      )
        providerRequestId = detail.providerRequestId;
    } catch {
      /* No private provider details are displayed. */
    }
    throw Object.assign(new Error(message), {
      code,
      status: error.context?.status,
      providerCode,
      providerRequestId,
    });
  }
  return data as T;
}
export interface OrderAccess {
  statusToken: string;
  idempotencyKey: string;
  businessId: string;
  orderId?: string;
  quoteId?: string;
  quoteExpiresAt?: string;
  customerId?: string | null;
  paymentSubmittedAt?: string;
}
const accessKey = 'sds.square.active-order';
const guestIndexKey = 'sds.square.guest-orders.v1';
let indexWrite: Promise<void> = Promise.resolve();
const readSecure = (key: string) =>
  Platform.OS === 'web'
    ? Promise.resolve(globalThis.localStorage?.getItem(key) ?? null)
    : SecureStore.getItemAsync(key);
const writeSecure = (key: string, value: string) =>
  Platform.OS === 'web'
    ? Promise.resolve(globalThis.localStorage.setItem(key, value))
    : SecureStore.setItemAsync(key, value);
/** IDs only; access proofs remain in the existing per-order secure records. */
async function rememberGuestOrder(access: OrderAccess) {
  if (!access.orderId || access.customerId) return;
  const id = access.orderId;
  indexWrite = indexWrite
    .catch(() => {})
    .then(async () => {
      let ids: string[] = [];
      try {
        const parsed: unknown = JSON.parse((await readSecure(guestIndexKey)) ?? '[]');
        if (Array.isArray(parsed)) ids = parsed.filter((v): v is string => typeof v === 'string');
      } catch {
        /* Repair an invalid index. */
      }
      if (ids[0] === id && ids.length <= 50) return;
      await writeSecure(
        guestIndexKey,
        JSON.stringify([id, ...ids.filter((v) => v !== id)].slice(0, 50)),
      );
    });
  await indexWrite;
}
export async function readGuestOrderAccess(): Promise<OrderAccess[]> {
  const recent = await readOrderAccess();
  const recentGuest = recent?.orderId && !recent.customerId ? recent : null;
  if (recentGuest) await rememberGuestOrder(recentGuest).catch(() => {});
  let raw: unknown = [];
  try {
    raw = JSON.parse((await readSecure(guestIndexKey)) ?? '[]');
  } catch {
    // A damaged index must not discard the independently stored recent proof.
  }
  const ids = Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string') : [];
  if (recentGuest?.orderId && !ids.includes(recentGuest.orderId)) ids.unshift(recentGuest.orderId);
  const orders = await Promise.all(
    [...new Set(ids)]
      .slice(0, 100)
      .map((id) => (id === recentGuest?.orderId ? recentGuest : readOrderAccess(id))),
  );
  return orders.filter((access): access is OrderAccess =>
    Boolean(access?.orderId && !access.customerId),
  );
}
export async function readOrderAccess(
  orderId?: string,
  businessId?: string,
): Promise<OrderAccess | null> {
  const key = orderId
    ? `${accessKey}.${orderId}`
    : businessId
      ? `${accessKey}.business.${businessId}`
      : accessKey;
  try {
    let raw =
      Platform.OS === 'web'
        ? globalThis.localStorage?.getItem(key)
        : await SecureStore.getItemAsync(key);
    if (!raw && businessId && !orderId)
      raw =
        Platform.OS === 'web'
          ? globalThis.localStorage?.getItem(accessKey)
          : await SecureStore.getItemAsync(accessKey);
    const parsed = raw ? (JSON.parse(raw) as OrderAccess) : null;
    if (
      !parsed ||
      typeof parsed.businessId !== 'string' ||
      typeof parsed.idempotencyKey !== 'string' ||
      !/^[a-f0-9]{64}$/i.test(parsed.statusToken ?? '') ||
      (businessId && parsed.businessId !== businessId)
    )
      return null;
    if (orderId && parsed.orderId !== orderId) return null;
    if (
      parsed.customerId &&
      parsed.customerId !== (await supabase.auth.getSession()).data.session?.user.id
    )
      return null;
    // Older previews saved a quote ID without its expiry. Wait out the server's
    // five-minute quote lifetime once, then require an empty server resume.
    if (parsed.quoteId && !parsed.orderId && !parsed.quoteExpiresAt) {
      parsed.quoteExpiresAt = new Date(Date.now() + 6 * 60000).toISOString();
      await saveOrderAccess(parsed);
    }
    return parsed;
  } catch {
    return null;
  }
}
export async function saveOrderAccess(access: OrderAccess) {
  const raw = JSON.stringify(access);
  if (Platform.OS === 'web') globalThis.localStorage.setItem(accessKey, raw);
  else await SecureStore.setItemAsync(accessKey, raw);
  if (Platform.OS === 'web')
    globalThis.localStorage.setItem(`${accessKey}.business.${access.businessId}`, raw);
  else await SecureStore.setItemAsync(`${accessKey}.business.${access.businessId}`, raw);
  if (access.orderId) {
    if (Platform.OS === 'web')
      globalThis.localStorage.setItem(`${accessKey}.${access.orderId}`, raw);
    else await SecureStore.setItemAsync(`${accessKey}.${access.orderId}`, raw);
    // A convenience index must not interrupt a durable payment recovery key.
    await rememberGuestOrder(access).catch(() => {});
  }
}
function uuidFromBytes(bytes: Uint8Array) {
  const value = Array.from(bytes.slice(0, 16));
  value[6] = ((value[6] ?? 0) & 0x0f) | 0x40;
  value[8] = ((value[8] ?? 0) & 0x3f) | 0x80;
  const hex = value.map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function newOrderAccess(businessId: string): Promise<OrderAccess> {
  const previous = await readOrderAccess();
  if (previous?.orderId) await rememberGuestOrder(previous).catch(() => {});
  const bytes = await Crypto.getRandomBytesAsync(32);
  const access = {
    businessId,
    // Generate from getRandomBytesAsync instead of randomUUID: the Expo web
    // adapter requires a secure context, while LAN previews run over HTTP.
    idempotencyKey: uuidFromBytes(bytes),
    statusToken: [...bytes].map((b) => b.toString(16).padStart(2, '0')).join(''),
    customerId: (await supabase.auth.getSession()).data.session?.user.id ?? null,
  };
  await saveOrderAccess(access);
  return access;
}
export function readCart(businessId: string) {
  return pickupCartStorage.read(businessId);
}
export function saveCart(businessId: string, cart: CartLine[]) {
  return pickupCartStorage.save(businessId, cart);
}
export async function openCheckout(url: string) {
  if (!/^https:\/\//.test(url)) throw new Error('Checkout link is not secure.');
  const subscription = Linking.addEventListener('url', ({ url: returnedUrl }) => {
    if (/^sdslocal:\/\/(?:business|order)(?:\?|$)/.test(returnedUrl) && Platform.OS === 'ios')
      WebBrowser.dismissBrowser();
  });
  try {
    await WebBrowser.openBrowserAsync(url);
  } finally {
    subscription.remove();
  }
}
export async function openSquare(url: string) {
  const trustedUrl = squareBrowserUrl(url, 'checkout');
  const subscription = Linking.addEventListener('url', ({ url: returnedUrl }) => {
    if (
      /^sdslocal:\/\/(business|order|appointment)(?:\?|$)/.test(returnedUrl) &&
      Platform.OS === 'ios'
    ) {
      WebBrowser.dismissBrowser();
    }
  });
  try {
    await WebBrowser.openBrowserAsync(trustedUrl);
  } finally {
    subscription.remove();
  }
}

/** OAuth must share the system browser's persistent Sandbox Dashboard session. */
export async function openSquareOAuth(url: string) {
  await openSquareSystemBrowser(squareBrowserUrl(url, 'oauth'));
}
export async function openSquareSandboxDashboard() {
  await openSquareSystemBrowser(squareBrowserUrl(squareSandboxAccountsUrl, 'sandbox-dashboard'));
}
async function openSquareSystemBrowser(url: string) {
  try {
    await squareBrowserTimeout(Linking.openURL(url));
  } catch {
    throw new Error('Your browser could not open Square. Return here and try again.');
  }
}
