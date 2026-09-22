import { runtime, stripeRuntime, errorResponse, response } from '../_shared/square-runtime.ts';
import { hash } from '../_shared/square-security.ts';

Deno.serve(async (request) => {
  if (request.method !== 'POST') return response(request, 405, { error: 'Method not allowed.' });
  try {
    const service = runtime();
    if (
      (await hash(request.headers.get('Authorization') ?? '')) !==
      (await hash(`Bearer ${service.config.maintenanceSecret}`))
    )
      return response(request, 401, { error: 'Unauthorized.' });
    // Reuse the existing trusted minute scheduler. Scope this invocation to
    // transactional order alerts; it must not release unrelated old campaigns.
    const [maintenance, alerts, stripe] = await Promise.allSettled([
      service.maintenance(),
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
        ? stripeRuntime(service.db).maintenance()
        : Promise.resolve({ disabled: true }),
    ]);
    if (maintenance.status === 'rejected') throw maintenance.reason;
    return response(request, 200, {
      ...maintenance.value,
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
