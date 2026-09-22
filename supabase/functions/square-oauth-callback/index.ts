import { runtime, errorResponse } from '../_shared/square-runtime.ts';
import { parseOAuthCallback, uuid } from '../_shared/square-security.ts';

Deno.serve(async (request) => {
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });
  try {
    const url = new URL(request.url);
    // This return is only navigation. It cannot mark an order paid, and contains
    // neither recipient details nor the locally stored guest capability.
    if (url.searchParams.has('checkout')) {
      const id = uuid(url.searchParams.get('checkout'));
      return new Response(null, {
        status: 302,
        headers: {
          Location: `sdslocal://order?orderId=${id}`,
          'Cache-Control': 'no-store',
          'Referrer-Policy': 'no-referrer',
        },
      });
    }
    const { state, code } = parseOAuthCallback(url);
    const result = await runtime().finishOAuth(state, code);
    return new Response(null, {
      status: 302,
      headers: {
        Location: `sdslocal://business?id=${result.businessId}&section=ordering`,
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
      },
    });
  } catch (error) {
    return errorResponse(request, error);
  }
});
