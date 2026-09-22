export const squareSandboxAccountsUrl =
  'https://developer.squareup.com/console/en/sandbox-test-accounts';

export type SquareBrowserIntent = 'oauth' | 'checkout' | 'sandbox-dashboard';

/** Browser destinations are not authority for connection or payment state. */
export function squareBrowserUrl(value: string, intent: SquareBrowserIntent): string {
  try {
    if (!/^https:\/\/[^/?#]+(?:[/?#]|$)/.test(value) || /[\s\\\u0000-\u001f]/.test(value))
      throw new Error();
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash)
      throw new Error();
    const allowed =
      intent === 'oauth'
        ? url.hostname === 'connect.squareupsandbox.com' && url.pathname === '/oauth2/authorize'
        : intent === 'sandbox-dashboard'
          ? url.href === squareSandboxAccountsUrl
          : [
              'squareupsandbox.com',
              'sandbox.square.link',
              'square.link',
              'checkout.square.site',
            ].includes(url.hostname);
    if (!allowed) throw new Error();
    return url.href;
  } catch {
    throw new Error('This Square address could not be verified. Please try again.');
  }
}

export function isSquareConnectionReturn(value: string | null, businessId: string) {
  try {
    const url = new URL(value ?? '');
    return (
      url.protocol === 'sdslocal:' &&
      url.hostname === 'business' &&
      !url.username &&
      !url.password &&
      !url.port &&
      !url.pathname &&
      url.searchParams.getAll('id').length === 1 &&
      url.searchParams.get('id') === businessId &&
      url.searchParams.getAll('section').length === 1 &&
      url.searchParams.get('section') === 'ordering'
    );
  } catch {
    return false;
  }
}

export type SquarePreparationStep = 'prepare' | 'dashboard' | 'continue' | 'cancel';
export async function performSquarePreparationStep(
  step: SquarePreparationStep,
  ports: {
    requestAuthorization: () => Promise<{ url: string }>;
    openOAuth: (url: string) => Promise<void>;
    openDashboard: () => Promise<void>;
  },
) {
  if (step === 'cancel') return 'cancelled' as const;
  if (step === 'dashboard') await ports.openDashboard();
  if (step !== 'continue') return 'preparing' as const;
  // Only the explicit Continue action creates a short-lived, single-use state.
  const result = await ports.requestAuthorization();
  await ports.openOAuth(squareBrowserUrl(result.url, 'oauth'));
  return 'waiting' as const;
}

export function squareConnectionReturnNotice(
  connected: boolean,
  startedAt: number | null,
  callback: boolean,
  now = Date.now(),
) {
  if (connected) return 'Square Sandbox is connected. Choose a location and sync your catalog.';
  if (startedAt !== null && now - startedAt >= 10 * 60 * 1000)
    return 'Square authorization expired. Open the Sandbox seller dashboard, then try connecting again.';
  if (callback)
    return 'Square authorization was not granted. Open the Sandbox seller dashboard and try again when you are ready.';
  return 'Square is not connected yet. Authorization may have been canceled or denied. Keep the Sandbox seller dashboard open and try again.';
}

export async function squareBrowserTimeout<T>(operation: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Square did not respond. Please retry.')), 25000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
