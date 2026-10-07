import { fail } from './square-security.ts';

export type OrderSupportType = 'cancel' | 'change' | 'issue';
export type OrderSupportResolution = 'resolved' | 'declined';

const supportTypes = new Set<OrderSupportType>(['cancel', 'change', 'issue']);
const terminalStatuses = new Set(['completed', 'refunded', 'checkout_expired', 'checkout_failed']);

export function parseOrderSupportRequest(type: unknown, message: unknown) {
  if (typeof type !== 'string' || !supportTypes.has(type as OrderSupportType))
    fail('INVALID_REQUEST', 'Choose what you need help with.');
  if (typeof message !== 'string') fail('INVALID_REQUEST', 'Add a short note for the business.');
  const normalizedMessage = message.trim();
  if (normalizedMessage.length < 10 || normalizedMessage.length > 1500)
    fail('INVALID_REQUEST', 'Your note must be between 10 and 1,500 characters.');
  return { type: type as OrderSupportType, message: normalizedMessage };
}

export function canRequestOrderSupport(status: string, requestType?: OrderSupportType) {
  if (
    ['refunded', 'cancelled', 'checkout_expired', 'checkout_failed', 'dispute_lost'].includes(
      status,
    )
  )
    return false;
  return requestType === 'issue' || !terminalStatuses.has(status);
}

export function customerCancellationCutoff(
  status: string,
  pickupAt: string,
  preparationMinutes: number,
) {
  if (!['placed', 'accepted'].includes(status)) return null;
  const pickupAtMs = Date.parse(pickupAt);
  if (!Number.isFinite(pickupAtMs)) return null;
  if (!Number.isInteger(preparationMinutes) || preparationMinutes < 5 || preparationMinutes > 240)
    return null;
  return pickupAtMs - preparationMinutes * 60_000;
}

export function parseOrderSupportResolution(status: unknown): OrderSupportResolution {
  if (status !== 'resolved' && status !== 'declined')
    fail('INVALID_REQUEST', 'Choose whether to resolve or decline this request.');
  return status;
}

export function parseOrderSupportReply(value: unknown) {
  if (typeof value !== 'string') fail('INVALID_REQUEST', 'Add a short reply for the customer.');
  const reply = value.trim();
  if (reply.length < 3 || reply.length > 1500)
    fail('INVALID_REQUEST', 'Your reply must be between 3 and 1,500 characters.');
  return reply;
}
