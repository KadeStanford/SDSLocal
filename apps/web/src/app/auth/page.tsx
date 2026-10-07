import { PageHeader } from '@/components/page-header';

import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { safeAuthNext } from '@/lib/auth-next';

import { AuthForms } from './auth-forms';

export const metadata = { title: 'Sign in' };

export default async function AuthPage({ searchParams }: PageProps<'/auth'>) {
  const query = await searchParams;
  const requestedNext = typeof query.next === 'string' ? query.next : '/account';
  const next = safeAuthNext(requestedNext);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect(next);

  return (
    <main className="page-shell narrow-shell account-auth-page">
      <PageHeader backHref="/" backLabel="Back" />
      <div className="page-heading">
        <h1>Your Parish Pass account</h1>
        <p>Keep your favorites, rewards and business tools together.</p>
      </div>
      <AuthForms next={next} />
    </main>
  );
}
