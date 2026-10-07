import { expect, it } from 'vitest';
import {
  serviceRequestArguments,
  serviceRequestCanEditAfterFailure,
  serviceRequestDraftError,
  type ServiceRequestDraft,
} from './service-request-draft';
const draft: ServiceRequestDraft = {
  businessId: 'service-business',
  offeringId: 'repair',
  message: '  Repair the kitchen sink  ',
  timing: '  Next week  ',
};
it('preserves the exact reviewed payload and retry key when confirmation is lost', () => {
  const original = serviceRequestArguments(draft, 'same-key');
  expect(original).toEqual({
    p_business_id: 'service-business',
    p_idempotency_key: 'same-key',
    p_offering_item_id: 'repair',
    p_request_message: 'Repair the kitchen sink',
    p_preferred_timing: 'Next week',
  });
  expect(serviceRequestArguments({ ...draft }, 'same-key')).toEqual(original);
  expect(serviceRequestCanEditAfterFailure(new TypeError('Network request failed'))).toBe(false);
  expect(serviceRequestCanEditAfterFailure({ code: '', message: 'Lost response' })).toBe(false);
  expect(serviceRequestCanEditAfterFailure(null)).toBe(false);
});
it('allows correction after explicit server validation, availability, auth or rate-limit rejection', () => {
  for (const code of ['22023', 'P0002', '42501', '54000'])
    expect(serviceRequestCanEditAfterFailure({ code })).toBe(true);
});
it('rejects stale services and trimmed invalid lengths before showing a sendable review', () => {
  expect(serviceRequestDraftError(draft, ['repair'])).toBeNull();
  expect(serviceRequestDraftError(draft, ['another-service'])).toContain('available service');
  expect(serviceRequestDraftError({ ...draft, message: 'short' }, ['repair'])).toContain('10–2000');
  expect(serviceRequestDraftError({ ...draft, message: 'x'.repeat(2001) }, ['repair'])).toContain(
    '10–2000',
  );
  expect(serviceRequestDraftError({ ...draft, timing: 'x'.repeat(201) }, ['repair'])).toContain(
    '200',
  );
  expect(
    serviceRequestDraftError(
      { ...draft, offeringId: null, message: 'x'.repeat(2000), timing: '' },
      [],
    ),
  ).toBeNull();
  expect(serviceRequestArguments({ ...draft, timing: '  ' }, 'key').p_preferred_timing).toBeNull();
});
