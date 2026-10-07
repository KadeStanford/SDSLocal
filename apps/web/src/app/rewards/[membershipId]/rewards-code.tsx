'use client';
import { ActionButton } from '@/components/shared-ui';

import QRCode from 'qrcode';
import { AppIcon } from '@/components/app-icon';
import { useCallback, useEffect, useRef, useState } from 'react';

import { createClient } from '@/lib/supabase/client';

export function RewardsCode({ membershipId }: { readonly membershipId: string }) {
  const [token, setToken] = useState('');
  const [image, setImage] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [message, setMessage] = useState('Creating secure code…');

  const [unavailable, setUnavailable] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const requestRunning = useRef(false);
  const refresh = useCallback(async () => {
    if (requestRunning.current) return;
    requestRunning.current = true;
    setRefreshing(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke('loyalty-token', {
        body: { membershipId },
      });
      if (error || !data?.token) {
        let detail = error?.message ?? 'Could not create a loyalty code.';
        try {
          const context = error?.context as Response | undefined;
          const body = context ? await context.json() : null;
          if (body?.error) detail = body.error;
        } catch {
          // Keep the transport error when no JSON body is available.
        }
        setMessage(detail);
        setUnavailable(true);
        return;
      }
      setToken(data.token);
      setImage(
        await QRCode.toDataURL(data.token, { width: 360, margin: 2, errorCorrectionLevel: 'M' }),
      );
      setSeconds(Math.max(0, Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000)));
      setMessage('Show this rotating code to a staff member.');
      setUnavailable(false);
    } catch {
      setUnavailable(true);
      setMessage('Your rewards code could not load. Try again when your connection is available.');
    } finally {
      requestRunning.current = false;
      setRefreshing(false);
    }
  }, [membershipId]);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const refreshInterval = window.setInterval(() => void refresh(), 30_000);
    const countdownInterval = window.setInterval(
      () => setSeconds((current) => Math.max(0, current - 1)),
      1000,
    );
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(refreshInterval);
      window.clearInterval(countdownInterval);
    };
  }, [refresh]);

  return (
    <div className="rewards-code">
      {unavailable ? (
        <div className="rewards-code-unavailable" role="status">
          <AppIcon name="qr-code" size={32} />
          <strong>Rewards code unavailable</strong>
          <p>{message}</p>
          <ActionButton
            className="button-secondary"
            type="button"
            disabled={refreshing}
            onClick={() => void refresh()}
          >
            {refreshing ? 'Trying again…' : 'Try again'}
          </ActionButton>
        </div>
      ) : (
        <>
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="Secure rotating rewards QR code" />
          ) : (
            <div className="rewards-code-placeholder" />
          )}
          <p>{message}</p>
          {token && <strong>Refreshes automatically · {seconds}s</strong>}
          {token && (
            <details>
              <summary>Desktop testing code</summary>
              <textarea readOnly value={token} rows={4} aria-label="Desktop testing loyalty code" />
            </details>
          )}
        </>
      )}
    </div>
  );
}
