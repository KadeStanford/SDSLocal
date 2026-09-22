'use client';

import { useState } from 'react';

import { createClient } from '@/lib/supabase/client';

export function LoyaltyScanner() {
  const [token, setToken] = useState('');
  const [action, setAction] = useState<'stamp' | 'earn_points' | 'redemption'>('stamp');
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function processCode() {
    if (!token.trim()) {
      setMessage('Scan or paste a customer rewards code first.');
      return;
    }
    if (
      action === 'earn_points' &&
      (!Number.isFinite(Number(purchaseAmount)) || Number(purchaseAmount) <= 0)
    ) {
      setMessage('Enter the purchase total before adding points.');
      return;
    }
    setBusy(true);
    setMessage('Validating secure code…');
    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke('loyalty-transact', {
      body: {
        token: token.trim(),
        action,
        purchaseAmountMinor:
          action === 'earn_points' ? Math.round(Number(purchaseAmount) * 100) : undefined,
        idempotencyKey: crypto.randomUUID(),
      },
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
          : action === 'earn_points'
            ? `${loyalty?.pointsAwarded ?? 0} points added. ${loyalty?.availablePoints ?? 0} available.`
            : `Reward redeemed. ${loyalty?.rewardsReady ?? 0} reward(s) remain.`,
      );
      setToken('');
      if (action === 'earn_points') setPurchaseAmount('');
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
          <option value="earn_points">Add points from a purchase</option>
          <option value="redemption">Redeem one ready reward</option>
        </select>
      </label>
      {action === 'earn_points' && (
        <label>
          Purchase total
          <input
            inputMode="decimal"
            min="0.01"
            step="0.01"
            type="number"
            value={purchaseAmount}
            onChange={(event) => setPurchaseAmount(event.target.value)}
            placeholder="25.00"
          />
        </label>
      )}
      <button className="button" type="button" disabled={busy} onClick={() => void processCode()}>
        {busy
          ? 'Processing…'
          : action === 'stamp'
            ? 'Add stamp'
            : action === 'earn_points'
              ? 'Add points'
              : 'Redeem reward'}
      </button>
      <p className="form-status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
