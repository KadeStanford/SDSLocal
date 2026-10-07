import { useState } from 'react';
import { router, type Href } from 'expo-router';
import { AccountSettingsRow } from '@/components/account-settings-row';
import { usePlatformAdminAccess } from '@/hooks/use-platform-admin-access';
/** Visual owner inserts this in the signed-in Account overview; no separate credentials. */
export function AccountAdminEntry() {
  const access = usePlatformAdminAccess();
  const [opening, setOpening] = useState(false);
  if (access.status !== 'allowed') return null;
  return (
    <AccountSettingsRow
      label={opening ? 'Checking admin access…' : 'Admin'}
      detail="Review submissions, reports and moderation history"
      onPress={() => {
        if (opening) return;
        setOpening(true);
        void access
          .verify()
          .then((allowed) => {
            if (allowed) router.push('/admin-moderation' as Href);
          })
          .finally(() => setOpening(false));
      }}
    />
  );
}
