import { createClient } from 'npm:@supabase/supabase-js@2';

import { parseRevenueCatWebhook, webhookSecretMatches } from '../_shared/revenuecat-webhook.ts';

const headers = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers });
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed.' });

  const webhookSecret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET') ?? '';
  if (!webhookSecretMatches(request.headers.get('Authorization'), webhookSecret)) {
    return json(401, { error: 'Unauthorized.' });
  }

  const rawBody = await request.text();
  if (rawBody.length === 0 || rawBody.length > 256_000) {
    return json(400, { error: 'Invalid webhook body.' });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json(400, { error: 'Invalid JSON.' });
  }

  let event;
  try {
    event = parseRevenueCatWebhook(payload);
  } catch (error) {
    return json(400, {
      error: error instanceof Error ? error.message : 'Invalid subscription event.',
    });
  }

  const expectedEnvironment = Deno.env.get('BILLING_ENVIRONMENT') ?? 'sandbox';
  if (event.environment !== expectedEnvironment) {
    return json(202, { accepted: false, reason: 'environment_mismatch' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceRoleKey) {
    return json(503, { error: 'Billing service is not configured.' });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await admin.rpc('apply_listing_subscription_event', {
    p_event_id: event.eventId,
    p_event_type: event.eventType,
    p_user_id: event.userId,
    p_provider: event.provider,
    p_product_id: event.productId,
    p_status: event.status,
    p_environment: event.environment,
    p_original_transaction_id: event.originalTransactionId,
    p_purchased_at: event.purchasedAt,
    p_current_period_end: event.currentPeriodEnd,
    p_will_renew: event.willRenew,
    p_payload: payload,
  });

  if (error) return json(500, { error: 'Subscription event could not be applied.' });
  const result = data as { processed?: boolean; reason?: string } | null;
  if (!result?.processed) {
    return json(503, {
      error: 'Subscription product mapping is not ready.',
      reason: result?.reason,
    });
  }
  return json(200, { processed: true });
});
