import { CommerceError, stripeConfig, uuid } from '../_shared/square-security.ts';

// Stripe redirects here after hosted Checkout. The redirect is only a UX
// handoff; payment state is confirmed by Stripe retrieval/webhooks in the
// commerce service and is never accepted from query parameters.
Deno.serve((request) => {
  try {
    const url = new URL(request.url);
    const orderId = uuid(url.searchParams.get('orderId'));
    const destination = new URL(Deno.env.get('STRIPE_APP_RETURN_URL') ?? 'sdslocal://order');
    destination.searchParams.set('orderId', orderId);
    destination.searchParams.set('provider', 'stripe');
    if (url.searchParams.get('cancelled') === '1') destination.searchParams.set('cancelled', '1');
    stripeConfig((key) => Deno.env.get(key));
    return Response.redirect(destination.toString(), 302);
  } catch (error) {
    const status = error instanceof CommerceError ? error.status : 400;
    return new Response(JSON.stringify({ error: 'Checkout return could not be verified.' }), {
      status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }
});
