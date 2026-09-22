import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

import { sendBusinessUpdateAction } from './actions';

interface BusinessRow {
  id: string;
  name: string;
  slug: string;
  status: string;
}

interface UpdateRow {
  id: string;
  update_type: 'announcement' | 'deal';
  title: string;
  body: string;
  expires_at: string | null;
  created_at: string;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export const metadata = { title: 'Follower updates' };

export default async function BusinessUpdatesPage({
  params,
  searchParams,
}: PageProps<'/account/businesses/[id]/updates'>) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect('/auth');

  const { data: membership } = await supabase
    .from('business_members')
    .select('businesses(id, name, slug, status)')
    .eq('business_id', id)
    .eq('user_id', authData.user.id)
    .eq('role', 'owner')
    .eq('is_active', true)
    .maybeSingle();
  const joined = membership?.businesses;
  const business = (Array.isArray(joined) ? joined[0] : joined) as BusinessRow | undefined;
  if (!business) notFound();

  const { data } = await supabase
    .from('business_updates')
    .select('id, update_type, title, body, expires_at, created_at')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false })
    .limit(20);
  const updates = (data ?? []) as UpdateRow[];

  return (
    <main className="page-shell narrow-shell">
      <nav className="topbar">
        <Link className="brand" href="/account">
          ← Account
        </Link>
        <div className="nav-actions">
          <Link href={`/account/businesses/${business.id}/settings`}>Business details</Link>
          <Link href={`/b/${business.slug}`}>View page</Link>
        </div>
      </nav>

      <div className="page-heading compact-heading">
        <p className="eyebrow">Follower updates</p>
        <h1>{business.name}</h1>
        <p>
          Send a useful announcement or special offer to followers who have enabled general updates.
          New published events already send their own event alert.
        </p>
      </div>

      {typeof query.saved === 'string' && <p className="notice-success">{query.saved}</p>}
      {typeof query.error === 'string' && <p className="notice-error">{query.error}</p>}

      <section className="panel business-update-compose">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Compose</p>
            <h2>Send an update</h2>
          </div>
          <span
            className={
              business.status === 'active' ? 'event-status-published' : 'event-status-draft'
            }
          >
            {business.status === 'active' ? 'Live' : 'Needs approval'}
          </span>
        </div>
        <form action={sendBusinessUpdateAction} className="form-stack">
          <input name="businessId" type="hidden" value={business.id} />
          <label>
            Update type
            <select defaultValue="announcement" name="updateType">
              <option value="announcement">Announcement</option>
              <option value="deal">Special offer</option>
            </select>
          </label>
          <label>
            Title
            <input
              maxLength={120}
              name="title"
              placeholder="We’re open late this Friday"
              required
            />
          </label>
          <label>
            Message
            <textarea
              maxLength={500}
              name="body"
              placeholder="Tell followers what changed and what they should know."
              required
              rows={5}
            />
          </label>
          <label>
            Optional expiration
            <input name="expiresAt" type="datetime-local" />
            <span className="field-hint">
              Expired offers stop being delivered and remain in your history.
            </span>
          </label>
          <button className="button" disabled={business.status !== 'active'}>
            Send to followers
          </button>
          {business.status !== 'active' && (
            <p className="field-hint">
              Your business must be approved before follower alerts can be sent.
            </p>
          )}
        </form>
      </section>

      <section className="panel business-update-history">
        <div className="section-heading">
          <div>
            <p className="eyebrow">History</p>
            <h2>Recent updates</h2>
          </div>
        </div>
        {updates.length ? (
          <div className="business-update-list">
            {updates.map((update) => (
              <article key={update.id}>
                <div className="event-card-meta">
                  <span>{update.update_type === 'deal' ? 'Special offer' : 'Announcement'}</span>
                  <span>{formatDate(update.created_at)}</span>
                </div>
                <h3>{update.title}</h3>
                <p>{update.body}</p>
                {update.expires_at && <small>Expires {formatDate(update.expires_at)}</small>}
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>No follower updates yet</strong>
            <span>Announcements and special offers you send will appear here.</span>
          </div>
        )}
      </section>
    </main>
  );
}
