import { PageHeader } from '@/components/page-header';

import { adminSignOutAction } from './admin-auth-actions';
import { requireAdminPage, queueSnapshot } from '@/lib/admin/moderation-server';
import { demoConfigured } from '@/lib/admin/demo';
import { getSupabaseConfig } from '@/lib/supabase/config';
import { QUEUES, type QueueFilters } from '@/lib/admin/moderation-types';
import { ModerationWorkspace } from './moderation-workspace';
export const metadata = { title: { absolute: 'Moderation desk · Parish Pass' } };
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  await requireAdminPage();
  if (process.env.PARISH_ADMIN_LOGIN_ONLY === '1')
    return (
      <main className="page-shell">
        <PageHeader />
        <nav className="parish-page-links" aria-label="Page links">
          <form action={adminSignOutAction}>
            <button className="button button-secondary">Sign out</button>
          </form>
        </nav>
        <section className="panel" style={{ maxWidth: 720, margin: '48px auto' }}>
          <p className="eyebrow">Parish Pass / staging administration</p>
          <h1>Administrator access verified.</h1>
          <p>You are signed in with your existing account.</p>
          <p>
            The moderation workspace is waiting for the approved staging database update. Decisions
            are disabled until that update is activated.
          </p>
        </section>
      </main>
    );
  const query = await searchParams;
  const filters: QueueFilters = {
    kind: QUEUES.find((q) => q.kind === query.kind)?.kind ?? null,
    state: 'open',
    search: '',
    offset: 0,
  };
  let initial = null;
  let error: string | null = null;
  try {
    initial = await queueSnapshot(filters);
  } catch (cause) {
    error = cause instanceof Error ? cause.message : 'The moderation queues could not load.';
  }
  const environment = demoConfigured()
    ? 'Synthetic local'
    : `${process.env.NEXT_PUBLIC_APP_ENV ?? 'local'} / ${new URL(getSupabaseConfig().url).hostname}`;
  return (
    <ModerationWorkspace
      initial={initial}
      initialFilters={filters}
      initialError={error}
      demo={demoConfigured()}
      environment={environment}
    />
  );
}
