import { type PropsWithChildren, useState } from 'react';

import { ListingPlansWorkspace } from '@/app/listing-plans';
import { businessCreationAccess } from '@/lib/listing-billing-core';
import { useAuth } from '@/providers/auth-provider';
import { useListingBilling } from '@/providers/listing-billing-provider';

/** One boundary shared by Account, Businesses, and the direct creation route. */
export function BusinessCreationGate({
  children,
  includeTabOverlay,
  onBack,
}: PropsWithChildren<{
  readonly includeTabOverlay: boolean;
  readonly onBack: () => void;
}>) {
  const { session, loading: authLoading } = useAuth();
  const { summary, loading, purchasing } = useListingBilling();
  const [acknowledgedUserId, setAcknowledgedUserId] = useState<string | null>(null);
  const access = businessCreationAccess(summary, authLoading || loading);
  const allowed = Boolean(session && (access === 'ready' || access === 'preview'));

  if (allowed && acknowledgedUserId === session?.user.id) return children;

  return (
    <ListingPlansWorkspace
      purpose="create"
      includeTabOverlay={includeTabOverlay}
      onBack={onBack}
      onContinue={() => {
        if (allowed && !purchasing && session) setAcknowledgedUserId(session.user.id);
      }}
    />
  );
}
