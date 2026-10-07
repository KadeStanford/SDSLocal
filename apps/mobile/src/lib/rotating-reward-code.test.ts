import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { startRewardCodeRotation, type RewardCode } from './rotating-reward-code';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-28T12:00:00Z'));
});
afterEach(() => {
  vi.useRealTimers();
});
const freshCode = (): RewardCode => ({
  token: 'fresh',
  expiresAt: new Date(Date.now() + 45_000).toISOString(),
});
it('clears an expired code while a slow refresh is pending, without overlapping requests', async () => {
  let finish!: (code: RewardCode) => void;
  const fetchCode = vi
    .fn()
    .mockResolvedValueOnce(freshCode())
    .mockImplementationOnce(
      () =>
        new Promise<RewardCode>((resolve) => {
          finish = resolve;
        }),
    );
  const shown = vi.fn(),
    error = vi.fn();
  const stop = startRewardCodeRotation(fetchCode, shown, error);
  await vi.advanceTimersByTimeAsync(30_000);
  expect(fetchCode).toHaveBeenCalledTimes(2);
  expect(shown).toHaveBeenLastCalledWith(expect.objectContaining({ token: 'fresh' }));
  await vi.advanceTimersByTimeAsync(60_000);
  expect(shown).toHaveBeenLastCalledWith(null);
  expect(fetchCode).toHaveBeenCalledTimes(2);
  finish(freshCode());
  await vi.advanceTimersByTimeAsync(0);
  expect(shown).toHaveBeenLastCalledWith(expect.objectContaining({ token: 'fresh' }));
  expect(error).not.toHaveBeenCalled();
  stop();
});
it('clears the previous code on failure and retries after recovery', async () => {
  const fetchCode = vi
    .fn()
    .mockResolvedValueOnce(freshCode())
    .mockRejectedValueOnce(new Error('Offline'))
    .mockImplementationOnce(async () => freshCode());
  const shown = vi.fn(),
    error = vi.fn();
  const stop = startRewardCodeRotation(fetchCode, shown, error);
  await vi.advanceTimersByTimeAsync(30_000);
  expect(shown).toHaveBeenLastCalledWith(null);
  expect(error).toHaveBeenCalledOnce();
  await vi.advanceTimersByTimeAsync(30_000);
  expect(fetchCode).toHaveBeenCalledTimes(3);
  expect(shown).toHaveBeenLastCalledWith(expect.objectContaining({ token: 'fresh' }));
  stop();
});
it('ignores a pending result after dismissal and stops all timers', async () => {
  let finish!: (code: RewardCode) => void;
  const fetchCode = vi.fn(
    () =>
      new Promise<RewardCode>((resolve) => {
        finish = resolve;
      }),
  );
  const shown = vi.fn(),
    error = vi.fn();
  const stop = startRewardCodeRotation(fetchCode, shown, error);
  stop();
  finish(freshCode());
  await vi.advanceTimersByTimeAsync(120_000);
  expect(shown.mock.calls).toEqual([[null]]);
  expect(fetchCode).toHaveBeenCalledOnce();
  expect(error).not.toHaveBeenCalled();
});
it.each(['not-a-date', '2026-09-28T11:59:59Z'])(
  'rejects invalid or already expired expiry %s',
  async (expiresAt) => {
    const shown = vi.fn(),
      error = vi.fn();
    const stop = startRewardCodeRotation(
      async () => ({ token: 'expired', expiresAt }),
      shown,
      error,
    );
    await vi.advanceTimersByTimeAsync(0);
    expect(shown).toHaveBeenLastCalledWith(null);
    expect(error).toHaveBeenCalledOnce();
    stop();
  },
);
