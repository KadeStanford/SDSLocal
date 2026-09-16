'use client';

import { useEffect, useState } from 'react';

interface ActionNoticeProps {
  kind: 'error' | 'success';
  message: string;
}

export function ActionNotice({ kind, message }: ActionNoticeProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('error');
    url.searchParams.delete('saved');
    window.history.replaceState(
      window.history.state,
      '',
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`action-notice notice-${kind === 'success' ? 'success' : 'error'}`}
      role={kind === 'error' ? 'alert' : 'status'}
    >
      <span>{message}</span>
      <button
        aria-label="Dismiss message"
        className="action-notice-dismiss"
        onClick={() => setVisible(false)}
        type="button"
      >
        ×
      </button>
    </div>
  );
}
