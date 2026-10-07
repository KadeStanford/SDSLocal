import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { signLoyaltyToken, type LoyaltyTokenClaims } from '../_shared/loyalty-token.ts';
import { loyaltyTransactHandler } from './index.ts';

const mockedSupabase = vi.hoisted(() => ({ admin: undefined as unknown }));

vi.mock('npm:@supabase/supabase-js@2', () => ({
  createClient: vi.fn(() => mockedSupabase.admin),
}));

const businessId = '10000000-0000-4000-8000-000000000001';
const otherBusinessId = '10000000-0000-4000-8000-000000000002';
const staffId = '20000000-0000-4000-8000-000000000001';
const membershipId = '30000000-0000-4000-8000-000000000001';
const programId = '40000000-0000-4000-8000-000000000001';
const customerId = '50000000-0000-4000-8000-000000000001';
const tokenId = '60000000-0000-4000-8000-000000000001';
const signingSecret = 'test-loyalty-signing-secret-that-is-long-enough';

type MockAdminOptions = {
  actorId?: string;
  member: Record<string, unknown> | null;
};

function mockAdmin({ actorId = staffId, member }: MockAdminOptions) {
  const calls: string[] = [];
  const rows: Record<string, unknown> = {
    business_members: member,
    loyalty_memberships: {
      id: membershipId,
      business_id: businessId,
      program_id: programId,
      customer_id: customerId,
      is_active: true,
    },
    loyalty_programs: {
      id: programId,
      business_id: businessId,
      name: 'Coffee Club',
      reward_description: 'A free coffee',
      program_type: 'visits',
      stamps_required: 10,
      points_per_dollar: null,
      points_required: null,
      is_active: true,
    },
    loyalty_transactions: [],
    businesses: { name: 'North Star Cafe', status: 'active' },
    profiles: { display_name: 'Private Customer' },
  };

  const from = vi.fn((table: string) => {
    calls.push(table);
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      in: vi.fn(() => query),
      maybeSingle: vi.fn(() => Promise.resolve({ data: rows[table] ?? null, error: null })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve({ data: rows[table] ?? [], error: null }).then(resolve),
    };
    return query;
  });

  const admin = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: actorId } }, error: null }),
    },
    from,
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  return { admin, calls };
}

async function signedCustomerQr() {
  const claims: LoyaltyTokenClaims = {
    iss: 'sds-local',
    aud: 'sds-loyalty',
    sub: customerId,
    membershipId,
    businessId,
    programId,
    jti: tokenId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 300,
  };
  return signLoyaltyToken(claims, signingSecret);
}

function previewRequest(token: string, body: Record<string, unknown> = {}) {
  return new Request('https://functions.test/loyalty-transact', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer staff-session-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token, action: 'stamp', operation: 'preview', ...body }),
  });
}

describe('loyalty-transact preview handler authorization', () => {
  beforeEach(() => {
    vi.stubGlobal('Deno', {
      env: { get: (name: string) => (name === 'LOYALTY_TOKEN_SECRET' ? signingSecret : undefined) },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('denies a valid QR without an expected business before querying customer data', async () => {
    const { admin, calls } = mockAdmin({ actorId: customerId, member: null });
    mockedSupabase.admin = admin;

    const response = await loyaltyTransactHandler(await previewRequest(await signedCustomerQr()));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: 'Staff access is required for the selected business.' });
    expect(calls).toEqual(['business_members']);
    expect(calls).not.toContain('profiles');
    expect(JSON.stringify(body)).not.toContain('Private Customer');
  });

  it('allows an authorized staff caller to receive the legitimate preview', async () => {
    const { admin, calls } = mockAdmin({
      member: { business_id: businessId, user_id: staffId, role: 'staff', is_active: true },
    });
    mockedSupabase.admin = admin;

    const response = await loyaltyTransactHandler(await previewRequest(await signedCustomerQr()));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.preview).toMatchObject({
      customerName: 'Private Customer',
      businessName: 'North Star Cafe',
      programName: 'Coffee Club',
      action: 'stamp',
    });
    expect(calls).toEqual([
      'business_members',
      'loyalty_memberships',
      'loyalty_programs',
      'loyalty_transactions',
      'businesses',
      'profiles',
    ]);
  });

  it('rejects a conflicting expected business without exposing customer information', async () => {
    const { admin, calls } = mockAdmin({
      member: { business_id: businessId, user_id: staffId, role: 'staff', is_active: true },
    });
    mockedSupabase.admin = admin;

    const response = await loyaltyTransactHandler(
      await previewRequest(await signedCustomerQr(), { expectedBusinessId: otherBusinessId }),
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({
      error:
        'This customer code belongs to another business. Switch businesses or ask the customer to open the correct rewards card.',
    });
    expect(calls).not.toContain('profiles');
    expect(calls).not.toContain('businesses');
    expect(JSON.stringify(body)).not.toContain('Private Customer');
  });
});
