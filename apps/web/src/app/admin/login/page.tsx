import { PageHeader } from '@/components/page-header';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { adminSignOutAction } from '../admin-auth-actions';
import { AdminLoginForm } from './admin-login-form';
export const metadata = { title: { absolute: 'Admin sign in · Parish Pass' } };
export default async function AdminLoginPage() {
  const client = await createClient();
  const { data, error } = await client.auth.getUser();
  const user = error ? null : data.user;
  if (user) {
    const admin = await client.rpc('is_platform_admin');
    if (!admin.error && admin.data === true) redirect('/admin');
  }
  return (
    <main className="page-shell">
      <PageHeader backHref="/" backLabel="Back" />
      <nav className="parish-page-links" aria-label="Page links">
        <span>Administration</span>
      </nav>
      <section className="panel" style={{ maxWidth: 520, margin: '48px auto' }}>
        <header className="admin-login-heading">
          <p className="eyebrow">Parish Pass / administration</p>
          <h1>Admin sign in</h1>
        </header>
        {user ? (
          <>
            <p role="alert">This account does not have administrator access.</p>
            <form action={adminSignOutAction}>
              <button className="button">Sign out and use another account</button>
            </form>
          </>
        ) : (
          <>
            <p>
              Use your existing Parish Pass account. Administrator access is checked after you sign
              in.
            </p>
            <AdminLoginForm />
          </>
        )}
      </section>
    </main>
  );
}
