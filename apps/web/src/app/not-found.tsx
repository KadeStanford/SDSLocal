import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { SurfacePanel } from '@/components/shared-ui';

export default function NotFound() {
  return (
    <main className="page-shell narrow-shell">
      <PageHeader backHref="/" backLabel="Back to home" />
      <SurfacePanel>
        <h1>This page is unavailable.</h1>
        <p>We couldn’t find the page for this link.</p>
        <Link href="/explore" className="button">
          Explore businesses
        </Link>
      </SurfacePanel>
    </main>
  );
}
