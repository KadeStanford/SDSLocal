import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export interface AppointmentAccess {
  readonly businessId: string;
  readonly appointmentId?: string;
  readonly idempotencyKey: string;
  readonly statusToken: string;
}

const keyPrefix = 'sds.appointment.access.v1';
const readValue = (key: string) =>
  Platform.OS === 'web'
    ? Promise.resolve(globalThis.localStorage?.getItem(key) ?? null)
    : SecureStore.getItemAsync(key);
const writeValue = (key: string, value: string) =>
  Platform.OS === 'web'
    ? Promise.resolve(globalThis.localStorage.setItem(key, value))
    : SecureStore.setItemAsync(key, value);

function uuidFromBytes(bytes: Uint8Array) {
  const value = Array.from(bytes.slice(0, 16));
  value[6] = ((value[6] ?? 0) & 0x0f) | 0x40;
  value[8] = ((value[8] ?? 0) & 0x3f) | 0x80;
  const hex = value.map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function validAccess(value: unknown): value is AppointmentAccess {
  if (!value || typeof value !== 'object') return false;
  const access = value as AppointmentAccess;
  return (
    typeof access.businessId === 'string' &&
    /^[a-f0-9]{64}$/i.test(access.statusToken ?? '') &&
    /^[0-9a-f-]{36}$/i.test(access.idempotencyKey ?? '')
  );
}

export async function appointmentAccess(businessId: string): Promise<AppointmentAccess> {
  const key = `${keyPrefix}.business.${businessId}`;
  try {
    const parsed: unknown = JSON.parse((await readValue(key)) ?? 'null');
    if (validAccess(parsed) && parsed.businessId === businessId && !parsed.appointmentId)
      return parsed;
  } catch {
    // Replace invalid local state with a fresh, cryptographically random key.
  }
  const bytes = await Crypto.getRandomBytesAsync(32);
  const access: AppointmentAccess = {
    businessId,
    idempotencyKey: uuidFromBytes(bytes),
    statusToken: [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join(''),
  };
  await writeValue(key, JSON.stringify(access));
  return access;
}

export async function readGuestAppointmentIds(): Promise<string[]> {
  try { const value = JSON.parse((await readValue(keyPrefix + '.guest-index')) ?? '[]'); return Array.isArray(value) ? value.filter(id => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)) : []; } catch { return []; }
}
let indexWrite = Promise.resolve();
export async function saveAppointmentAccess(access: AppointmentAccess) {
  await writeValue(`${keyPrefix}.business.${access.businessId}`, JSON.stringify(access));
  if (access.appointmentId)
    await writeValue(`${keyPrefix}.appointment.${access.appointmentId}`, JSON.stringify(access));
  if (access.appointmentId) {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      indexWrite = indexWrite.catch(() => {}).then(async () => {
        const ids = await readGuestAppointmentIds();
        await writeValue(keyPrefix + '.guest-index', JSON.stringify([...new Set([access.appointmentId!, ...ids])].slice(0, 100)));
      });
      await indexWrite;
    }
  }
}

export async function readAppointmentAccess(
  appointmentId: string,
): Promise<AppointmentAccess | null> {
  try {
    const parsed: unknown = JSON.parse(
      (await readValue(`${keyPrefix}.appointment.${appointmentId}`)) ?? 'null',
    );
    return validAccess(parsed) && parsed.appointmentId === appointmentId ? parsed : null;
  } catch {
    return null;
  }
}

export async function appointmentCommerce<T>(action: string, body: Record<string, unknown>) {
  if (!supabase || !['development', 'staging'].includes(process.env.EXPO_PUBLIC_APP_ENV ?? ''))
    throw new Error('Appointment booking is only available in the Sandbox preview.');
  const { data, error } = await supabase.functions.invoke('square-commerce', {
    body: { ...body, action },
    timeout: 24000,
  });
  if (error) {
    let message = 'Appointments are unavailable. Check your connection and retry.';
    try {
      const detail = await error.context?.json();
      if (typeof detail?.error === 'string') message = detail.error;
    } catch {
      // Keep the safe fallback if a gateway response is not JSON.
    }
    throw new Error(message);
  }
  return data as T;
}
