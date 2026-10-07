import { useLocalSearchParams } from 'expo-router';
import { MobileModerationCaseScreen } from '@/components/admin/moderation-case-screen';
import { parseCaseRoute } from '@/lib/admin/mobile-moderation-client';
export default function AdminModerationCaseRoute() {
  const params = useLocalSearchParams<{ kind?: string | string[]; id?: string | string[] }>();
  const route = parseCaseRoute(params.kind, params.id);
  return <MobileModerationCaseScreen kind={route?.kind ?? null} id={route?.id ?? null} />;
}
