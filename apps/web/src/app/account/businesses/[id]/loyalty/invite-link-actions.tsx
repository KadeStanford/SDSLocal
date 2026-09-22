'use client';

import { useState } from 'react';

export function InviteLinkActions({ url }: { readonly url: string }) {
  const [status, setStatus] = useState<string | null>(null);

  async function copyLink() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.createElement('textarea');
        input.value = url;
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.focus();
        input.select();
        document.execCommand('copy');
        input.remove();
      }
      setStatus('Copied');
    } catch {
      setStatus('Select the link above to copy it.');
    }
  }

  async function shareLink() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'SDS Local staff invite',
          text: 'Join this business on SDS Local as a staff member:',
          url,
        });
        setStatus('Share menu opened');
        return;
      }
      await copyLink();
    } catch {
      // Dismissing the share sheet is not an error.
    }
  }

  return (
    <div className="inline-actions">
      <button className="button button-small" onClick={() => void shareLink()} type="button">
        Share link
      </button>
      <button
        className="button button-small button-secondary"
        onClick={() => void copyLink()}
        type="button"
      >
        Copy link
      </button>
      {status && <span className="field-hint">{status}</span>}
    </div>
  );
}
