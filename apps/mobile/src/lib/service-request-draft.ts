import { requestAnswersError, type RequestField } from './service-request-schema';
export interface ServiceRequestDraft {
  businessId: string;
  formRevision?: number;
  fields?: RequestField[];
  answers?: Record<string, string>;
  offeringId: string | null;
  message: string;
  timing: string;
}
export function serviceRequestDraftError(
  draft: ServiceRequestDraft,
  offeringIds: readonly string[],
) {
  if (!draft.businessId) return 'Choose an available service business.';
  if (draft.offeringId && !offeringIds.includes(draft.offeringId))
    return 'Choose an available service.';
  if (draft.message.trim().length < 10 || draft.message.trim().length > 2000)
    return 'Describe what you need in 10–2000 characters.';
  if (draft.timing.trim().length > 200) return 'Keep preferred timing to 200 characters or fewer.';
  return requestAnswersError(draft.fields ?? [], draft.answers ?? {});
}
/** These explicit server rejections cannot have created a request. A lost response is uncertain. */
export function serviceRequestCanEditAfterFailure(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  return ['22023', 'P0002', '42501', '54000'].includes(code);
}
export function serviceRequestArguments(draft: ServiceRequestDraft, key: string) {
  return {
    ...(draft.formRevision
      ? { p_form_revision: draft.formRevision, p_answers: draft.answers ?? {} }
      : {}),
    p_business_id: draft.businessId,
    p_idempotency_key: key,
    p_request_message: draft.message.trim(),
    p_offering_item_id: draft.offeringId,
    p_preferred_timing: draft.timing.trim() || null,
  };
}
