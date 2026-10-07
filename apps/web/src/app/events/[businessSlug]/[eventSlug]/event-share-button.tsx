'use client';
import { ActionButton } from '@/components/shared-ui';

import { useState } from 'react';

export function EventShareButton({ title }: { readonly title: string }) {
  const [message, setMessage] = useState('');

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, url: window.location.href });
        setMessage('Shared.');
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setMessage('Link copied.');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setMessage('Copy the address from your browser to share this event.');
    }
  };

  return (
    <>
      <ActionButton className="button-secondary" type="button" onClick={() => void share()}>
        Share
      </ActionButton>
      <span className="field-hint" aria-live="polite">
        {message}
      </span>
    </>
  );
}
