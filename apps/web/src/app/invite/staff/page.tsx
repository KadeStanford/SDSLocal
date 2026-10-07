import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

import { acceptStaffInviteAction } from './actions';

export const metadata = { title: 'Staff invite' };

export default async function StaffInvitePage({ searchParams }: PageProps<'/invite/staff'>) {
  const query = await searchParams;
  const token = typeof query.token === 'string' ? query.token : '';
  const error = typeof query.error === 'string' ? query.error : null;
  if (!token) {
    return (
      <main className="page-shell narrow-shell">
        <nav className="topbar">
          <Link className="brand" href="/">
            Parish Pass
          </Link>
        </nav>
        <div className="page-heading compact-heading">
          <p className="eyebrow">Staff invite</p>
          <h1>This invite link is incomplete.</h1>
          <p>Ask the business owner to send you a fresh invite link.</p>
        </div>
      </main>
    );
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    redirect(`/auth?next=${encodeURIComponent(`/invite/staff?token=${token}`)}`);
  }

  return (
    <main className="page-shell narrow-shell">
      <nav className="topbar">
        <Link className="brand" href="/">
          Parish Pass
        </Link>
        <Link href="/account">Account</Link>
      </nav>
      <div className="page-heading compact-heading">
        <p className="eyebrow">Staff invite</p>
        <h1>You’re invited to join a business.</h1>
        <p>
          Accept this invite to get secure Staff Scan access. Your account can be new or existing;
          access is granted only to the business that sent this link.
        </p>
      </div>
      {error && <p className="notice-error">{error}</p>}
      <section className="panel form-stack">
        <p className="muted">Signed in as {authData.user.email ?? 'your account'}</p>
        <form action={acceptStaffInviteAction}>
          <input type="hidden" name="token" value={token} />
          <button className="button">Accept staff invite</button>
        </form>
      </section>
    </main>
  );
}
