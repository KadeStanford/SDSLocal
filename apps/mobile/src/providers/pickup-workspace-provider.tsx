import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppState } from 'react-native';
import { useAuth } from './auth-provider';
import { useAppMode } from './app-mode-provider';
import { commerce } from '@/lib/square-commerce';
import { pickupDiscoveryEnabled } from '@/lib/pickup-discovery';
import { selectOperatorBusiness, type OperatorBusiness } from '@/lib/pickup-workspace';
const Context = createContext<{
  businesses: OperatorBusiness[];
  loading: boolean;
  error: string;
  selected: string | null;
  select: (id: string) => void;
  refresh: () => Promise<void>;
}>({
  businesses: [],
  loading: true,
  error: '',
  selected: null,
  select: () => {},
  refresh: async () => {},
});
export function PickupWorkspaceProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const { mode } = useAppMode();
  const userId = session?.user.id;
  const [snapshot, setSnapshot] = useState<{
    userId: string;
    businesses: OperatorBusiness[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const pending = useRef<number | null>(null);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    if (!userId || !pickupDiscoveryEnabled(process.env.EXPO_PUBLIC_APP_ENV)) {
      setSnapshot(null);
      setLoading(false);
      return;
    }
    const gen = generation.current;
    if (pending.current === gen) return;
    pending.current = gen;
    try {
      const result = await commerce<{ businesses: OperatorBusiness[] }>('operator_businesses', {});
      if (gen !== generation.current) return;
      setSnapshot({ userId, businesses: result.businesses });
      setError('');
      let saved: string | null = null;
      try {
        saved = globalThis.localStorage.getItem(`pickup-business:${userId}`);
      } catch {}
      setSelected((current) => selectOperatorBusiness(result.businesses, current, saved));
    } catch {
      if (gen === generation.current)
        setError('Pickup access could not refresh. Check your connection.');
    } finally {
      if (pending.current === gen) pending.current = null;
      if (gen === generation.current) setLoading(false);
    }
  }, [userId]);
  useEffect(() => {
    const gen = ++generation.current;
    const initial = setTimeout(() => {
      setLoading(true);
      void refresh();
    }, 0);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    const timer = setInterval(() => {
      if (AppState.currentState === 'active' && mode === 'business') void refresh();
    }, 30000);
    return () => {
      generation.current = gen + 1;
      clearTimeout(initial);
      sub.remove();
      clearInterval(timer);
    };
  }, [refresh, mode]);
  const businesses = snapshot && snapshot.userId === userId ? snapshot.businesses : [];
  return (
    <Context.Provider
      value={{
        businesses,
        loading,
        error,
        selected: selectOperatorBusiness(businesses, selected),
        refresh,
        select: (id) => {
          if (!businesses.some((b) => b.id === id)) return;
          setSelected(id);
          try {
            globalThis.localStorage.setItem(`pickup-business:${userId}`, id);
          } catch {}
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function usePickupWorkspace() {
  return useContext(Context);
}
