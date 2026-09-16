'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { createClient } from '@/lib/supabase/client';

export function AuthHashHandler() {
  const router = useRouter();

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hash.get('access_token');
    const refreshToken = hash.get('refresh_token');
    if (!accessToken || !refreshToken) return;

    // Remove credentials from the address bar before doing any asynchronous work.
    window.history.replaceState(null, '', '/account');

    void createClient()
      .auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then((result: { error: unknown }) => {
        if (result.error) {
          router.replace('/auth?error=session');
          return;
        }
        router.replace('/account');
        router.refresh();
      });
  }, [router]);

  return null;
}
