import { describe, expect, it } from 'vitest';
import { parseMerchantReviewReply, parsePickupReview, parseReviewReport } from './order-review.ts';

describe('verified pickup reviews', () => {
  it('validates stars and keeps written reviews bounded', () => {
    expect(parsePickupReview(5, ' Great service. ')).toEqual({ rating: 5, text: 'Great service.' });
    expect(parsePickupReview(4, '')).toEqual({ rating: 4, text: '' });
    expect(() => parsePickupReview(0, '')).toThrow();
    expect(() => parsePickupReview(6, '')).toThrow();
    expect(() => parsePickupReview(4.5, '')).toThrow();
    expect(() => parsePickupReview(5, 'x'.repeat(1201))).toThrow();
  });

  it('validates a merchant reply and customer report reason', () => {
    expect(parseMerchantReviewReply('Thanks for visiting!')).toBe('Thanks for visiting!');
    expect(() => parseMerchantReviewReply('x')).toThrow();
    expect(parseReviewReport('spam', 'This looks copied.')).toEqual({
      reason: 'spam',
      details: 'This looks copied.',
    });
    expect(() => parseReviewReport('personal', null)).toThrow();
    expect(() => parseReviewReport('spam', 'x')).toThrow();
  });
});
