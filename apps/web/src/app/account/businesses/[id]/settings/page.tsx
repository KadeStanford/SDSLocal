import { SurfacePanel, ActionButton } from '@/components/shared-ui';
import { BusinessWorkspaceHeader } from '@/components/business-workspace-header';

import { AppIcon } from '@/components/app-icon';
import { canSubmitBusinessForReview, getBusinessStatusLabel } from '@sds/business-logic';
import type { BusinessType, ServiceAreaType } from '@sds/types';
import type { EventTimezone } from '@sds/validation';
import { notFound, redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

import { BusinessDetailsForm } from './business-details-form';
import { submitBusinessForReviewAction } from './actions';

interface BusinessSettingsRow {
  id: string;
  name: string;
  slug: string;
  business_type: BusinessType;
  description: string;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  region_code: string | null;
  postal_code: string | null;
  service_area_type: ServiceAreaType;
  service_area_regions: string[];
  service_radius_miles: number | null;
  service_area: string | null;
  primary_color: string;
  accent_color: string;
  page_theme: 'light' | 'dark';
  font_pair: 'friendly_sans' | 'modern_sans' | 'classic_serif';
  button_style: 'rounded' | 'soft' | 'square';
  timezone: EventTimezone;
  status: 'draft' | 'pending_review' | 'active' | 'suspended';
  review_feedback: string | null;
}

interface CategoryRow {
  id: number;
  name: string;
  business_type: BusinessType | null;
}

interface CategoryJoinRow {
  category_id: number;
}

interface HourRow {
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
}

interface ReadinessCheck {
  key: string;
  label: string;
  complete: boolean;
}

interface ReadinessResult {
  ready: boolean;
  checks: ReadinessCheck[];
}

export default async function BusinessSettingsPage({
  params,
  searchParams,
}: PageProps<'/account/businesses/[id]/settings'>) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect('/auth');

  const { data: membership } = await supabase
    .from('business_members')
    .select(
      'businesses(id, name, slug, business_type, description, phone, email, website_url, address_line_1, address_line_2, city, region_code, postal_code, service_area_type, service_area_regions, service_radius_miles, service_area, primary_color, accent_color, page_theme, font_pair, button_style, timezone, status, review_feedback)',
    )
    .eq('business_id', id)
    .eq('user_id', authData.user.id)
    .eq('role', 'owner')
    .eq('is_active', true)
    .maybeSingle();
  const joined = membership?.businesses;
  const business = (Array.isArray(joined) ? joined[0] : joined) as BusinessSettingsRow | undefined;
  if (!business) notFound();

  const [
    { data: categoryData },
    { data: selectedCategoryData },
    { data: hourData },
    { data: readinessData },
  ] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, business_type')
      .eq('is_active', true)
      .order('display_order')
      .order('name'),
    supabase
      .from('business_categories')
      .select('category_id')
      .eq('business_id', business.id)
      .order('is_primary', { ascending: false }),
    supabase
      .from('business_hours')
      .select('day_of_week, opens_at, closes_at, is_closed')
      .eq('business_id', business.id)
      .eq('interval_number', 1)
      .order('day_of_week'),
    supabase.rpc('get_business_readiness', { p_business_id: business.id }),
  ]);
  const readiness = readinessData as ReadinessResult | null;

  return (
    <main className="page-shell business-workspace">
      <BusinessWorkspaceHeader
        id={id}
        name={business.name}
        slug={business.slug}
        section="settings"
        title="Business details"
        description="Keep your public details accurate and check publication readiness."
      />

      {typeof query.saved === 'string' && <p className="notice-success">{query.saved}</p>}
      {typeof query.error === 'string' && <p className="notice-error">{query.error}</p>}
      {business.review_feedback && <p className="notice-error">{business.review_feedback}</p>}

      <SurfacePanel className="readiness-panel" id="readiness">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Publication readiness</p>
            <h2>Status: {getBusinessStatusLabel(business.status)}</h2>
          </div>
          {business.status === 'draft' && (
            <form action={submitBusinessForReviewAction}>
              <input type="hidden" name="businessId" value={business.id} />
              <ActionButton
                disabled={
                  !canSubmitBusinessForReview({ isOwner: true, status: business.status, readiness })
                }
                type="submit"
              >
                Submit for review
              </ActionButton>
            </form>
          )}
        </div>
        <div className="workspace-readiness-progress">
          <strong>
            {(readiness?.checks ?? []).filter((check) => check.complete).length}
            <span> / {(readiness?.checks ?? []).length} checks complete</span>
          </strong>
          <progress
            aria-label="Publication readiness"
            max={Math.max(1, (readiness?.checks ?? []).length)}
            value={(readiness?.checks ?? []).filter((check) => check.complete).length}
          />
        </div>
        <ul className="readiness-list">
          {(readiness?.checks ?? []).map((check) => (
            <li className={check.complete ? 'readiness-complete' : ''} key={check.key}>
              <AppIcon name={check.complete ? 'circle-check' : 'circle'} size={20} />
              {check.label}
            </li>
          ))}
        </ul>
        {business.status === 'pending_review' && (
          <p className="field-hint">
            Parish Pass is reviewing this profile. Content changes return it to draft.
          </p>
        )}
      </SurfacePanel>

      <BusinessDetailsForm
        business={business}
        categories={(categoryData ?? []) as CategoryRow[]}
        selectedCategoryIds={((selectedCategoryData ?? []) as CategoryJoinRow[]).map(
          (row) => row.category_id,
        )}
        hours={(hourData ?? []) as HourRow[]}
      />
    </main>
  );
}
