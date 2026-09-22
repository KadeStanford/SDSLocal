import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isSquareConnectionReturn,
  performSquarePreparationStep,
  squareBrowserTimeout,
  squareBrowserUrl,
  squareConnectionReturnNotice,
  squareSandboxAccountsUrl,
} from './square-browser';

const authorizeUrl = 'https://connect.squareupsandbox.com/oauth2/authorize?state=test-only';
const businessId = '11111111-1111-4111-8111-111111111111';
describe('Square browser destinations', () => {
  it('accepts only the Sandbox OAuth endpoint for authorization', () => {
    expect(squareBrowserUrl(authorizeUrl, 'oauth')).toBe(authorizeUrl);
    expect(() =>
      squareBrowserUrl('https://connect.squareup.com/oauth2/authorize', 'oauth'),
    ).toThrow();
    expect(() =>
      squareBrowserUrl('https://connect.squareupsandbox.com/v2/locations', 'oauth'),
    ).toThrow();
  });
  it.each(['squareupsandbox.com', 'sandbox.square.link', 'square.link', 'checkout.square.site'])(
    'retains approved checkout host %s',
    (host) => {
      expect(squareBrowserUrl(`https://${host}/checkout/test`, 'checkout')).toBe(
        `https://${host}/checkout/test`,
      );
    },
  );
  it.each([
    'https://connect.squareupsandbox.com.attacker.test/oauth2/authorize',
    'https://attacker-connect.squareupsandbox.com/oauth2/authorize',
    'http://connect.squareupsandbox.com/oauth2/authorize',
    'https://person:password@connect.squareupsandbox.com/oauth2/authorize',
    'https://connect.squareupsandbox.com@attacker.test/oauth2/authorize',
    'https://connect.squareupsandbox.com:444/oauth2/authorize',
    'https://connect.squareupsandbox.com\\@attacker.test/oauth2/authorize',
    'https:///connect.squareupsandbox.com/oauth2/authorize',
    'https://connect.squareupsandbox.com/oauth2/authorize\n',
    'https://example.com/oauth2/authorize',
    'not a url',
    'javascript:alert(1)',
  ])('rejects unsafe authorization URL %s', (url) => {
    expect(() => squareBrowserUrl(url, 'oauth')).toThrow('could not be verified');
  });
  it.each([
    'https://square.link.attacker.test/u/test',
    'http://square.link/u/test',
    'https://user:password@square.link/u/test',
    'https://example.com/checkout',
  ])('rejects unsafe checkout URL %s', (url) => {
    expect(() => squareBrowserUrl(url, 'checkout')).toThrow();
  });
  it('limits dashboard preparation to the generic Sandbox accounts page', () => {
    expect(squareBrowserUrl(squareSandboxAccountsUrl, 'sandbox-dashboard')).toBe(
      squareSandboxAccountsUrl,
    );
    expect(() =>
      squareBrowserUrl(`${squareSandboxAccountsUrl}?token=private`, 'sandbox-dashboard'),
    ).toThrow();
    expect(() => squareBrowserUrl(authorizeUrl, 'checkout')).toThrow();
  });
});

describe('Sandbox preparation and return', () => {
  const ports = () => ({
    requestAuthorization: vi.fn(async () => ({ url: authorizeUrl })),
    openOAuth: vi.fn(async (_url: string) => {}),
    openDashboard: vi.fn(async () => {}),
  });
  it('creates no authorization state during preparation, dashboard opening, or cancel', async () => {
    const calls = ports();
    expect(await performSquarePreparationStep('prepare', calls)).toBe('preparing');
    expect(await performSquarePreparationStep('dashboard', calls)).toBe('preparing');
    expect(await performSquarePreparationStep('cancel', calls)).toBe('cancelled');
    expect(calls.openDashboard).toHaveBeenCalledOnce();
    expect(calls.requestAuthorization).not.toHaveBeenCalled();
    expect(calls.openOAuth).not.toHaveBeenCalled();
  });
  it('requests a fresh URL only on Continue, then opens the OAuth browser', async () => {
    const calls = ports();
    expect(await performSquarePreparationStep('continue', calls)).toBe('waiting');
    expect(calls.requestAuthorization).toHaveBeenCalledOnce();
    expect(calls.openOAuth).toHaveBeenCalledWith(authorizeUrl);
    expect(calls.openDashboard).not.toHaveBeenCalled();
  });
  it('does not open a browser on server failure or an untrusted server URL', async () => {
    const calls = ports();
    calls.requestAuthorization.mockRejectedValueOnce(new Error('unavailable'));
    await expect(performSquarePreparationStep('continue', calls)).rejects.toThrow();
    calls.requestAuthorization.mockResolvedValueOnce({ url: 'https://example.com' });
    await expect(performSquarePreparationStep('continue', calls)).rejects.toThrow();
    expect(calls.openOAuth).not.toHaveBeenCalled();
  });
  it('allows retry after browser cancellation/failure without claiming connected', async () => {
    const calls = ports();
    calls.openOAuth.mockRejectedValueOnce(new Error('no browser'));
    await expect(performSquarePreparationStep('continue', calls)).rejects.toThrow();
    expect(await performSquarePreparationStep('continue', calls)).toBe('waiting');
    expect(calls.requestAuthorization).toHaveBeenCalledTimes(2);
  });
  it('recognizes only a matching business return for connection refresh', () => {
    const callback = `sdslocal://business?id=${businessId}&section=ordering`;
    expect(isSquareConnectionReturn(callback, businessId)).toBe(true);
    expect(isSquareConnectionReturn(callback, 'another-business')).toBe(false);
    expect(isSquareConnectionReturn(`${callback}&id=another-business`, businessId)).toBe(false);
    expect(isSquareConnectionReturn(callback.replace('sdslocal:', 'https:'), businessId)).toBe(
      false,
    );
    expect(isSquareConnectionReturn(null, businessId)).toBe(false);
  });
  it('uses refreshed server state for success; explains denied, canceled, and expired attempts', () => {
    expect(squareConnectionReturnNotice(true, 0, true, 700000)).toContain('is connected');
    expect(squareConnectionReturnNotice(false, 0, true, 1000)).toContain('not granted');
    expect(squareConnectionReturnNotice(false, 0, false, 1000)).toContain('canceled or denied');
    expect(squareConnectionReturnNotice(false, 0, false, 600000)).toContain('expired');
  });
  afterEach(() => vi.useRealTimers());
  it('bounds browser and connection checks so an unavailable service cannot leave an endless spinner', async () => {
    vi.useFakeTimers();
    const pending = squareBrowserTimeout(new Promise(() => {}));
    const check = expect(pending).rejects.toThrow('Please retry');
    await vi.advanceTimersByTimeAsync(25000);
    await check;
    expect(vi.getTimerCount()).toBe(0);
  });
});
