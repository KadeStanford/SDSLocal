'use client';

import QRCode from 'qrcode';
import { useCallback, useEffect, useState } from 'react';

import { createClient } from '@/lib/supabase/client';

export function RewardsCode({ membershipId }: { readonly membershipId: string }) {
  const [token, setToken] = useState('');
  const [image, setImage] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [message, setMessage] = useState('Creating secure code…');

  const refresh = useCallback(async () => {
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
      return;
    }
    setToken(data.token);
    setImage(
      await QRCode.toDataURL(data.token, { width: 360, margin: 2, errorCorrectionLevel: 'M' }),
    );
    setSeconds(Math.max(0, Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000)));
    setMessage('Show this rotating code to a staff member.');
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
    </div>
  );
}
