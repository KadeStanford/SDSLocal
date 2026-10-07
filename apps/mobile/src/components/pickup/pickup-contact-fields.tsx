import { CustomerSectionHeading, CustomerSurface } from '../customer-ui';
import { CommerceField } from '../commerce-fields';
import { ThemedText } from '../themed-text';
export function PickupContactFields({
  name,
  phone,
  onName,
  onPhone,
  disabled = false,
}: {
  name: string;
  phone: string;
  onName: (value: string) => void;
  onPhone: (value: string) => void;
  disabled?: boolean;
}) {
  return (
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
  );
}
