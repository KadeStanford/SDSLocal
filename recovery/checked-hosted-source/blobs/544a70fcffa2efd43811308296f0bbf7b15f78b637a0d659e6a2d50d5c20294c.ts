import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  stripeConfig,
  CommerceError,
  hash,
  opaqueToken,
  randomToken,
} from '../_shared/square-security.ts';
import { StripeClient, stripeAccountId, stripeCheckoutUrl } from '../_shared/stripe-client.ts';
import { StripeService } from '../_shared/stripe-service.ts';

function redirectResponse(url: string) {
  return new Response(null, {
    status: 302,
    headers: { Location: url, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
  });
}

function connectAppReturnUrl() {
  const value = Deno.env.get('STRIPE_CONNECT_APP_RETURN_URL') ?? 'sdslocal://business';
  try {
    const url = new URL(value);
    if (url.protocol !== 'sdslocal:' || url.hostname !== 'business' || url.pathname !== '')
      throw new Error();
    return url;
  } catch {
    throw new CommerceError('NOT_CONFIGURED', 'Stripe setup return URL is invalid.', 503);
  }
}

Deno.serve(async (request) => {
  try {
    if (request.method !== 'GET')
      return new Response('Method not allowed.', { status: 405, headers: { Allow: 'GET' } });
    const url = new URL(request.url);
    const businessId = url.searchParams.get('businessId');
    const state = url.searchParams.get('state');
    if (
      !businessId ||
      !state ||
      ['businessId', 'state', 'refresh'].some((key) => url.searchParams.getAll(key).length > 1)
    )
      throw new CommerceError('INVALID_STATE', 'Stripe setup could not be verified.', 400);
    const config = stripeConfig((key) => Deno.env.get(key));
    const db = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const result = await db.rpc('stripe_consume_onboarding_state', {
      p_hash: await hash(opaqueToken(state)),
    });
    if (result.error || !result.data?.length)
      throw new CommerceError('INVALID_STATE', 'Stripe setup link expired. Start again.', 400);
    const onboarding = result.data[0] as {
      business_id: string;
      account_id: string;
      user_id: string;
    };
    if (onboarding.business_id !== businessId)
      throw new CommerceError('INVALID_STATE', 'Stripe setup could not be verified.', 400);
    const accountId = stripeAccountId(onboarding.account_id);
    const accountState = await new StripeService(db, config).authorizeOnboarding(
      businessId,
      onboarding.user_id,
      accountId,
    );
    if (url.searchParams.get('refresh') === '1') {
      const nextState = randomToken();
      const expiresAt = new Date(Date.now() + 15 * 60000).toISOString();
      const inserted = await db.from('stripe_onboarding_states').insert({
        state_hash: await hash(nextState),
        user_id: onboarding.user_id,
        business_id: businessId,
        account_id: accountId,
        expires_at: expiresAt,
      });
      if (inserted.error)
        throw new CommerceError('STORAGE_ERROR', 'Stripe setup could not be restarted.', 503);
      const platform = new StripeClient(config.secretKey);
      const linkType = accountState.details_submitted ? 'account_update' : 'account_onboarding';
      const linkDetails = {
        configurations: ['merchant'],
        refresh_url: `${url.origin}${url.pathname}?businessId=${businessId}&refresh=1&state=${encodeURIComponent(nextState)}`,
        return_url: `${url.origin}${url.pathname}?businessId=${businessId}&state=${encodeURIComponent(nextState)}`,
      };
      const links = await platform.request('/v2/core/account_links', {
        account: accountId,
        use_case: {
          type: linkType,
          [linkType]: linkDetails,
        },
      });
      return redirectResponse(stripeCheckoutUrl(links.url));
    }
    const redirect = connectAppReturnUrl();
    redirect.searchParams.set('id', businessId);
    redirect.searchParams.set('section', 'ordering');
    redirect.searchParams.set('provider', 'stripe');
    return redirectResponse(redirect.toString());
  } catch (error) {
    let redirect: URL;
    try {
      redirect = connectAppReturnUrl();
    } catch {
      redirect = new URL('sdslocal://business');
    }
    redirect.searchParams.set('stripe', 'error');
    redirect.searchParams.set(
      'message',
      error instanceof CommerceError
        ? error.message
        : 'Stripe setup failed. Start again from the app.',
    );
    return redirectResponse(redirect.toString());
  }
});
