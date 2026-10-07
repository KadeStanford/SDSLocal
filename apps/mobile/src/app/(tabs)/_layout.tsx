import AppTabs from '@/components/app-tabs';
import { ServiceOperationsProvider } from '@/providers/service-operations-provider';
export default function TabsLayout() {
  return (
    <ServiceOperationsProvider>
      <AppTabs />
    </ServiceOperationsProvider>
  );
}
