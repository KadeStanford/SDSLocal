import { describe, expect, it } from 'vitest';
import { requestActions, requestMatches, reviewKey, reviewMatches } from './merchant-inbox';

describe('merchant inbox categories and safe actions', () => {
  it('keeps cancelled and completed requests out of actionable inboxes', () => {
    for (const status of ['completed', 'cancelled', 'unknown']) {
      expect(requestActions(status)).toEqual([]);
      expect(requestMatches(status, 'new')).toBe(false);
      expect(requestMatches(status, 'progress')).toBe(false);
    }
    expect(requestMatches('completed', 'closed')).toBe(true);
    expect(requestMatches('cancelled', 'closed')).toBe(true);
    expect(requestMatches('unknown', 'closed')).toBe(false);
  });
  it('offers review before contact and never moves contacted requests back to review', () => {
    expect(requestActions('new').map((a) => a.status)).toEqual([
      'in_review',
      'contacted',
      'completed',
    ]);
    expect(requestActions('in_review').map((a) => a.status)).toEqual(['contacted', 'completed']);
    expect(requestActions('contacted').map((a) => a.status)).toEqual(['completed']);
  });
  it('distinguishes replies from unresponded reviews without mixing tables', () => {
    expect(reviewMatches(null, 'unanswered')).toBe(true);
    expect(reviewMatches('Thanks for visiting', 'replied')).toBe(true);
    expect(reviewMatches('Thanks for visiting', 'unanswered')).toBe(false);
    expect(reviewKey({ id: 'same-id', source: 'event' })).not.toEqual(
      reviewKey({ id: 'same-id', source: 'order' }),
    );
  });
});
