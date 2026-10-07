import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

/** Explicit button type keeps presentation refactors from changing form transport. */
export function ActionButton({
  children,
  className = '',
  type = 'button',
  busy = false,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  return (
    <button
      {...props}
      type={type}
      className={'button ' + className}
      aria-busy={busy || undefined}
      disabled={disabled || busy}
    >
      {children}
    </button>
  );
}

/** Shared state/panel geometry while preserving section semantics and accessible roles. */
export function SurfacePanel({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return (
    <section {...props} className={'panel ' + className}>
      {children}
    </section>
  );
}
