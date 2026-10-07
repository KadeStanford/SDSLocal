import { PageHeader } from '@/components/page-header';
import { View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from '../themed-text';
import { CustomerTabs } from '../customer-ui';
export function CustomerOrdersHeader({
  signedIn,
  view,
  onView,
}: {
  signedIn: boolean;
  view: 'current' | 'history';
  onView: (view: 'current' | 'history') => void;
}) {
  const c = useTheme();
  return (
    <View style={{ padding: 20, gap: 16 }}>
      <PageHeader />
      <ThemedText accessibilityRole="header" type="title" style={{ fontSize: 28, lineHeight: 34 }}>
        Your orders
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {signedIn
          ? 'Track your pickups and revisit past orders.'
          : 'Guest orders saved on this device. Sign in for your account history.'}
      </ThemedText>
      <View
        style={{
          padding: 12,
          backgroundColor: c.backgroundElement,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: c.divider,
        }}
      >
        <CustomerTabs
          value={view}
          options={[
            { value: 'current', label: 'Current' },
            { value: 'history', label: 'History' },
          ]}
          onChange={onView}
        />
      </View>
    </View>
  );
}
