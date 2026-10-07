import { beforeEach, expect, it, vi } from 'vitest';
import { saveBusinessReviewReply } from './business-review-reply';
const rpc = vi.hoisted(() => vi.fn());
vi.mock('./supabase', () => ({ supabase: { rpc } }));
const input = {
  businessId: 'business',
  reviewId: 'review',
  source: 'order' as const,
  response: ' Thanks! ',
};
beforeEach(() => rpc.mockReset());
it.each(['order', 'event'] as const)(
  'confirms exact %s reply identity and normalized text',
  async (source) => {
    rpc.mockResolvedValue({
      data: {
        id: 'review',
        source,
        merchantResponse: 'Thanks!',
        respondedAt: '2026-09-28T12:00:00Z',
      },
      error: null,
    });
    expect(await saveBusinessReviewReply({ ...input, source })).toEqual({
      id: 'review',
      source,
      merchantResponse: 'Thanks!',
    });
    expect(rpc).toHaveBeenCalledWith('reply_to_business_review', {
      p_business_id: 'business',
      p_review_id: 'review',
      p_source: source,
      p_response: 'Thanks!',
    });
  },
);
it('preserves rejection for the caller instead of claiming a saved reply', async () => {
  const error = { code: '42501', message: 'Owner required' };
  rpc.mockResolvedValue({ data: null, error });
  await expect(saveBusinessReviewReply(input)).rejects.toEqual(error);
});
it.each([
  { id: 'other' },
  { source: 'event' },
  { merchantResponse: 'Changed' },
  { respondedAt: null },
])('rejects mismatched confirmation %o', async (patch) => {
  rpc.mockResolvedValue({
    data: {
      id: 'review',
      source: 'order',
      merchantResponse: 'Thanks!',
      respondedAt: '2026-09-28T12:00:00Z',
      ...patch,
    },
    error: null,
  });
  await expect(saveBusinessReviewReply(input)).rejects.toThrow('could not be confirmed');
});
it.each([' ', 'xy', 'x'.repeat(1501)])(
  'rejects invalid length before calling the server',
  async (response) => {
    await expect(saveBusinessReviewReply({ ...input, response })).rejects.toThrow('3 to 1,500');
    expect(rpc).not.toHaveBeenCalled();
  },
);
