import { pickupLabel, type Availability } from './square-commerce-core';

export interface PublicPickupCapability {
  business_id: string;
  supports_pickup_ordering: boolean;
  pickup_status?: 'accepting' | 'paused';
}
export function pickupDiscoveryEnabled(environment: string | undefined) {
  return environment === 'staging' || environment === 'development';
}
/** One read-model request for the whole list; never calls live Square availability. */
export async function loadPublicPickupCapabilities(
  environment: string | undefined,
  read: () => PromiseLike<{ data: unknown; error: unknown }>,
): Promise<PublicPickupCapability[]> {
  if (!pickupDiscoveryEnabled(environment)) return [];
  const { data, error } = await read();
  if (error || !Array.isArray(data))
    throw new Error('Pickup options could not be checked. Please retry.');
  return data.flatMap((row) =>
    typeof row?.business_id === 'string' && row.supports_pickup_ordering === true
      ? [
          {
            business_id: row.business_id,
            supports_pickup_ordering: true,
            ...(row.pickup_status === 'accepting' || row.pickup_status === 'paused'
              ? { pickup_status: row.pickup_status }
              : {}),
          },
        ]
      : [],
  );
}

export interface PickupModuleState {
  businessId: string;
  supported: boolean | null;
  loading: boolean;
  failed: boolean;
  availability: Availability | null;
  orderId: string | null;
  physicalState?: 'open' | 'closed' | 'unknown';
  nextHours?: string | null;
  discoveryStatus?: 'accepting' | 'paused';
}
export function initialPickupModule(businessId: string): PickupModuleState {
  return {
    businessId,
    supported: null,
    loading: true,
    failed: false,
    availability: null,
    orderId: null,
  };
}
export async function loadPickupModule(
  businessId: string,
  ports: {
    capabilities: () => Promise<PublicPickupCapability[]>;
    order: () => Promise<{ businessId: string; orderId?: string } | null>;
    availability: () => Promise<Availability>;
  },
): Promise<PickupModuleState> {
  const [capability, savedOrder] = await Promise.allSettled([ports.capabilities(), ports.order()]);
  const saved = savedOrder.status === 'fulfilled' ? savedOrder.value : null;
  const orderId = saved?.businessId === businessId ? (saved.orderId ?? null) : null;
  const state = { ...initialPickupModule(businessId), orderId, loading: false };
  if (capability.status === 'rejected') return { ...state, failed: true };
  const supported = capability.value.find(
    (row) => row.business_id === businessId && row.supports_pickup_ordering,
  );
  if (!supported) return { ...state, supported: false };
  if (supported.pickup_status === 'paused')
    return { ...state, supported: true, discoveryStatus: 'paused' };
  try {
    const availability = await ports.availability();
    return {
      ...state,
      supported: true,
      availability,
      failed: availability.status === 'unavailable',
    };
  } catch {
    return { ...state, supported: true, failed: true };
  }
}
export function pickupModulePresentation(
  environment: string | undefined,
  state: PickupModuleState,
) {
  if (!pickupDiscoveryEnabled(environment)) return { kind: 'hidden' as const };
  if (state.supported === false || state.availability?.status === 'unsupported')
    return { kind: 'hidden' as const };
  if (state.orderId)
    return {
      kind: 'order' as const,
      title: 'Your pickup order',
      message: 'View your order and its latest status.',
      action: 'View pickup order',
      path: `/order?orderId=${encodeURIComponent(state.orderId)}`,
    };
  if (state.loading)
    return {
      kind: 'loading' as const,
      title: 'Pickup ordering',
      message: 'Checking pickup options…',
    };
  if (state.failed)
    return {
      kind: 'error' as const,
      title: 'Pickup temporarily unavailable',
      message: 'We couldn’t check pickup times. Please try again.',
      action: 'Retry',
    };
  if (state.discoveryStatus === 'paused' || state.availability?.status === 'paused')
    return {
      kind: 'paused' as const,
      title: 'Online ordering paused',
      message: 'This business isn’t accepting pickup orders right now.',
      action: 'Check again',
    };
  if (state.availability?.available)
    return {
      kind: state.physicalState === 'closed' ? ('scheduled' as const) : ('open' as const),
      title:
        state.physicalState === 'closed'
          ? 'Closed now · Schedule a pickup'
          : 'Accepting pickup orders',
      message: state.availability.slots?.[0]
        ? `Next pickup ${pickupLabel(state.availability.slots[0])}`
        : 'Choose a pickup time that works for you.',
      action: state.physicalState === 'closed' ? 'Schedule pickup' : 'Order pickup',
      path: `/order?businessId=${encodeURIComponent(state.businessId)}`,
    };
  if (state.discoveryStatus === 'accepting' && !state.availability)
    return {
      kind: 'open' as const,
      title: 'Pickup available',
      message: 'Check available pickup times.',
      action: 'Order ahead',
      path: `/order?businessId=${encodeURIComponent(state.businessId)}`,
    };
  return {
    kind: 'closed' as const,
    title:
      state.physicalState === 'closed'
        ? 'Closed now · No pickup times'
        : 'No pickup times available',
    message: state.nextHours ?? 'Check back for the next available pickup window.',
    action: 'Refresh pickup times',
  };
}
