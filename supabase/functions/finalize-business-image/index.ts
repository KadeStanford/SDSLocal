import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Origin': '*',
};

type MediaRole = 'logo' | 'cover' | 'gallery' | 'offering' | 'event';

interface StagedVariant {
  path: string;
  variant: string;
}

interface RequestBody {
  businessId: string;
  assetGroupId: string;
  role: MediaRole;
  targetId?: string;
  altText?: string;
  variants: StagedVariant[];
}

const variantRules: Record<
  MediaRole,
  Record<string, { maxDimension: number; maxBytes: number }>
> = {
  logo: {
    logo_small: { maxDimension: 128, maxBytes: 200 * 1024 },
    logo_standard: { maxDimension: 256, maxBytes: 200 * 1024 },
    logo_high_density: { maxDimension: 512, maxBytes: 300 * 1024 },
  },
  cover: {
    cover: { maxDimension: 1920, maxBytes: 900 * 1024 },
  },
  gallery: {
    thumbnail: { maxDimension: 320, maxBytes: 120 * 1024 },
    card: { maxDimension: 800, maxBytes: 300 * 1024 },
    full: { maxDimension: 1600, maxBytes: 800 * 1024 },
  },
  offering: {
    thumbnail: { maxDimension: 320, maxBytes: 120 * 1024 },
    card: { maxDimension: 800, maxBytes: 300 * 1024 },
    full: { maxDimension: 1600, maxBytes: 800 * 1024 },
  },
  event: {
    event_card: { maxDimension: 1200, maxBytes: 500 * 1024 },
  },
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

function webpDimensions(bytes: Uint8Array) {
  if (
    bytes.length < 30 ||
    new TextDecoder().decode(bytes.slice(0, 4)) !== 'RIFF' ||
    new TextDecoder().decode(bytes.slice(8, 12)) !== 'WEBP'
  ) {
    throw new Error('The staged file is not a valid WebP image.');
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunk = new TextDecoder().decode(bytes.slice(12, 16));
  if (chunk === 'VP8X') {
    return {
      width: 1 + view.getUint8(24) + (view.getUint8(25) << 8) + (view.getUint8(26) << 16),
      height: 1 + view.getUint8(27) + (view.getUint8(28) << 8) + (view.getUint8(29) << 16),
    };
  }
  if (chunk === 'VP8L') {
    if (view.getUint8(20) !== 0x2f) throw new Error('Invalid lossless WebP header.');
    const bits = view.getUint32(21, true);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === 'VP8 ') {
    if (view.getUint8(23) !== 0x9d || view.getUint8(24) !== 0x01 || view.getUint8(25) !== 0x2a) {
      throw new Error('Invalid lossy WebP header.');
    }
    return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
  }
  throw new Error('Unsupported WebP encoding.');
}

async function sha256(bytes: Uint8Array) {
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
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
  const token = authorization.slice('Bearer '.length);
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user)
    return json(401, { error: 'Your session is invalid or expired.' });

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'A JSON request body is required.' });
  }

  if (
    !isUuid(body.businessId) ||
    !isUuid(body.assetGroupId) ||
    !variantRules[body.role] ||
    (['offering', 'event'].includes(body.role) && !isUuid(body.targetId)) ||
    !Array.isArray(body.variants)
  ) {
    return json(400, { error: 'Invalid media request.' });
  }

  const expectedRules = variantRules[body.role];
  const receivedNames = new Set(body.variants.map((item) => item.variant));
  if (
    body.variants.length !== Object.keys(expectedRules).length ||
    receivedNames.size !== body.variants.length ||
    Object.keys(expectedRules).some((name) => !receivedNames.has(name))
  ) {
    return json(400, { error: 'The required image variants were not supplied.' });
  }

  const stagedPrefix = `${authData.user.id}/${body.businessId}/${body.assetGroupId}/`;
  const permanentPrefix = `${body.businessId}/${body.assetGroupId}/`;
  const uploadedPaths: string[] = [];
  const verifiedVariants: Record<string, unknown>[] = [];

  try {
    for (const item of body.variants) {
      const rule = expectedRules[item.variant];
      const expectedStagedPath = `${stagedPrefix}${item.variant}.webp`;
      if (!rule || item.path !== expectedStagedPath)
        throw new Error('A staging path was rejected.');

      const { data: blob, error: downloadError } = await admin.storage
        .from('media-staging')
        .download(item.path);
      if (downloadError || !blob) throw new Error(`Could not read ${item.variant}.`);
      if (blob.type !== 'image/webp') throw new Error(`${item.variant} must be a WebP image.`);

      const bytes = new Uint8Array(await blob.arrayBuffer());
      if (bytes.byteLength > rule.maxBytes)
        throw new Error(`${item.variant} is larger than allowed.`);
      const dimensions = webpDimensions(bytes);
      if (Math.max(dimensions.width, dimensions.height) > rule.maxDimension)
        throw new Error(`${item.variant} dimensions are larger than allowed.`);

      const storagePath = `${permanentPrefix}${item.variant}.webp`;
      const { error: uploadError } = await admin.storage
        .from('business-media')
        .upload(storagePath, bytes, {
          contentType: 'image/webp',
          cacheControl: '31536000',
          upsert: false,
        });
      if (uploadError) throw new Error(`Could not publish ${item.variant}.`);
      uploadedPaths.push(storagePath);
      verifiedVariants.push({
        variant: item.variant,
        storagePath,
        mimeType: 'image/webp',
        width: dimensions.width,
        height: dimensions.height,
        byteSize: bytes.byteLength,
        contentHash: await sha256(bytes),
      });
    }

    const { data: result, error: finalizeError } =
      body.role === 'offering'
        ? await admin.rpc('finalize_offering_media', {
            p_actor_id: authData.user.id,
            p_business_id: body.businessId,
            p_offering_item_id: body.targetId!,
            p_asset_group_id: body.assetGroupId,
            p_alt_text: body.altText ?? '',
            p_variants: verifiedVariants,
          })
        : body.role === 'event'
          ? await admin.rpc('finalize_event_media', {
              p_actor_id: authData.user.id,
              p_business_id: body.businessId,
              p_event_id: body.targetId!,
              p_asset_group_id: body.assetGroupId,
              p_alt_text: body.altText ?? '',
              p_variants: verifiedVariants,
            })
          : await admin.rpc('finalize_business_media', {
              p_actor_id: authData.user.id,
              p_business_id: body.businessId,
              p_asset_group_id: body.assetGroupId,
              p_role: body.role,
              p_alt_text: body.altText ?? '',
              p_variants: verifiedVariants,
            });
    if (finalizeError) throw new Error(finalizeError.message);

    const previousPaths = (result as { previousPaths?: string[] } | null)?.previousPaths ?? [];
    await Promise.all([
      admin.storage.from('media-staging').remove(body.variants.map((item) => item.path)),
      previousPaths.length
        ? admin.storage.from('business-media').remove(previousPaths)
        : Promise.resolve(),
    ]);
    return json(200, { media: result });
  } catch (error) {
    if (uploadedPaths.length) await admin.storage.from('business-media').remove(uploadedPaths);
    return json(400, {
      error: error instanceof Error ? error.message : 'The image could not be published.',
    });
  }
});
