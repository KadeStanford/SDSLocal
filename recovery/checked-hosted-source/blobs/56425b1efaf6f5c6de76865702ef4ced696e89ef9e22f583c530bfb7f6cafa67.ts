import { createClient } from 'npm:@supabase/supabase-js@2';
import { stripeConfig, CommerceError } from '../_shared/square-security.ts';
import { stripeWebhookSignature } from '../_shared/stripe-client.ts';
import { StripeService } from '../_shared/stripe-service.ts';
import { readBody } from '../_shared/square-runtime.ts';

Deno.serve(async (request) => {
  try {
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    const raw = await readBody(request, 262144);
    const config = stripeConfig((key) => Deno.env.get(key));
    if (
      !(await stripeWebhookSignature(
        raw,
        request.headers.get('stripe-signature'),
        config.webhookSecret,
      ))
    )
      throw new CommerceError('INVALID_SIGNATURE', 'Stripe webhook signature is invalid.', 401);
    const event = JSON.parse(raw) as Record<string, any>;
    if (event.livemode !== false)
      throw new CommerceError('INVALID_ENVIRONMENT', 'Only sandbox events are accepted.', 400);
    const db = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    await new StripeService(db, config).queuedWebhookEvent(event);
    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error:
          error instanceof CommerceError
            ? error.message
            : 'Webhook processing is temporarily unavailable.',
      }),
      {
        status: error instanceof CommerceError ? error.status : 503,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
});
