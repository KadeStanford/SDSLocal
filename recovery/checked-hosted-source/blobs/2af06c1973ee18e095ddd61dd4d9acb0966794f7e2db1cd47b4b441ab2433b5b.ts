import { CommerceError, SQUARE_API_VERSION } from './square-security.ts';

// Square responses are heterogeneous; validate each boundary in square-domain.
// deno-lint-ignore no-explicit-any
export type SquareObject = Record<string, any>;
export class SquareClient {
  onAuthorizationFailure?: () => Promise<void>;
  constructor(
    private token: string,
    private fetcher: typeof fetch = fetch,
    private sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
  ) {}
  async request(
    path: string,
    body?: unknown,
    method = body === undefined ? 'GET' : 'POST',
  ): Promise<SquareObject> {
    if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Invalid provider path');
    for (let attempt = 0; attempt < 3; attempt++) {
      let response: Response;
      try {
        response = await this.fetcher(`https://connect.squareupsandbox.com${path}`, {
          method,
          headers: {
            Authorization: this.token,
            'Square-Version': SQUARE_API_VERSION,
            'Content-Type': 'application/json',
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: AbortSignal.timeout(12000),
        });
      } catch {
        throw new CommerceError(
          'PROVIDER_UNAVAILABLE',
          'Square did not respond. Retry safely in a moment.',
          503,
        );
      }
      if ((response.status === 429 || response.status >= 500) && attempt < 2) {
        await this.sleep(
          Math.min(
            2000,
            Math.max(250 * 2 ** attempt, Number(response.headers.get('Retry-After') ?? 0) * 1000),
          ),
        );
        continue;
      }
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        const codes = [detail.error, ...(detail.errors ?? []).map((e: SquareObject) => e.code)];
        const authorizationFailed =
          response.status === 401 ||
          codes.some((code) =>
            [
              'invalid_grant',
              'ACCESS_TOKEN_EXPIRED',
              'ACCESS_TOKEN_REVOKED',
              'UNAUTHORIZED',
            ].includes(code),
          );
        if (authorizationFailed) await this.onAuthorizationFailure?.();
        throw new CommerceError(
          authorizationFailed
            ? 'RECONNECT'
            : response.status === 404
              ? 'PROVIDER_NOT_FOUND'
              : 'PROVIDER_ERROR',
          authorizationFailed
            ? 'Reconnect Square to continue.'
            : 'Square could not complete this action. Refresh and try again.',
          authorizationFailed ? 409 : 503,
        );
      }
      return await response.json();
    }
    throw new CommerceError('PROVIDER_UNAVAILABLE', 'Square is temporarily unavailable.', 503);
  }
  async pages(path: string, key: string) {
    const result: SquareObject[] = [];
    const seen = new Set<string>();
    let cursor: string | undefined;
    do {
      const page = await this.request(
        `${path}${cursor ? `${path.includes('?') ? '&' : '?'}cursor=${encodeURIComponent(cursor)}` : ''}`,
      );
      result.push(...(page[key] ?? []));
      cursor = page.cursor;
      if (cursor && (seen.has(cursor) || seen.size >= 99))
        throw new CommerceError(
          'CATALOG_LIMIT',
          'Catalog synchronization needs support. The previous catalog is unchanged.',
          503,
        );
      if (cursor) seen.add(cursor);
    } while (cursor);
    return result;
  }
}
