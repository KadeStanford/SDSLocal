import Link from 'next/link';
import { BrandWordmark } from './brand-wordmark';
import { AppIcon } from './app-icon';

/** Server-renderable navigation only. Forms and guarded decisions stay with their callers. */
export function PageHeader({
  backHref,
  backLabel = 'Back',
  alertsCurrent = false,
}: {
  backHref?: string;
  backLabel?: string;
  alertsCurrent?: boolean;
}) {
  return (
    <nav
      className="parish-page-header"
      aria-label="Parish Pass navigation"
      data-testid="parish-page-header"
    >
      {backHref && (
        <Link className="parish-header-back" href={backHref} aria-label={backLabel}>
          <AppIcon name="chevron-left" size={20} />
        </Link>
      )}
      <Link href="/" className="parish-header-brand" aria-label="Parish Pass home">
        <BrandWordmark />
      </Link>
      <Link
        className="parish-header-alerts"
        href="/account/moderation"
        aria-label="Account alerts"
        aria-current={alertsCurrent ? 'page' : undefined}
      >
        <AppIcon name="bell" size={22} />
      </Link>
    </nav>
  );
}
