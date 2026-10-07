import { View } from 'react-native';
import { CustomerBrand } from '../customer-brand';
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
  return (
    <View style={{ padding: 20, gap: 16 }}>
      <CustomerBrand />
      <ThemedText type="title">Your orders</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {signedIn
          ? 'Track your pickups and revisit past orders.'
          : 'Guest orders saved on this device. Sign in for your account history.'}
      </ThemedText>
      <CustomerTabs
        value={view}
        options={[
          { value: 'current', label: 'Current' },
          { value: 'history', label: 'History' },
        ]}
        onChange={onView}
      />
    </View>
  );
}
