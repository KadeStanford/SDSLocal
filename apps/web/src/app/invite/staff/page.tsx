import { SurfacePanel, ActionButton } from '@/components/shared-ui';
import { PageHeader } from '@/components/page-header';
import { AppIcon } from '@/components/app-icon';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { parseStaffInvitePreview } from '@sds/business-logic';

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
        <PageHeader backHref="/account" backLabel="Back" />
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
  const { data: previewData, error: previewError } = await supabase.rpc(
    'get_business_staff_invite_preview',
    { p_token: token },
  );
  const preview = previewError ? null : parseStaffInvitePreview(previewData);
  const logo = preview?.logo_path
    ? supabase.storage.from('business-media').getPublicUrl(preview.logo_path).data.publicUrl
    : null;

  return (
    <main className="page-shell narrow-shell">
      <PageHeader backHref="/account" backLabel="Back" />
      <nav className="parish-page-links" aria-label="Page links">
        <Link href="/account">
          <AppIcon name="circle-user-round" size={18} />
          Account
        </Link>
      </nav>
      <div className="page-heading compact-heading">
        <p className="eyebrow">Staff invite</p>
        <h1>Your team invitation</h1>
        <p>Review the business and your role before you join.</p>
      </div>
      {error && <p className="notice-error">{error}</p>}
      <SurfacePanel className="form-stack">
        <p className="muted">Signed in as {authData.user.email ?? 'your account'}</p>
        {preview ? (
          <>
            <p className="eyebrow">Invited business</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {logo ? (
                <img
                  src={logo}
                  alt={`${preview.business_name} logo`}
                  width={64}
                  height={64}
                  style={{ borderRadius: 16, objectFit: 'contain' }}
                />
              ) : (
                <span className="business-avatar" aria-label="Business initials">
                  {preview.business_name
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((word) => word[0])
                    .join('')
                    .toUpperCase()}
                </span>
              )}
              <div>
                <h2>{preview.business_name}</h2>
                <p className="muted">
                  <AppIcon name="map-pin" size={16} />{' '}
                  {preview.location_label || 'Public location not provided'}
                </p>
              </div>
            </div>
            <div className="notice">
              <p className="eyebrow">Your invited role</p>
              <h2>Staff</h2>
              <p>Access the business workspace and Staff Scan with your own account.</p>
            </div>
            <p className="muted">Joining happens only when you accept below.</p>
            <form action={acceptStaffInviteAction}>
              <input type="hidden" name="token" value={token} />
              <ActionButton type="submit">Accept staff invite</ActionButton>
            </form>
          </>
        ) : (
          <>
            <h2>Invitation unavailable</h2>
            <p>
              We could not verify this invitation for your account. It may have expired or been
              withdrawn. Check your account or ask the owner for a fresh link.
            </p>
            <Link
              className="button button-secondary"
              href={`/invite/staff?token=${encodeURIComponent(token)}`}
            >
              Check invitation again
            </Link>
          </>
        )}
        <Link className="button button-secondary" href="/account">
          <AppIcon name="arrow-left" size={18} />
          Back
        </Link>
      </SurfacePanel>
    </main>
  );
}
