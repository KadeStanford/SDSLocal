import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ square: vi.fn(), stripe: vi.fn(), squareConfig: vi.fn() }));
vi.mock('../_shared/square-runtime.ts', () => ({
  database: () => ({}),
  stripeRuntime: () => ({ maintenance: mocks.stripe }),
  response: (_request: Request, status: number, body: unknown) => Response.json(body, { status }),
  errorResponse: () => Response.json({ error: 'Unexpected failure' }, { status: 500 }),
}));
vi.mock('../_shared/square-service.ts', () => ({
  SquareService: class {
    maintenance = mocks.square;
  },
}));
vi.mock('../_shared/square-security.ts', () => ({
  hash: async (value: string) => value,
  squareConfig: mocks.squareConfig,
}));
let handler: (request: Request) => Promise<Response>;
beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.squareConfig.mockReturnValue({});
  mocks.square.mockResolvedValue({ processed: 1, failures: 0 });
  mocks.stripe.mockResolvedValue({ processed: 1, failures: 0 });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ dispatched: 0 })));
  vi.stubGlobal('Deno', {
    env: {
      get: (key: string) =>
        ({ SQUARE_MAINTENANCE_SECRET: 'fixture-secret', STRIPE_COMMERCE_ENABLED: 'true' })[key],
    },
    serve: (callback: typeof handler) => {
      handler = callback;
    },
  });
  await import('./index');
});
afterEach(() => vi.unstubAllGlobals());
function request(authorized = true) {
  return new Request('https://example.test/maintenance', {
    method: 'POST',
    headers: { Authorization: authorized ? 'Bearer fixture-secret' : 'Bearer wrong' },
  });
}
it('runs Stripe even when Square configuration fails and reports degraded health', async () => {
  mocks.squareConfig.mockImplementation(() => {
    throw new Error('Missing Square configuration');
  });
  const result = await handler(request());
  expect(result.status).toBe(503);
  expect(mocks.stripe).toHaveBeenCalledOnce();
  expect(await result.json()).toMatchObject({
    error: 'Square reconciliation unavailable',
    stripe: { processed: 1 },
  });
});
it('reports per-order reconciliation failures as degraded health', async () => {
  mocks.stripe.mockResolvedValue({ processed: 2, failures: 1 });
  expect((await handler(request())).status).toBe(503);
});
it('rejects an unauthenticated invocation before either provider runs', async () => {
  expect((await handler(request(false))).status).toBe(401);
  expect(mocks.square).not.toHaveBeenCalled();
  expect(mocks.stripe).not.toHaveBeenCalled();
});
