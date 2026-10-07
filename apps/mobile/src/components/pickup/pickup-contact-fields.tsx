import { CustomerSectionHeading, CustomerSurface } from '../customer-ui';
import { CommerceField } from '../commerce-fields';
import { ThemedText } from '../themed-text';
import { AppIcon } from '../app-icon';
import { View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { pickupLabel, type Quote } from '@/lib/square-commerce-core';
export function PickupContactFields({
  name,
  phone,
  onName,
  onPhone,
  disabled = false,
  pickup,
}: {
  name: string;
  phone: string;
  onName: (value: string) => void;
  onPhone: (value: string) => void;
  disabled?: boolean;
  pickup?: Quote['slot'] | null;
}) {
  const c = useTheme();
  return (
    <View style={{ gap: 16 }}>
      {pickup && (
        <CustomerSurface style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
          <AppIcon name="clock" size={24} tintColor={c.accent} />
          <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
            <ThemedText type="small" themeColor="textSecondary">
              Your pickup
            </ThemedText>
            <ThemedText type="smallBold">{pickupLabel(pickup)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {pickup.title}
            </ThemedText>
          </View>
        </CustomerSurface>
      )}
      <CustomerSurface>
        <CustomerSectionHeading title="Who's picking up?" detail="Your details for this order." />
        <CommerceField
          label="Full name"
          autoComplete="name"
          maxLength={100}
          value={name}
          onChangeText={onName}
          editable={!disabled}
        />
        <CommerceField
          label="Phone number"
          autoComplete="tel"
          keyboardType="phone-pad"
          maxLength={30}
          value={phone}
          onChangeText={onPhone}
          editable={!disabled}
        />
        <ThemedText type="small" themeColor="textSecondary">
          The business will only contact you about your pickup.
        </ThemedText>
      </CustomerSurface>
    </View>
  );
}
