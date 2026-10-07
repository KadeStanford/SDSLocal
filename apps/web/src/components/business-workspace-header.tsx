import { PageHeader } from '@/components/page-header';
import Link from 'next/link';

import { AppIcon } from './app-icon';

const tools = [
  ['settings', 'Details', 'settings'],
  ['offerings', 'Offerings', 'utensils'],
  ['media', 'Photos', 'image'],
  ['events', 'Events', 'calendar-days'],
  ['loyalty', 'Rewards', 'gift'],
  ['updates', 'Updates', 'megaphone'],
] as const;
type Section = (typeof tools)[number][0];

export function BusinessWorkspaceHeader({
  id,
  name,
  slug,
  section,
  title,
  description,
  utility,
  canManage = true,
}: {
  id: string;
  name: string;
  slug: string;
  section: Section;
  title: string;
  description: string;
  utility?: { href: string; label: string };
  canManage?: boolean;
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
  return (
    <>
      <PageHeader backHref="/account" backLabel="Back" />
      <nav className="parish-page-links" aria-label="Page links">
        <div className="nav-actions">
          {utility && <Link href={utility.href}>{utility.label}</Link>}
          <Link className="button button-secondary button-small" href={`/b/${slug}`}>
            View business page
            <AppIcon name="arrow-up-right" size={18} />
          </Link>
        </div>
      </nav>
      <div className="workspace-context">
        <span className="workspace-initial" aria-hidden="true">
          {initials}
        </span>
        <div>
          <span className="workspace-context-label">Business workspace</span>
          <strong>{name}</strong>
        </div>
        <Link href="/account">
          Switch business
          <AppIcon name="chevron-down" size={17} />
        </Link>
      </div>
      <nav className="workspace-tools" aria-label={`${name} tools`}>
        {tools
          .filter(([key]) => canManage || key === 'loyalty')
          .map(([key, label, icon]) => (
            <Link
              key={key}
              href={`/account/businesses/${id}/${key}`}
              aria-current={key === section ? 'page' : undefined}
            >
              <AppIcon name={icon} size={20} />
              <span>{label}</span>
            </Link>
          ))}
      </nav>
      <header className="workspace-heading">
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
    </>
  );
}
