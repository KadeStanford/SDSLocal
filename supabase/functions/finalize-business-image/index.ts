import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  ImageMagick,
  initializeImageMagick,
  MagickFormat,
  MagickReadSettings,
} from 'npm:@imagemagick/magick-wasm@0.0.43';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Origin': '*',
};

type MediaRole = 'logo' | 'cover' | 'gallery' | 'offering' | 'event' | 'event_gallery';

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
  caption?: string;
  displayOrder?: number;
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
  event_gallery: {
    thumbnail: { maxDimension: 320, maxBytes: 120 * 1024 },
    card: { maxDimension: 800, maxBytes: 300 * 1024 },
    full: { maxDimension: 1600, maxBytes: 800 * 1024 },
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
  if (view.getUint32(4, true) !== bytes.byteLength - 8) {
    throw new Error('The staged file is not a complete WebP image.');
  }
  const chunk = new TextDecoder().decode(bytes.slice(12, 16));
  const chunkSize = view.getUint32(16, true);
  if (chunkSize > bytes.byteLength - 20) {
    throw new Error('The staged WebP image is truncated.');
  }
  if (chunk === 'VP8X') {
    if (chunkSize < 10) throw new Error('Invalid extended WebP header.');
    return {
      width: 1 + view.getUint8(24) + (view.getUint8(25) << 8) + (view.getUint8(26) << 16),
      height: 1 + view.getUint8(27) + (view.getUint8(28) << 8) + (view.getUint8(29) << 16),
    };
  }
  if (chunk === 'VP8L') {
    if (chunkSize < 5 || view.getUint8(20) !== 0x2f)
      throw new Error('Invalid lossless WebP header.');
    const bits = view.getUint32(21, true);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === 'VP8 ') {
    if (chunkSize < 10) throw new Error('Invalid lossy WebP header.');
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

async function removeStagedPaths(
  admin: ReturnType<typeof createClient>,
  actorId: string,
  businessId: string,
  assetGroupId: string,
  paths: string[],
) {
  const { error: removeError } = await admin.storage.from('media-staging').remove(paths);
  if (removeError) {
    console.error('Could not immediately remove staged images; queued cleanup will retry.', {
      actorId,
      businessId,
      code: removeError.name,
      message: removeError.message,
    });
  }
  const { error: queueError } = await admin.rpc('finish_business_media_staging_cleanup', {
    p_actor_id: actorId,
    p_business_id: businessId,
    p_asset_group_id: assetGroupId,
    p_removed: !removeError,
  });
  if (queueError) {
    console.error('Could not update staged image cleanup state.', {
      actorId,
      businessId,
      code: queueError.code,
    });
  }
}

let imageMagickInitialization: Promise<void> | null = null;

function initializeImageProcessor() {
  if (!imageMagickInitialization) {
    imageMagickInitialization = (async () => {
      const wasmLocation = new URL(
        'x86/magick.wasm',
        import.meta.resolve('npm:@imagemagick/magick-wasm@0.0.43'),
      );
      const wasmBytes = await Deno.readFile(wasmLocation);
      await initializeImageMagick(wasmBytes);
    })();
  }
  return imageMagickInitialization;
}

function qualityForVariant(variant: string) {
  if (variant === 'logo_small') return 84;
  if (variant === 'logo_standard') return 86;
  if (variant === 'logo_high_density') return 88;
  if (variant === 'thumbnail') return 80;
  if (variant === 'card' || variant === 'event_card') return 82;
  return 84;
}

function sanitizeWebp(bytes: Uint8Array, maxDimension: number, variant: string) {
  const headerDimensions = webpDimensions(bytes);
  if (
    headerDimensions.width <= 0 ||
    headerDimensions.height <= 0 ||
    headerDimensions.width > maxDimension ||
    headerDimensions.height > maxDimension ||
    headerDimensions.width * headerDimensions.height > 1920 * 1920
  ) {
    throw new Error(`${variant} dimensions are larger than allowed.`);
  }

  const settings = new MagickReadSettings({
    format: MagickFormat.WebP,
    frameCount: 1,
  });
  return ImageMagick.read(bytes, settings, (image) => {
    image.autoOrient();
    if (
      image.width <= 0 ||
      image.height <= 0 ||
      image.width > maxDimension ||
      image.height > maxDimension ||
      image.width * image.height > 1920 * 1920
    ) {
      throw new Error(`${variant} dimensions are larger than allowed.`);
    }

    image.strip();
    image.quality = qualityForVariant(variant);
    return image.write(MagickFormat.WebP, (output) => new Uint8Array(output));
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
  const token = authorization.slice('Bearer '.length);
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user)
    return json(401, { error: 'Your session is invalid or expired.' });

  let body: RequestBody;
  try {
    const payload: unknown = await request.json();
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return json(400, { error: 'Invalid media request.' });
    }
    body = payload as RequestBody;
  } catch {
    return json(400, { error: 'A JSON request body is required.' });
  }

  if (
    !isUuid(body.businessId) ||
    !isUuid(body.assetGroupId) ||
    !variantRules[body.role] ||
    (['offering', 'event', 'event_gallery'].includes(body.role) && !isUuid(body.targetId)) ||
    !Array.isArray(body.variants) ||
    body.variants.some(
      (item) => !item || typeof item.path !== 'string' || typeof item.variant !== 'string',
    )
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
  if (body.variants.some((item) => item.path !== `${stagedPrefix}${item.variant}.webp`)) {
    return json(400, { error: 'A staging path was rejected.' });
  }

  const uploadedPaths: string[] = [];
  const verifiedVariants: Record<string, unknown>[] = [];
  const preparedVariants: { variant: string; storagePath: string; bytes: Uint8Array }[] = [];
  let reservationCreated = false;
  let finalizationAttempted = false;

  try {
    const { data: reservationResult, error: reservationError } = await admin.rpc(
      'reserve_business_media_upload',
      {
        p_actor_id: authData.user.id,
        p_business_id: body.businessId,
        p_asset_group_id: body.assetGroupId,
        p_role: body.role,
        p_target_id: body.targetId ?? null,
      },
    );
    if (reservationError) throw new Error(reservationError.message);
    const priorResult = reservationResult as { alreadyFinalized?: boolean; media?: unknown } | null;
    if (priorResult?.alreadyFinalized) {
      await removeStagedPaths(
        admin,
        authData.user.id,
        body.businessId,
        body.assetGroupId,
        body.variants.map((item) => item.path),
      );
      return json(200, { media: priorResult.media });
    }
    reservationCreated = true;

    await initializeImageProcessor();
    for (const item of body.variants) {
      const rule = expectedRules[item.variant];
      if (!rule) throw new Error('An image variant was rejected.');

      const { data: blob, error: downloadError } = await admin.storage
        .from('media-staging')
        .download(item.path);
      if (downloadError || !blob) throw new Error(`Could not read ${item.variant}.`);
      if (blob.type !== 'image/webp') throw new Error(`${item.variant} must be a WebP image.`);

      const bytes = new Uint8Array(await blob.arrayBuffer());
      if (bytes.byteLength > rule.maxBytes)
        throw new Error(`${item.variant} is larger than allowed.`);
      const sanitizedBytes = sanitizeWebp(bytes, rule.maxDimension, item.variant);
      if (!sanitizedBytes.byteLength || sanitizedBytes.byteLength > rule.maxBytes)
        throw new Error(`${item.variant} is larger than allowed after image verification.`);
      const dimensions = webpDimensions(sanitizedBytes);

      const storagePath = `${permanentPrefix}${item.variant}.webp`;
      preparedVariants.push({ variant: item.variant, storagePath, bytes: sanitizedBytes });
      verifiedVariants.push({
        variant: item.variant,
        storagePath,
        mimeType: 'image/webp',
        width: dimensions.width,
        height: dimensions.height,
        byteSize: sanitizedBytes.byteLength,
        contentHash: await sha256(sanitizedBytes),
      });
    }

    // Do not make any public object until every supplied variant has passed a
    // real WebP decode, pixel-bound check, metadata strip, and server re-encode.
    for (const item of preparedVariants) {
      const { error: uploadError } = await admin.storage
        .from('business-media')
        .upload(item.storagePath, item.bytes, {
          contentType: 'image/webp',
          cacheControl: '31536000',
          upsert: false,
        });
      if (uploadError) throw new Error(`Could not publish ${item.variant}.`);
      uploadedPaths.push(item.storagePath);
    }

    finalizationAttempted = true;
    const { data: result, error: finalizeError } = await admin.rpc(
      'finalize_reserved_business_media_upload',
      {
        p_actor_id: authData.user.id,
        p_business_id: body.businessId,
        p_asset_group_id: body.assetGroupId,
        p_role: body.role,
        p_target_id: body.targetId ?? null,
        p_alt_text: body.altText ?? '',
        p_caption: body.caption ?? '',
        p_display_order: body.displayOrder ?? null,
        p_variants: verifiedVariants,
      },
    );
    if (finalizeError) throw new Error(finalizeError.message);

    const previousPaths = (result as { previousPaths?: string[] } | null)?.previousPaths ?? [];
    await Promise.all([
      removeStagedPaths(
        admin,
        authData.user.id,
        body.businessId,
        body.assetGroupId,
        body.variants.map((item) => item.path),
      ),
      previousPaths.length
        ? admin.storage
            .from('business-media')
            .remove(previousPaths)
            .then(({ error }) => {
              if (error) {
                console.error('Could not immediately remove replaced images.', {
                  businessId: body.businessId,
                  code: error.name,
                  message: error.message,
                });
              }
            })
        : Promise.resolve(),
    ]);
    return json(200, { media: result });
  } catch (error) {
    if (finalizationAttempted) {
      const { data: reservation, error: reservationReadError } = await admin
        .from('media_upload_reservations')
        .select('status, result')
        .eq('asset_group_id', body.assetGroupId)
        .eq('business_id', body.businessId)
        .eq('actor_id', authData.user.id)
        .maybeSingle();
      if (reservationReadError) {
        return json(503, {
          error:
            'The photo save is still being confirmed. Refresh the workspace before trying again.',
        });
      }
      if (reservation?.status === 'consumed' && reservation.result) {
        await removeStagedPaths(
          admin,
          authData.user.id,
          body.businessId,
          body.assetGroupId,
          body.variants.map((item) => item.path),
        );
        return json(200, { media: reservation.result });
      }
    }

    if (uploadedPaths.length) {
      const { error: removeError } = await admin.storage
        .from('business-media')
        .remove(uploadedPaths);
      if (removeError)
        console.error(
          'Immediate image cleanup failed; queued retry will run.',
          removeError.message,
        );
    }
    if (reservationCreated) {
      const { error: releaseError } = await admin.rpc('release_business_media_staging_intent', {
        p_actor_id: authData.user.id,
        p_business_id: body.businessId,
        p_asset_group_id: body.assetGroupId,
      });
      if (releaseError) {
        console.error('Could not release image upload reservation.', {
          businessId: body.businessId,
          code: releaseError.code,
        });
        const { error: fallbackReleaseError } = await admin.rpc('release_business_media_upload', {
          p_actor_id: authData.user.id,
          p_business_id: body.businessId,
          p_asset_group_id: body.assetGroupId,
        });
        if (fallbackReleaseError) {
          console.error('Could not release the media quota reservation.', {
            businessId: body.businessId,
            code: fallbackReleaseError.code,
          });
        }
      }
    }
    return json(400, {
      error: error instanceof Error ? error.message : 'The image could not be published.',
    });
  }
});
