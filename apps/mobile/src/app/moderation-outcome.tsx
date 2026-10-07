import { useLocalSearchParams } from 'expo-router';
import { MobileModerationOutcomeScreen } from '@/components/admin/moderation-outcome-screen';
export default function ModerationOutcomeRoute() {
  const params = useLocalSearchParams<{ deliveryId?: string }>();
  return (
    <MobileModerationOutcomeScreen
      deliveryId={typeof params.deliveryId === 'string' ? params.deliveryId : ''}
    />
  );
}
