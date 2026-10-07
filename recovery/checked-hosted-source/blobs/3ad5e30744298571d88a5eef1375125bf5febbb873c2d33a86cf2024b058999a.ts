import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'no-store',
};

type MediaRole = 'logo' | 'cover' | 'gallery' | 'offering' | 'event' | 'event_gallery';
type IntentRequest = {
  action: 'create' | 'release';
  businessId: string;
  assetGroupId: string;
  role: MediaRole;
  targetId?: string;
};

const mediaRoles = new Set<MediaRole>([
  'logo',
  'cover',
  'gallery',
  'offering',
  'event',
  'event_gallery',
]);

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed.' });

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return json(401, { error: 'Sign in is required.' });

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  if (!serviceRoleKey || !supabaseUrl)
    return json(503, { error: 'Photo uploads are unavailable.' });

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const token = authorization.slice('Bearer '.length);
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user)
    return json(401, { error: 'Your session is invalid or expired.' });

  let body: IntentRequest;
  try {
    const payload: unknown = await request.json();
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return json(400, { error: 'Invalid photo upload request.' });
    }
    body = payload as IntentRequest;
  } catch {
    return json(400, { error: 'A JSON request body is required.' });
  }

  if (
    (body.action !== 'create' && body.action !== 'release') ||
    !isUuid(body.businessId) ||
    !isUuid(body.assetGroupId) ||
    !mediaRoles.has(body.role) ||
    ((body.role === 'offering' || body.role === 'event' || body.role === 'event_gallery') &&
      !isUuid(body.targetId)) ||
    ((body.role === 'logo' || body.role === 'cover' || body.role === 'gallery') &&
      body.targetId !== undefined)
  ) {
    return json(400, { error: 'Invalid photo upload request.' });
  }

  if (body.action === 'release') {
    const { error } = await admin.rpc('release_business_media_staging_intent', {
      p_actor_id: authData.user.id,
      p_business_id: body.businessId,
      p_asset_group_id: body.assetGroupId,
    });
    if (error) {
      console.error('Could not release a media staging intent.', {
        actorId: authData.user.id,
        businessId: body.businessId,
        code: error.code,
      });
      return json(503, { error: 'Temporary photo cleanup will retry automatically.' });
    }
    return json(200, { released: true });
  }

  const { data, error } = await admin.rpc('create_business_media_staging_intent', {
    p_actor_id: authData.user.id,
    p_business_id: body.businessId,
    p_asset_group_id: body.assetGroupId,
    p_role: body.role,
    p_target_id: body.targetId ?? null,
  });
  if (error) {
    if (error.code === '54000') {
      console.warn('Media upload intent limit reached.', {
        actorId: authData.user.id,
        businessId: body.businessId,
      });
    }
    return json(error.code === '42501' ? 403 : 400, {
      error: error.message || 'A photo upload could not be prepared.',
    });
  }

  return json(200, data as Record<string, unknown>);
});
