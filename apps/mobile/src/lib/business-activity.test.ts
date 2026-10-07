import { describe, it, expect } from 'vitest';
import { hasNewBusinessActivity, type ActivitySnapshot } from './business-activity';
describe('business attention chime', () => {
  const prior: ActivitySnapshot = { scope: 'owner:business:one', keys: ['request:r1'], orders: 2 };
  it('does not chime on initial load or a different account/business scope', () => {
    expect(hasNewBusinessActivity(null, prior)).toBe(false);
    expect(
      hasNewBusinessActivity(prior, { ...prior, scope: 'another', keys: ['request:r2'] }),
    ).toBe(false);
  });
  it('does not chime for duplicate refreshes or resolved work', () => {
    expect(hasNewBusinessActivity(prior, prior)).toBe(false);
    expect(hasNewBusinessActivity(prior, { ...prior, keys: [], orders: 1 })).toBe(false);
  });
  it('chimes for a newly arriving appointment, request, or increased order queue', () => {
    for (const key of ['appointment:a1', 'request:r2'])
      expect(hasNewBusinessActivity(prior, { ...prior, keys: [...prior.keys, key] })).toBe(true);
    expect(hasNewBusinessActivity(prior, { ...prior, orders: 3 })).toBe(true);
  });
});
