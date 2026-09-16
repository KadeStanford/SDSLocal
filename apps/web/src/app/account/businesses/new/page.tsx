import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

import { BusinessForm } from './business-form';

interface CategoryRow {
  id: number;
  name: string;
  business_type: string | null;
}

export const metadata = { title: 'Create a business' };

export default async function NewBusinessPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect('/auth');

  const { data } = await supabase
    .from('categories')
    .select('id, name, business_type')
    .eq('is_active', true)
    .order('display_order');

  return (
    <main className="page-shell narrow-shell">
      <nav className="topbar">
        <Link className="brand" href="/">
          SDS Local
        </Link>
        <Link href="/account">Cancel</Link>
      </nav>
      <div className="page-heading compact-heading">
        <p className="eyebrow">Business onboarding</p>
        <h1>Create your business page.</h1>
        <p>It starts as a private draft. Photos and the final page preview come next.</p>
      </div>
      <section className="panel">
        <BusinessForm categories={(data ?? []) as CategoryRow[]} />
      </section>
    </main>
  );
}
