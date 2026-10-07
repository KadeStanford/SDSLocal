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
import { supabase } from '@/lib/supabase';
import { useAuth } from './auth-provider';
import { useAppMode } from './app-mode-provider';
export interface ServiceBusiness {
  id: string;
  name: string;
  timezone: string;
  business_type: string;
}
const Context = createContext<{
  businesses: ServiceBusiness[];
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
}>({ businesses: [], loading: true, error: '', refresh: async () => {} });
export function ServiceOperationsProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const { mode } = useAppMode();
  const userId = session?.user.id;
  const [snapshot, setSnapshot] = useState<{
    userId: string;
    businesses: ServiceBusiness[];
  } | null>(null);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const n = ++generation.current;
    if (!userId || mode !== 'business') {
      setSnapshot(null);
      setLoading(false);
      return;
    }
    try {
      const result = await supabase
        .from('business_members')
        .select('businesses(id,name,timezone,business_type)')
        .eq('user_id', userId)
        .eq('is_active', true)
        .eq('role', 'owner');
      if (n !== generation.current) return;
      if (result.error) throw result.error;
      const businesses = (result.data ?? [])
        .flatMap((row) =>
          Array.isArray(row.businesses) ? row.businesses : row.businesses ? [row.businesses] : [],
        )
        .filter((b) => b.business_type === 'services')
        .sort((a, b) => a.name.localeCompare(b.name));
      setSnapshot({ userId, businesses });
      setError('');
    } catch {
      if (n === generation.current) setError('Business access could not refresh.');
    } finally {
      if (n === generation.current) setLoading(false);
    }
  }, [userId, mode]);
  useEffect(() => {
    // Capture the request-version ref object used to invalidate pending reads.
    const generationForCleanup = generation;

    const timer = setTimeout(() => void refresh(), 0);
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => {
      clearTimeout(timer);
      listener.remove();
      generationForCleanup.current++;
    };
  }, [refresh]);
  return (
    <Context.Provider
      value={{
        businesses:
          snapshot && snapshot.userId === userId && mode === 'business' ? snapshot.businesses : [],
        loading,
        error,
        refresh,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useServiceOperations = () => useContext(Context);
