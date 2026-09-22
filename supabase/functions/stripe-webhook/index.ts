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
    const object = event.data?.object as Record<string, any> | undefined;
    const orderId = object?.metadata?.sds_order_id ?? object?.client_reference_id;
    const db = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    if (
      typeof orderId === 'string' &&
      [
        'checkout.session.completed',
        'checkout.session.expired',
        'payment_intent.succeeded',
      ].includes(event.type)
    ) {
      const service = new StripeService(db, config);
      const order = await service.checked(
        db
          .from('square_orders')
          .select('*')
          .eq('id', orderId)
          .eq('provider', 'stripe')
          .maybeSingle(),
      );
      if (order) {
        if (event.account !== order.merchant_id)
          throw new CommerceError(
            'ACCOUNT_MISMATCH',
            'Event belongs to another connected account.',
            400,
          );
        // Retrieve the canonical session using that business's Stripe-Account header.
        // Never trust event order or rewrite a completed kitchen/handoff state.
        await service.reconcile(order);
      }
    }
    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Webhook failed.' }),
      {
        status: error instanceof CommerceError ? error.status : 400,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
});
