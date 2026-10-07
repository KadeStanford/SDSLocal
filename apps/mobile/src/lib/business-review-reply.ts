import { supabase } from './supabase';
export async function saveBusinessReviewReply(input: {
  businessId: string;
  reviewId: string;
  source: 'order' | 'event';
  response: string;
}) {
  const text = input.response.trim();
  if (text.length < 3 || text.length > 1500)
    throw new Error('Your reply must contain 3 to 1,500 characters.');
  const { data, error } = await supabase.rpc('reply_to_business_review', {
    p_business_id: input.businessId,
    p_review_id: input.reviewId,
    p_source: input.source,
    p_response: text,
  });
  if (error) throw error;
  const reply = data as {
    id?: unknown;
    source?: unknown;
    merchantResponse?: unknown;
    respondedAt?: unknown;
  } | null;
  if (
    !reply ||
    reply.id !== input.reviewId ||
    reply.source !== input.source ||
    reply.merchantResponse !== text ||
    typeof reply.respondedAt !== 'string' ||
    !Number.isFinite(Date.parse(reply.respondedAt))
  ) {
    throw new Error(
      'Your response could not be confirmed. Your draft is still here. Refresh review status before retrying.',
    );
  }
  return { id: input.reviewId, source: input.source, merchantResponse: text };
}
