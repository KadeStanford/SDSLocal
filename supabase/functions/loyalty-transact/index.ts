import { createClient } from 'npm:@supabase/supabase-js@2';

import { loyaltySigningSecret, verifyLoyaltyToken } from '../_shared/loyalty-token.ts';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Origin': '*',
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed.' });
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer '))
    return json(401, { error: 'Staff sign-in is required.' });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: authData, error: authError } = await admin.auth.getUser(
    authorization.slice('Bearer '.length),
  );
  if (authError || !authData.user) return json(401, { error: 'Your session is invalid.' });

  let body: { token?: unknown; action?: unknown; idempotencyKey?: unknown };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'A JSON request body is required.' });
  }
  const token = typeof body.token === 'string' ? body.token : '';
  const action = body.action === 'stamp' || body.action === 'redemption' ? body.action : '';
  const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey : '';
  if (!token || !action || !/^[0-9a-f-]{36}$/i.test(idempotencyKey)) {
    return json(400, { error: 'Token, action, and idempotency key are required.' });
  }

  try {
    const claims = await verifyLoyaltyToken(token, loyaltySigningSecret());
    const { data, error } = await admin.rpc('process_loyalty_action', {
      p_actor_id: authData.user.id,
      p_membership_id: claims.membershipId,
      p_token_id: claims.jti,
      p_action: action,
      p_idempotency_key: idempotencyKey,
    });
    if (error) {
      const conflict = error.code === '23505' || /already|last minute/i.test(error.message);
      return json(conflict ? 409 : error.code === '42501' ? 403 : 400, { error: error.message });
    }
    return json(200, { loyalty: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The loyalty code is invalid.';
    return json(/expired/i.test(message) ? 410 : 400, { error: message });
  }
});
