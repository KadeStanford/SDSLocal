import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { supabase } from '@/lib/supabase';
import { getSecureStorageWarning, subscribeToSecureStorageWarning } from '@/lib/auth-storage';
import { clearBiometricSignInRefreshToken } from '@/lib/biometric-auth';

interface AuthContextValue {
  readonly session: Session | null;
  readonly loading: boolean;
  readonly secureStorageWarning: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [secureStorageWarning, setSecureStorageWarning] = useState(getSecureStorageWarning);

  useEffect(() => {
    const unsubscribeStorageWarning = subscribeToSecureStorageWarning(setSecureStorageWarning);
    // Biometrics are intentionally disabled in the current product flow. Clear
    // any credentials left by an older build before loading the session.
    void clearBiometricSignInRefreshToken();

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
        setLoading(false);
      })
      .catch(() => {
        setSession(null);
        setSecureStorageWarning(getSecureStorageWarning());
        setLoading(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setSecureStorageWarning(getSecureStorageWarning());
      setLoading(false);
    });

    return () => {
      unsubscribeStorageWarning();
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({ session, loading, secureStorageWarning }),
    [session, loading, secureStorageWarning],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
