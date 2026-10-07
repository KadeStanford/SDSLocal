import { usePullRefresh } from './use-pull-refresh';
import { beforeEach, expect, it, vi } from 'vitest';
const hook = vi.hoisted(() => ({ value: false, pending: { current: false } }));
vi.mock('react', () => ({
  useState: () => [
    hook.value,
    (value: boolean) => {
      hook.value = value;
    },
  ],
  useRef: () => hook.pending,
  useCallback: (callback: unknown) => callback,
}));
beforeEach(() => {
  hook.value = false;
  hook.pending.current = false;
});
it('leaves background updates quiet and animates only a manual refresh until it completes', async () => {
  let finish!: () => void;
  const read = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const pull = usePullRefresh(read);
  const background = read();
  expect(hook.value).toBe(false);
  finish();
  await background;
  const manual = pull.onRefresh();
  expect(hook.value).toBe(true);
  await pull.onRefresh();
  expect(read).toHaveBeenCalledTimes(2);
  finish();
  await manual;
  expect(hook.value).toBe(false);
  expect(hook.pending.current).toBe(false);
});
it('stops the manual indicator after a failure and allows retry', async () => {
  const read = vi.fn().mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce(null);
  const pull = usePullRefresh(read);
  await expect(pull.onRefresh()).rejects.toThrow('Offline');
  expect(hook.value).toBe(false);
  await pull.onRefresh();
  expect(read).toHaveBeenCalledTimes(2);
  expect(hook.value).toBe(false);
});
