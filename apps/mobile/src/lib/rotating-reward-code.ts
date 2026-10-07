export interface RewardCode {
  token: string;
  expiresAt: string;
}
/** Serialize refreshes, expire the displayed code, and ignore requests after dismissal. */
export function startRewardCodeRotation(
  fetchCode: () => Promise<RewardCode>,
  onCode: (code: RewardCode | null) => void,
  onError: (error: unknown) => void,
) {
  let stopped = false;
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;
  let expiryTimer: ReturnType<typeof setTimeout> | undefined;
  onCode(null);
  const refresh = async () => {
    try {
      const code = await fetchCode();
      if (stopped) return;
      const remaining = Date.parse(code.expiresAt) - Date.now();
      if (!code.token || !Number.isFinite(remaining) || remaining <= 0)
        throw new Error('The rewards code expired. Please retry.');
      clearTimeout(expiryTimer);
      onCode(code);
      expiryTimer = setTimeout(() => {
        if (!stopped) onCode(null);
      }, remaining);
      refreshTimer = setTimeout(
        () => void refresh(),
        Math.min(30_000, Math.max(1000, remaining - 5000)),
      );
    } catch (error) {
      if (stopped) return;
      clearTimeout(expiryTimer);
      onCode(null);
      onError(error);
      refreshTimer = setTimeout(() => void refresh(), 30_000);
    }
  };
  void refresh();
  return () => {
    stopped = true;
    clearTimeout(refreshTimer);
    clearTimeout(expiryTimer);
  };
}
