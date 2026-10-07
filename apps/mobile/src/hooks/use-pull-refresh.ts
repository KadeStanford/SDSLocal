import { useCallback, useRef, useState } from 'react';

/** Only a user's pull gesture should activate the native refresh control. */
export function usePullRefresh(task: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const pending = useRef(false);
  const onRefresh = useCallback(async () => {
    if (pending.current) return;
    pending.current = true;
    setRefreshing(true);
    try {
      await task();
    } finally {
      pending.current = false;
      setRefreshing(false);
    }
  }, [task]);
  return { refreshing, onRefresh };
}
