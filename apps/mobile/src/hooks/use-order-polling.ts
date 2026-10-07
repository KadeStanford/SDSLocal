import { useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { pickupError } from '@/lib/pickup-workspace';
/** One bounded request at a time, polling only while focused and foregrounded. */
export function useOrderPolling<T>(key: string, read: () => Promise<T>, pollUpdates = true) {
  const [snapshot, setSnapshot] = useState<{ key: string; data: T; at: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [denied, setDenied] = useState(false);
  const generation = useRef(0);
  const pending = useRef<{ gen: number; task: Promise<T | null> } | null>(null);
  const updateData = useCallback(
    (update: (data: T) => T) => {
      // A request started before a saved mutation must not replace its response.
      generation.current++;
      setSnapshot((old) =>
        old?.key === key ? { ...old, data: update(old.data), at: Date.now() } : old,
      );
      setLoading(false);
      setError('');
    },
    [key],
  );
  const refresh = useCallback(
    async (force = false) => {
      while (pending.current?.gen === generation.current) {
        const result = await pending.current.task;
        if (!force) return result;
      }
      const gen = generation.current;
      setLoading(true);
      const task = (async () => {
        try {
          const data = await read();
          if (gen === generation.current) {
            setSnapshot({ key, data, at: Date.now() });
            setError('');
            setDenied(false);
            return data;
          }
          return null;
        } catch (e) {
          if (gen === generation.current) {
            const forbidden = [
              'OPERATOR_REQUIRED',
              'OWNER_REQUIRED',
              'SIGN_IN',
              'NOT_FOUND',
            ].includes((e as { code?: string }).code ?? '');
            if (forbidden) setSnapshot(null);
            setDenied(forbidden);
            setError(pickupError(e));
          }
          return null;
        } finally {
          if (gen === generation.current) setLoading(false);
          if (pending.current?.gen === gen) pending.current = null;
        }
      })();
      pending.current = { gen, task };
      return await task;
    },
    [key, read],
  );
  useFocusEffect(
    useCallback(() => {
      generation.current++;
      let active = true;
      let polling = false;
      let timer: ReturnType<typeof setTimeout>;
      const poll = async () => {
        if (!active || polling) return;
        polling = true;
        if (AppState.currentState === 'active') await refresh();
        polling = false;
        if (active && pollUpdates) timer = setTimeout(() => void poll(), 20000);
      };
      void poll();
      const sub = AppState.addEventListener('change', (s) => {
        if (s === 'active') {
          clearTimeout(timer);
          void poll();
        }
      });
      return () => {
        active = false;
        generation.current++;
        clearTimeout(timer);
        sub.remove();
      };
    }, [refresh, pollUpdates]),
  );
  return {
    data: snapshot?.key === key ? snapshot.data : null,
    lastUpdated: snapshot?.key === key ? snapshot.at : null,
    loading: loading || ((!snapshot || snapshot.key !== key) && !error),
    error,
    denied,
    refresh,
    setError,
    updateData,
  };
}
