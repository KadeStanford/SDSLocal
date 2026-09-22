const encoder = new TextEncoder();

export interface LoyaltyTokenClaims {
  iss: 'sds-local';
  aud: 'sds-loyalty';
  sub: string;
  membershipId: string;
  businessId: string;
  programId: string;
  /** The signed program kind lets the scanner choose the transaction automatically. */
  programType?: 'visits' | 'points';
  jti: string;
  iat: number;
  exp: number;
}

function base64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(value: string) {
  const padded = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function signingKey(secret: string, usage: KeyUsage[]) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    usage,
  );
}

export async function signLoyaltyToken(claims: LoyaltyTokenClaims, secret: string) {
  const header = base64Url(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const payload = base64Url(encoder.encode(JSON.stringify(claims)));
  const unsigned = `${header}.${payload}`;
  const signature = await crypto.subtle.sign(
    'HMAC',
    await signingKey(secret, ['sign']),
    encoder.encode(unsigned),
  );
  return `${unsigned}.${base64Url(new Uint8Array(signature))}`;
}

export async function verifyLoyaltyToken(token: string, secret: string) {
  const [headerPart, payloadPart, signaturePart, extra] = token.split('.');
  if (!headerPart || !payloadPart || !signaturePart || extra)
    throw new Error('Invalid loyalty code.');

  const header = JSON.parse(new TextDecoder().decode(decodeBase64Url(headerPart))) as {
    alg?: string;
    typ?: string;
  };
  if (header.alg !== 'HS256' || header.typ !== 'JWT') throw new Error('Invalid loyalty code.');
  const verified = await crypto.subtle.verify(
    'HMAC',
    await signingKey(secret, ['verify']),
    decodeBase64Url(signaturePart),
    encoder.encode(`${headerPart}.${payloadPart}`),
  );
  if (!verified) throw new Error('Invalid loyalty code signature.');

  const claims = JSON.parse(
    new TextDecoder().decode(decodeBase64Url(payloadPart)),
  ) as LoyaltyTokenClaims;
  const now = Math.floor(Date.now() / 1000);
  if (claims.iss !== 'sds-local' || claims.aud !== 'sds-loyalty') {
    throw new Error('Invalid loyalty code.');
  }
  if (!Number.isInteger(claims.exp) || claims.exp <= now) {
    throw new Error('This loyalty code expired. Ask the customer to refresh it.');
  }
  if (!Number.isInteger(claims.iat) || claims.iat > now + 5) {
    throw new Error('Invalid loyalty code time.');
  }
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  for (const value of [
    claims.sub,
    claims.membershipId,
    claims.businessId,
    claims.programId,
    claims.jti,
  ]) {
    if (!uuid.test(value)) throw new Error('Invalid loyalty code data.');
  }
  return claims;
}

export function loyaltySigningSecret() {
  const secret = Deno.env.get('LOYALTY_TOKEN_SECRET') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!secret || secret.length < 32) throw new Error('Loyalty signing is not configured.');
  return secret;
}
