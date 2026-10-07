import { SurfacePanel } from '@/components/shared-ui';
import { PageHeader } from '@/components/page-header';

import { AppIcon } from '@/components/app-icon';

import { OpenInApp } from '@/components/open-in-app';
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

  const { data: billingData, error: billingError } = await supabase.rpc('get_my_listing_billing');
  const billing = billingData as {
    billingEnabled?: boolean;
    canPublish?: boolean;
    availableListings?: number;
  } | null;
  const canCreate =
    !billingError &&
    billing != null &&
    (billing.billingEnabled === false ||
      (billing.billingEnabled === true &&
        billing.canPublish === true &&
        (billing.availableListings ?? 0) > 0));
  const creationMessage =
    billingError || !billing
      ? 'Your subscription could not be checked. Refresh this page to try again.'
      : billing.canPublish && (billing.availableListings ?? 0) <= 0
        ? 'Your subscription has no available business slots. Manage your existing businesses in the app before creating another.'
        : 'Choose a business subscription in the iOS or Android app before creating a business. Sign in with this same account, then return here after activation.';

  const { data } = await supabase
    .from('categories')
    .select('id, name, business_type')
    .eq('is_active', true)
    .order('display_order');

  return (
    <main className="page-shell narrow-shell">
      <PageHeader backHref="/account" backLabel="Back" />
      <nav className="parish-page-links" aria-label="Page links">
        <Link href="/account">
          <AppIcon name="circle-user-round" size={18} />
          Cancel
        </Link>
      </nav>
      <OpenInApp
        path="account?startBusiness=1"
        description="Choose your business plan and continue setting up your listing in the app."
      />
      <div className="page-heading compact-heading">
        <p className="eyebrow">Business onboarding</p>
        <h1>Create your business page.</h1>
        <p>Start a private, unpublished profile. Finish the page, then submit it for approval.</p>
      </div>
      <SurfacePanel>
        {canCreate ? (
          <BusinessForm categories={(data ?? []) as CategoryRow[]} />
        ) : (
          <>
            <h2>Business subscription</h2>
            <p>{creationMessage}</p>
            <p>Your personal account and customer features remain free.</p>
            <Link href="/account">Continue as a customer</Link>
          </>
        )}
      </SurfacePanel>
    </main>
  );
}
