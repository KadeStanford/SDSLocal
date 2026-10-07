import { describe, expect, it, vi } from 'vitest';

import {
  ListingBillingIdentityCoordinator,
  type BillingIdentityClient,
} from './listing-billing-identity';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function client(overrides: Partial<BillingIdentityClient> = {}) {
  const calls: string[] = [];
  let configured = false;
  const value: BillingIdentityClient = {
    isConfigured: vi.fn(async () => configured),
    configure: vi.fn(({ appUserID }) => {
      configured = true;
      calls.push(`configure:${appUserID}`);
    }),
    logIn: vi.fn(async (appUserID: string) => {
      configured = true;
      calls.push(`logIn:${appUserID}`);
    }),
    logOut: vi.fn(async () => {
      calls.push('logOut');
    }),
    ...overrides,
  };
  return { value, calls };
}

describe('listing billing identity coordination', () => {
  it('suppresses late account A SDK calls and state commits after B finishes', async () => {
    const load = deferred<BillingIdentityClient>();
    const sdk = client();
    const coordinator = new ListingBillingIdentityCoordinator(() => load.promise, 'key');
    const displayed: string[] = [];

    const accountA = coordinator.request('account-a');
    const accountB = coordinator.request('account-b');
    load.resolve(sdk.value);

    expect(await accountA.ready).toBe(false);
    expect(await accountB.ready).toBe(true);
    expect(sdk.calls).toEqual(['configure:account-b']);

    expect(coordinator.commitIfCurrent(accountA, () => displayed.push('A'))).toBe(false);
    expect(coordinator.commitIfCurrent(accountB, () => displayed.push('B'))).toBe(true);
    expect(displayed).toEqual(['B']);
  });

  it('logs out explicitly when sign-out supersedes pending initialization', async () => {
    const isConfigured = deferred<boolean>();
    const sdk = client({ isConfigured: vi.fn(() => isConfigured.promise) });
    const coordinator = new ListingBillingIdentityCoordinator(async () => sdk.value, 'key');

    const accountA = coordinator.request('account-a');
    const signedOut = coordinator.request(null);
    isConfigured.resolve(true);

    expect(await accountA.ready).toBe(false);
    expect(await signedOut.ready).toBe(true);
    expect(sdk.calls).toEqual(['logOut']);
    expect(coordinator.isReadyFor(accountA)).toBe(false);
  });

  it('serializes rapid A/B/A switching and leaves the SDK on the final A identity', async () => {
    const logIns = new Map<string, ReturnType<typeof deferred<void>>>();
    const sdk = client({
      isConfigured: vi.fn(async () => true),
      logIn: vi.fn((appUserID: string) => {
        const pending = deferred<void>();
        logIns.set(appUserID, pending);
        sdk.calls.push(`logIn:start:${appUserID}`);
        return pending.promise.then(() => {
          sdk.calls.push(`logIn:done:${appUserID}`);
        });
      }),
    });
    const coordinator = new ListingBillingIdentityCoordinator(async () => sdk.value, 'key');

    // The coordinator's remembered identity is null, so the first A request
    // establishes A through logIn in this already-configured SDK scenario.
    const accountA1 = coordinator.request('account-a');
    const accountB = coordinator.request('account-b');
    const accountA2 = coordinator.request('account-a');

    await vi.waitFor(() => expect(sdk.calls).toEqual(['logIn:start:account-a']));
    logIns.get('account-a')?.resolve();

    expect(await accountA1.ready).toBe(false);
    expect(await accountB.ready).toBe(false);
    expect(await accountA2.ready).toBe(true);
    expect(sdk.calls).toEqual(['logIn:start:account-a', 'logIn:done:account-a']);
    expect(coordinator.isReadyFor(accountA2)).toBe(true);

    const accountB2 = coordinator.request('account-b');
    await vi.waitFor(() => expect(sdk.calls.at(-1)).toBe('logIn:start:account-b'));
    const accountA3 = coordinator.request('account-a');
    logIns.get('account-b')?.resolve();

    expect(await accountB2.ready).toBe(false);
    await vi.waitFor(() => expect(sdk.calls.at(-1)).toBe('logIn:start:account-a'));
    logIns.get('account-a')?.resolve();
    expect(await accountA3.ready).toBe(true);
    expect(sdk.calls).toEqual([
      'logIn:start:account-a',
      'logIn:done:account-a',
      'logIn:start:account-b',
      'logIn:done:account-b',
      'logIn:start:account-a',
      'logIn:done:account-a',
    ]);
  });

  it('rejects a purchase attempt during an identity transition', async () => {
    const isConfigured = deferred<boolean>();
    const sdk = client({ isConfigured: vi.fn(() => isConfigured.promise) });
    const coordinator = new ListingBillingIdentityCoordinator(async () => sdk.value, 'key');
    const purchase = vi.fn(async () => 'purchased');

    const accountA = coordinator.request('account-a');
    expect(await coordinator.runIfReady(accountA, purchase)).toBeUndefined();
    expect(purchase).not.toHaveBeenCalled();

    isConfigured.resolve(false);
    expect(await accountA.ready).toBe(true);
    expect(await coordinator.runIfReady(accountA, purchase)).toBe('purchased');
    expect(purchase).toHaveBeenCalledTimes(1);
  });
});
