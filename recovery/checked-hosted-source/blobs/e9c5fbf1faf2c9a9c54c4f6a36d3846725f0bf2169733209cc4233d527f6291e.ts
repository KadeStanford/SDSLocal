import { createClient } from 'npm:@supabase/supabase-js@2';
import { businessAllowsObligationRecovery } from '../_shared/business-obligation-access.ts';

import {
  loyaltySigningSecret,
  signLoyaltyToken,
  type LoyaltyTokenClaims,
} from '../_shared/loyalty-token.ts';

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
  if (!authorization?.startsWith('Bearer ')) return json(401, { error: 'Sign in is required.' });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: authData, error: authError } = await admin.auth.getUser(
    authorization.slice('Bearer '.length),
  );
  if (authError || !authData.user) return json(401, { error: 'Your session is invalid.' });

  let membershipId = '';
  try {
    const body = (await request.json()) as { membershipId?: unknown };
    membershipId = typeof body.membershipId === 'string' ? body.membershipId : '';
  } catch {
    return json(400, { error: 'A JSON request body is required.' });
  }

  const { data: membership, error: membershipError } = await admin
    .from('loyalty_memberships')
    .select('id, program_id, business_id, customer_id, is_active')
    .eq('id', membershipId)
    .eq('customer_id', authData.user.id)
    .eq('is_active', true)
    .maybeSingle();
  if (membershipError) {
    console.error('Rewards membership lookup failed:', membershipError.message);
    return json(500, { error: 'The rewards membership could not be checked.' });
  }
  if (!membership) return json(404, { error: 'Active rewards membership not found.' });

  const [{ data: program }, { data: business }] = await Promise.all([
    admin
      .from('loyalty_programs')
      .select('id, program_type')
      .eq('id', membership.program_id)
      .eq('is_active', true)
      .maybeSingle(),
    admin
      .from('businesses')
      .select('id,status,suspension_reason,billing_suspension_previous_status,approved_at')
      .eq('id', membership.business_id)
      .maybeSingle(),
  ]);
  if (!program || !businessAllowsObligationRecovery(business))
    return json(409, { error: 'This rewards program is unavailable.' });

  const issuedAt = Math.floor(Date.now() / 1000);
  const claims: LoyaltyTokenClaims = {
    iss: 'sds-local',
    aud: 'sds-loyalty',
    sub: authData.user.id,
    membershipId: membership.id,
    businessId: membership.business_id,
    programId: membership.program_id,
    programType: program.program_type === 'points' ? 'points' : 'visits',
    jti: crypto.randomUUID(),
    iat: issuedAt,
    exp: issuedAt + 45,
  };
  try {
    return json(200, {
      token: await signLoyaltyToken(claims, loyaltySigningSecret()),
      expiresAt: new Date(claims.exp * 1000).toISOString(),
    });
  } catch (error) {
    return json(500, { error: error instanceof Error ? error.message : 'Could not create code.' });
  }
});
