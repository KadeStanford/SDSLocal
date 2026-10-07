import { describe, expect, it, vi } from 'vitest';
import { waitForOrderConfirmation } from './order-confirmation';
describe('Server order confirmation', () => {
  it('waits through pending and network errors until canonical confirmation', async () => {
    const read = vi
      .fn()
      .mockResolvedValueOnce({ status: 'checkout_pending' })
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ status: 'placed' });
    expect(await waitForOrderConfirmation(read, { sleep: async () => {} })).toEqual({
      status: 'placed',
    });
    expect(read).toHaveBeenCalledTimes(3);
  });
  it('keeps a slow payment pending instead of inventing success or failure', async () => {
    let now = 0;
    const read = vi.fn(async () => {
      now += 12000;
      return { status: 'checkout_pending' };
    });
    expect(
      await waitForOrderConfirmation(read, {
        now: () => now,
        sleep: async (ms) => {
          now += ms;
        },
        budgetMs: 30000,
      }),
    ).toEqual({ status: 'checkout_pending' });
    expect(read).toHaveBeenCalledTimes(3);
  });
  it('stops after leaving the screen and preserves provider failure states', async () => {
    const read = vi.fn(async () => ({ status: 'checkout_failed' }));
    expect(await waitForOrderConfirmation(read, { active: () => false })).toBeNull();
    expect(read).not.toHaveBeenCalled();
    expect(await waitForOrderConfirmation(read)).toEqual({ status: 'checkout_failed' });
  });
});
