import { database, stripeRuntime, errorResponse, response } from '../_shared/square-runtime.ts';
import { SquareService } from '../_shared/square-service.ts';
import { hash, squareConfig, stripeConfig } from '../_shared/square-security.ts';
import { StripeClient } from '../_shared/stripe-client.ts';
import { configureStripeWebhooks } from '../_shared/stripe-webhook-config.ts';

Deno.serve(async (request) => {
  if (request.method !== 'POST') return response(request, 405, { error: 'Method not allowed.' });
  try {
    const maintenanceSecret = Deno.env.get('SQUARE_MAINTENANCE_SECRET');
    if (
      !maintenanceSecret ||
      (await hash(request.headers.get('Authorization') ?? '')) !==
        (await hash(`Bearer ${maintenanceSecret}`))
    )
      return response(request, 401, { error: 'Unauthorized.' });
    // Reuse the existing trusted minute scheduler. Scope this invocation to
    // transactional order alerts; it must not release unrelated old campaigns.
    const db = database();
    const input = await request.json().catch(() => ({}));
    if (input.configureStripeWebhooks === true) {
      const config = stripeConfig((key) => Deno.env.get(key));
      if (config.appEnv !== 'staging')
        return response(request, 403, { error: 'Staging configuration only.' });
      return response(
        request,
        200,
        await configureStripeWebhooks(
          new StripeClient(config.secretKey),
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/stripe-webhook`,
        ),
      );
    }
    const [maintenance, alerts, stripe] = await Promise.allSettled([
      Promise.resolve().then(() =>
        new SquareService(
          db,
          squareConfig((key) => Deno.env.get(key)),
        ).maintenance(),
      ),
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/notification-dispatch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'x-sds-dispatch-trigger': 'pickup-scheduler',
        },
        body: JSON.stringify({ scope: 'orders' }),
        signal: AbortSignal.timeout(20000),
      }).then(async (result) => {
        if (!result.ok) throw new Error('Order alert dispatch unavailable');
        return result.json();
      }),
      Deno.env.get('STRIPE_COMMERCE_ENABLED') === 'true'
        ? Promise.resolve().then(() => stripeRuntime(db).maintenance())
        : Promise.resolve({ disabled: true }),
    ]);
    const failed =
      maintenance.status === 'rejected' ||
      alerts.status === 'rejected' ||
      stripe.status === 'rejected' ||
      (maintenance.status === 'fulfilled' && maintenance.value.failures > 0) ||
      (stripe.status === 'fulfilled' && 'failures' in stripe.value && stripe.value.failures > 0);
    return response(request, failed ? 503 : 200, {
      ...(maintenance.status === 'fulfilled'
        ? maintenance.value
        : { error: 'Square reconciliation unavailable' }),
      stripe:
        stripe.status === 'fulfilled'
          ? stripe.value
          : { error: 'Stripe reconciliation unavailable' },
      alerts:
        alerts.status === 'fulfilled'
          ? alerts.value
          : { error: 'Order alert dispatch unavailable' },
    });
  } catch (error) {
    return errorResponse(request, error);
  }
});
