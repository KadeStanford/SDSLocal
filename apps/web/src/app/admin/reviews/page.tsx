import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

import { ActionNotice } from './action-notice';
import { approveBusinessAction, rejectBusinessAction } from './actions';

interface PendingBusiness {
  id: string;
  name: string;
  slug: string;
  description: string;
  city: string | null;
  region_code: string | null;
  submitted_at: string | null;
}

interface ReadinessResult {
  ready: boolean;
  checks: { key: string; label: string; complete: boolean }[];
}

export default async function ReviewQueuePage({ searchParams }: PageProps<'/admin/reviews'>) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect('/auth');
  const { data: isAdmin } = await supabase.rpc('is_platform_admin');
  if (isAdmin !== true) notFound();

  const { data } = await supabase
    .from('businesses')
    .select('id, name, slug, description, city, region_code, submitted_at')
    .eq('status', 'pending_review')
    .order('submitted_at');
  const businesses = (data ?? []) as PendingBusiness[];
  const readiness = await Promise.all(
    businesses.map(async (business) => {
      const { data: result } = await supabase.rpc('get_business_readiness', {
        p_business_id: business.id,
      });
      return [business.id, result as ReadinessResult | null] as const;
    }),
  );
  const readinessByBusiness = new Map(readiness);

  return (
    <main className="page-shell narrow-shell">
      <nav className="topbar">
        <Link className="brand" href="/account">
          ← Account
        </Link>
      </nav>
      <div className="page-heading compact-heading">
        <p className="eyebrow">SDS administration</p>
        <h1>Business review queue</h1>
        <p>Approve complete profiles or return them with a specific correction request.</p>
      </div>

      {typeof query.saved === 'string' && <ActionNotice kind="success" message={query.saved} />}
      {typeof query.error === 'string' && <ActionNotice kind="error" message={query.error} />}

      <div className="review-queue">
        {businesses.map((business) => {
          const status = readinessByBusiness.get(business.id);
          return (
            <article className="panel review-card" key={business.id}>
              <div className="section-heading">
                <div>
                  <h2>{business.name}</h2>
                  <p className="muted">
                    {business.city && business.region_code
                      ? `${business.city}, ${business.region_code}`
                      : 'Location not shown'}
                  </p>
                </div>
                <Link href={`/b/${business.slug}`}>Open preview</Link>
              </div>
              <p>{business.description}</p>
              <ul className="readiness-list compact-readiness-list">
                {(status?.checks ?? []).map((check) => (
                  <li className={check.complete ? 'readiness-complete' : ''} key={check.key}>
                    <span aria-hidden="true">{check.complete ? '✓' : '○'}</span>
                    {check.label}
                  </li>
                ))}
              </ul>
              <div className="review-actions">
                <form action={approveBusinessAction}>
                  <input type="hidden" name="businessId" value={business.id} />
                  <button className="button" disabled={!status?.ready}>
                    Approve and publish
                  </button>
                </form>
                <form action={rejectBusinessAction} className="review-reject-form">
                  <input type="hidden" name="businessId" value={business.id} />
                  <label>
                    Correction requested
                    <textarea name="feedback" minLength={10} maxLength={1000} rows={3} required />
                  </label>
                  <button className="button button-secondary">Return to draft</button>
                </form>
              </div>
            </article>
          );
        })}
        {!businesses.length && (
          <div className="empty-state">
            <strong>No businesses waiting</strong>
            <span>New submissions will appear here.</span>
          </div>
        )}
      </div>
    </main>
  );
}
