import { fail } from './square-security.ts';

type Body = Record<string, any>;
type Database = { from: (table: string) => any };

// A saved order keeps its payment rail even after the business changes provider.
// Provider hints are useful for setup, but cannot override financial records.
export async function commerceProvider(db: Database, body: Body): Promise<'square' | 'stripe'> {
  if (typeof body.action === 'string' && body.action.startsWith('appointment_')) return 'square';
  const orderLookup = body.orderId
    ? ['id', body.orderId]
    : ['checkout', 'resume'].includes(body.action) && body.idempotencyKey
      ? ['idempotency_key', body.idempotencyKey]
      : null;
  if (orderLookup) {
    const result = await db
      .from('square_orders')
      .select('provider')
      .eq(...orderLookup)
      .maybeSingle();
    if (result.error)
      fail('STORAGE_ERROR', 'The payment provider could not be checked. Retry.', 503);
    if (result.data) return result.data.provider === 'stripe' ? 'stripe' : 'square';
  }
  if (body.provider === 'stripe' || body.provider === 'square') return body.provider;
  if (body.action === 'connect') return 'square';
  if (body.businessId) {
    const result = await db
      .from('ordering_provider_selections')
      .select('provider')
      .eq('business_id', body.businessId)
      .maybeSingle();
    if (result.error)
      fail('STORAGE_ERROR', 'The payment provider could not be checked. Retry.', 503);
    if (result.data?.provider === 'stripe') return 'stripe';
  }
  return 'square';
}
