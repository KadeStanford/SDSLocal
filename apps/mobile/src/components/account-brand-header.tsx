import { View } from 'react-native';
import { BackPill } from './back-pill';
import { CustomerBrand } from './customer-brand';

export function AccountBrandHeader({
  onBack,
  disabled = false,
  label = 'Back to account',
}: {
  onBack?: (() => void) | undefined;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingRight: 48 }}>
      {onBack && <BackPill label={label} disabled={disabled} onPress={onBack} />}
      <CustomerBrand />
    </View>
  );
}
