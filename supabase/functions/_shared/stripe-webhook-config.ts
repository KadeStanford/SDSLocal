import { StripeClient } from './stripe-client.ts';
import { fail } from './square-security.ts';
export const stripePaymentEvents = [
  'checkout.session.completed',
  'checkout.session.expired',
  'payment_intent.succeeded',
  'payment_intent.canceled',
  'payment_intent.payment_failed',
  'charge.refunded',
  'charge.dispute.created',
  'charge.dispute.updated',
  'charge.dispute.closed',
  'refund.created',
  'refund.updated',
  'refund.failed',
  'account.updated',
  'account.application.deauthorized',
];
export async function configureStripeWebhooks(client: StripeClient, url: string) {
  const parsed = new URL(url);
  if (
    parsed.protocol !== 'https:' ||
    !parsed.hostname.endsWith('.supabase.co') ||
    parsed.pathname !== '/functions/v1/stripe-webhook'
  )
    fail('INVALID_ENDPOINT', 'The staging webhook URL could not be verified.', 409);
  const endpoints: Record<string, any>[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 10; page++) {
    const result = await client.request(
      '/v1/webhook_endpoints',
      { limit: 100, ...(cursor ? { starting_after: cursor } : {}) },
      'GET',
    );
    endpoints.push(...(result.data ?? []));
    if (!result.has_more) break;
    cursor = result.data?.at(-1)?.id;
    if (!cursor || page === 9)
      fail('ENDPOINT_REVIEW', 'Webhook destination list needs review.', 409);
  }
  const matches = endpoints.filter((endpoint) => endpoint.url === url);
  if (matches.length !== 1 || matches[0].livemode !== false || matches[0].status !== 'enabled')
    fail('ENDPOINT_REVIEW', 'Exactly one enabled Sandbox webhook destination is required.', 409);
  const endpoint = matches[0];
  const events = [...new Set([...(endpoint.enabled_events ?? []), ...stripePaymentEvents])];
  const updated = await client.request('/v1/webhook_endpoints/' + encodeURIComponent(endpoint.id), {
    enabled_events: events,
  });
  if (
    updated.id !== endpoint.id ||
    updated.url !== url ||
    updated.livemode !== false ||
    stripePaymentEvents.some((event) => !updated.enabled_events?.includes(event))
  )
    fail('ENDPOINT_REVIEW', 'The webhook subscription update could not be verified.', 503);
  return {
    endpointId: updated.id,
    eventCount: updated.enabled_events.length,
    events: updated.enabled_events,
  };
}
