import { router, useLocalSearchParams } from 'expo-router';

import { BusinessWorkspace } from '@/components/business-workspace';
import { isBusinessSection } from '@/lib/business-workspace-config';

export { BusinessWorkspace } from '@/components/business-workspace';

export default function BusinessScreen() {
  const params = useLocalSearchParams<{ id?: string; section?: string; provider?: string }>();
  const businessId = typeof params.id === 'string' ? params.id : '';
  const initialSection = isBusinessSection(params.section) ? params.section : null;
  const initialOrderingProvider = params.provider === 'stripe' ? 'stripe' : params.provider === 'square' ? 'square' : undefined;

  return (
    <BusinessWorkspace
      businessId={businessId}
      initialSection={initialSection}
      {...(initialOrderingProvider ? { initialOrderingProvider } : {})}
      onBack={() => router.back()}
    />
  );
}


