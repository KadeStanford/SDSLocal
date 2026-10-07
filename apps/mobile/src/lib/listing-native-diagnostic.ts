/** Only emit recognized error identifiers, never raw receipts, URLs or account details. */
export function listingNativeErrorDiagnostic(cause: unknown) {
  const error = cause as {
    code?: unknown;
    userInfo?: { readableErrorCode?: unknown };
    underlyingErrorMessage?: unknown;
  } | null;
  const code = String(error?.code ?? 'unknown');
  const readable = error?.userInfo?.readableErrorCode;
  const underlying =
    typeof error?.underlyingErrorMessage === 'string' ? error.underlyingErrorMessage : '';
  const domains = [
    ...underlying.matchAll(/\b([A-Za-z]{2,40}ErrorDomain)\s+Code\s*=\s*(-?\d{1,8})\b/g),
  ].map((match) => `${match[1]} ${match[2]}`);
  return [
    `SDK code: ${/^\d{1,3}$/.test(code) ? code : 'unknown'}`,
    typeof readable === 'string' && /^[A-Z_]{3,100}$/.test(readable) ? readable : null,
    ...new Set(domains.slice(0, 6)),
  ]
    .filter(Boolean)
    .join('\n');
}
