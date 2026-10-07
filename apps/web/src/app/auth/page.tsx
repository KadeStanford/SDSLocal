import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

import { AuthForms } from './auth-forms';

export const metadata = { title: 'Sign in' };

export default async function AuthPage({ searchParams }: PageProps<'/auth'>) {
  const query = await searchParams;
  const requestedNext = typeof query.next === 'string' ? query.next : '/account';
  const next =
    requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/account';
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect(next);

  return (
    <main className="page-shell">
      <nav className="topbar">
        <Link className="brand" href="/">
          Parish Pass
        </Link>
        <Link href="/">Back home</Link>
      </nav>
      <div className="page-heading">
        <p className="eyebrow">Your local account</p>
        <h1>One account for customers and business owners.</h1>
      </div>
      <AuthForms next={next} />
    </main>
  );
}
