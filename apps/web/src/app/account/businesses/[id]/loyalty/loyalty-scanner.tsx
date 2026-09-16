'use client';

import { useState } from 'react';

import { createClient } from '@/lib/supabase/client';

export function LoyaltyScanner() {
  const [token, setToken] = useState('');
  const [action, setAction] = useState<'stamp' | 'redemption'>('stamp');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function processCode() {
    if (!token.trim()) {
      setMessage('Scan or paste a customer rewards code first.');
      return;
    }
    setBusy(true);
    setMessage('Validating secure code…');
    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke('loyalty-transact', {
      body: { token: token.trim(), action, idempotencyKey: crypto.randomUUID() },
    });
    if (error) {
      let detail = error.message;
      try {
        const context = error.context as Response | undefined;
        const body = context ? await context.json() : null;
        if (body?.error) detail = body.error;
      } catch {
        // Keep the transport error when the response has no JSON body.
      }
      setMessage(detail);
    } else {
      const loyalty = data?.loyalty;
      setMessage(
        action === 'stamp'
          ? `Stamp added. Progress: ${loyalty?.progressStamps ?? 0}/${loyalty?.stampsRequired ?? 0}.`
          : `Reward redeemed. ${loyalty?.rewardsReady ?? 0} reward(s) remain.`,
      );
      setToken('');
    }
    setBusy(false);
  }

  return (
    <div className="form-stack compact-form">
      <p className="muted">
        The mobile app scans the QR with the camera. For desktop testing, paste the code shown below
        the customer QR.
      </p>
      <label>
        Customer rewards code
        <textarea value={token} onChange={(event) => setToken(event.target.value)} rows={4} />
      </label>
      <label>
        Staff action
        <select value={action} onChange={(event) => setAction(event.target.value as typeof action)}>
          <option value="stamp">Add one visit stamp</option>
          <option value="redemption">Redeem one ready reward</option>
        </select>
      </label>
      <button className="button" type="button" disabled={busy} onClick={() => void processCode()}>
        {busy ? 'Processing…' : action === 'stamp' ? 'Add stamp' : 'Redeem reward'}
      </button>
      <p className="form-status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
