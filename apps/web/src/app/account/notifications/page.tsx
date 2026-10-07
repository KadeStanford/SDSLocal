import { SurfacePanel, ActionButton } from '@/components/shared-ui';
import { PageHeader } from '@/components/page-header';

import { AppIcon } from '@/components/app-icon';

import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

import { updateNotificationPreferenceAction } from './actions';

interface BusinessSettings {
  business_id: string;
  business_name: string;
  events_enabled: boolean;
  loyalty_enabled: boolean;
  general_updates_enabled: boolean;
}

const preferences = [
  {
    type: 'events',
    key: 'events_enabled',
    label: 'Events and reminders',
    description: 'New events from followed businesses and reminders you explicitly enable.',
  },
  {
    type: 'loyalty',
    key: 'loyalty_enabled',
    label: 'Rewards and loyalty',
    description: 'Reward-ready and useful loyalty progress updates.',
  },
  {
    type: 'general_updates',
    key: 'general_updates_enabled',
    label: 'General updates',
    description: 'Limited structured updates from this business.',
  },
] as const;

export const metadata = { title: 'Notification preferences' };

export default async function NotificationPreferencesPage({
  searchParams,
}: PageProps<'/account/notifications'>) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect('/auth?next=%2Faccount%2Fnotifications');
  const { data, error } = await supabase.rpc('get_notification_settings');
  const settings = (data ?? []) as BusinessSettings[];

  return (
    <main className="page-shell">
      <PageHeader backHref="/account" backLabel="Back" />
      <nav className="parish-page-links" aria-label="Page links">
        <div className="nav-actions">
          <Link href="/account">
            <AppIcon name="circle-user-round" size={18} />
            Account
          </Link>
          <Link href="/account/moderation">
            <AppIcon name="bell" size={18} />
            Account updates
          </Link>
          <Link href="/following">
            <AppIcon name="heart" size={18} />
            Following
          </Link>
          <Link href="/events">
            <AppIcon name="calendar-days" size={18} />
            Events
          </Link>
          <Link href="/rewards">
            <AppIcon name="gift" size={18} />
            Rewards
          </Link>
        </div>
      </nav>

      <div className="page-heading compact-heading">
        <p className="eyebrow">Account</p>
        <h1>Notification preferences</h1>
        <p>
          Choose exactly which updates you want from each business. System permission is requested
          separately in the installed mobile app after you choose to enable notifications.
        </p>
      </div>

      {query.saved === '1' && <p className="notice-success">Notification preference saved.</p>}
      {typeof query.error === 'string' && <p className="notice-error">{query.error}</p>}
      {error && <p className="notice-error">{error.message}</p>}

      <SurfacePanel className="notification-preferences-panel">
        {settings.length ? (
          settings.map((business) => (
            <div className="notification-business" key={business.business_id}>
              <h2>{business.business_name}</h2>
              <div className="notification-choice-list">
                {preferences.map((preference) => (
                  <form
                    action={updateNotificationPreferenceAction}
                    className="notification-choice"
                    key={preference.type}
                  >
                    <input type="hidden" name="businessId" value={business.business_id} />
                    <input type="hidden" name="notificationType" value={preference.type} />
                    <label htmlFor={`${business.business_id}-${preference.type}`}>
                      <strong>{preference.label}</strong>
                      <span>{preference.description}</span>
                    </label>
                    <select
                      id={`${business.business_id}-${preference.type}`}
                      name="setting"
                      defaultValue={business[preference.key] ? 'enabled' : 'muted'}
                    >
                      <option value="enabled">Enabled</option>
                      <option value="muted">Muted</option>
                    </select>
                    <ActionButton className="button-secondary" type="submit">
                      Save
                    </ActionButton>
                  </form>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <strong>No business notification choices yet</strong>
            <span>
              Follow a business, enable an event reminder, or join a rewards program first.
            </span>
          </div>
        )}
      </SurfacePanel>
    </main>
  );
}
