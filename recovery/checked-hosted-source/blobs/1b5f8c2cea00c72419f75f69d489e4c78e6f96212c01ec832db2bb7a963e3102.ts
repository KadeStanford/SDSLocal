import { createClient } from 'npm:@supabase/supabase-js@2';
import { SquareService } from './square-service.ts';
import { StripeService } from './stripe-service.ts';
import { commerceProvider } from './commerce-routing.ts';
import { CommerceError, hash, record, squareConfig, stripeConfig } from './square-security.ts';

export function database() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export function runtime() {
  return new SquareService(
    database(),
    squareConfig((key) => Deno.env.get(key)),
  );
}
export function stripeRuntime(db = database()) {
  return new StripeService(
    db,
    stripeConfig((key) => Deno.env.get(key)),
  );
}
function originAllowed(origin: string | null) {
  if (!origin) return true;
  const allowed = [
    Deno.env.get('SQUARE_ALLOWED_ORIGIN') ?? '',
    Deno.env.get('STRIPE_ALLOWED_ORIGIN') ?? '',
    ...(Deno.env.get('SQUARE_LOCAL_DEV_ORIGINS') ?? '').split(','),
  ]
    .map((value) => value.trim())
    .filter(Boolean);
  return allowed.includes(origin);
}
export function response(request: Request, status: number, body: unknown) {
  const origin = request.headers.get('Origin');
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      ...(origin && originAllowed(origin)
        ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' }
        : {}),
    },
  });
}
export function errorResponse(request: Request, error: unknown) {
  const providerCode =
    error instanceof CommerceError && error.code === 'PROVIDER_ERROR'
      ? (error as CommerceError & { providerCode?: unknown }).providerCode
      : undefined;
  const providerRequestId =
    error instanceof CommerceError && error.code === 'PROVIDER_ERROR'
      ? (error as CommerceError & { providerRequestId?: unknown }).providerRequestId
      : undefined;
  return response(request, error instanceof CommerceError ? error.status : 503, {
    error:
      error instanceof CommerceError
        ? error.message
        : 'Ordering is temporarily unavailable. Please retry.',
    code: error instanceof CommerceError ? error.code : 'UNAVAILABLE',
    ...(typeof providerCode === 'string' && /^[A-Za-z0-9_.-]{1,80}$/.test(providerCode)
      ? { providerCode }
      : {}),
    ...(typeof providerRequestId === 'string' && /^req_[A-Za-z0-9]+$/.test(providerRequestId)
      ? { providerRequestId }
      : {}),
  });
}
export async function readBody(request: Request, max = 32768) {
  const reader = request.body?.getReader();
  if (!reader) throw new CommerceError('INVALID_REQUEST', 'Missing request body.');
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > max) {
      await reader.cancel();
      throw new CommerceError('TOO_LARGE', 'The request is too large.', 413);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(bytes);
}
export async function commerceHandler(request: Request) {
  if (!originAllowed(request.headers.get('Origin')))
    return response(request, 403, { error: 'Request origin is not allowed.' });
  if (request.method === 'OPTIONS') return response(request, 200, {});
  if (request.method !== 'POST') return response(request, 405, { error: 'Method not allowed.' });
  try {
    const body = record(JSON.parse(await readBody(request)));
    const db = database();
    const service: any =
      (await commerceProvider(db, body)) === 'stripe'
        ? stripeRuntime(db)
        : new SquareService(
            db,
            squareConfig((key) => Deno.env.get(key)),
          );
    const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    const user = token ? (await service.db.auth.getUser(token)).data.user : null;
    const bucket = await hash(
      `${body.action}:${user?.id ?? request.headers.get('x-forwarded-for') ?? 'guest'}:${body.businessId ?? body.orderId ?? ''}`,
    );
    const allowed = await service.checked(
      service.db.rpc('square_rate_limit', {
        p_bucket: bucket,
        p_limit:
          body.action === 'quote' ||
          body.action === 'checkout' ||
          body.action === 'resume_payment' ||
          body.action === 'appointment_book'
            ? 12
            : 60,
      }),
    );
    if (!allowed)
      throw new CommerceError('RATE_LIMIT', 'Please wait a moment before trying again.', 429);
    return response(request, 200, await service.route(body, user?.id ?? null));
  } catch (error) {
    return errorResponse(request, error);
  }
}
