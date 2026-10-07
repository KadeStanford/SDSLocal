import { expect, it } from 'vitest';
import { listingNativeErrorDiagnostic } from './listing-native-diagnostic';
it('extracts native store domain codes without exposing raw Apple account or receipt data', () => {
  const result = listingNativeErrorDiagnostic({
    code: '1',
    userInfo: { readableErrorCode: 'PURCHASE_CANCELLED' },
    underlyingErrorMessage:
      'Error Domain=ASDErrorDomain Code=500 email=private@example.com receipt=secret (Error Domain=AMSErrorDomain Code=100)',
  });
  expect(result).toContain('ASDErrorDomain 500');
  expect(result).toContain('AMSErrorDomain 100');
  expect(result).toContain('PURCHASE_CANCELLED');
  expect(result).not.toMatch(/private|secret|example/);
});
it('handles malformed or missing error data without leaking it', () => {
  expect(listingNativeErrorDiagnostic(null)).toBe('SDK code: unknown');
  expect(
    listingNativeErrorDiagnostic({
      code: 'secret',
      userInfo: { readableErrorCode: 'https://private.example' },
    }),
  ).toBe('SDK code: unknown');
});
