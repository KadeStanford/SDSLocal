import { useState } from 'react';
import { Alert, Modal, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { money, type PickupOrder } from '@/lib/square-commerce-core';

export function ItemRefundPicker({
  order,
  disabled,
  onRefund,
  embedded = false,
  onClose,
}: {
  order: PickupOrder;
  disabled: boolean;
  onRefund: (items: { itemId: string; quantity: number }[]) => Promise<void>;
  embedded?: boolean;
  onClose?: () => void;
}) {
  const c = useTheme();
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<Record<string, number>>({});
  const options = order.refundItems;
  const items = (options ?? [])
    .filter((i) => (selection[i.itemId] ?? 0) > 0)
    .map((i) => ({ itemId: i.itemId, quantity: selection[i.itemId] ?? 0 }));
  const total = (options ?? []).reduce(
    (n, i) =>
      n +
      i.unit * (selection[i.itemId] ?? 0) +
      Math.max(0, Math.min(selection[i.itemId] ?? 0, i.extra - i.used)),
    0,
  );
  const close = () => {
    setOpen(false);
    onClose?.();
  };
  const panel = (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }}>
        <ThemedText type="title">Refund items</ThemedText>
        <ThemedText themeColor="textSecondary">
          Choose the quantities to return. The total includes each item’s share of tax and
          discounts. Refunding does not change the items your team should prepare.
        </ThemedText>
        {(options ?? []).map((i) => (
          <View
            key={i.itemId}
            style={{
              padding: 16,
              gap: 12,
              borderRadius: 16,
              backgroundColor: c.backgroundElement,
            }}
          >
            <ThemedText type="smallBold">{i.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {i.available} of {i.quantity} available to refund
            </ThemedText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <AppButton
                accessibilityLabel={`Remove one ${i.name} from refund`}
                label="−"
                variant="secondary"
                disabled={disabled || !((selection[i.itemId] ?? 0) > 0)}
                onPress={() =>
                  setSelection((s) => ({
                    ...s,
                    [i.itemId]: Math.max(0, (s[i.itemId] ?? 0) - 1),
                  }))
                }
              />
              <ThemedText accessibilityLiveRegion="polite">{selection[i.itemId] ?? 0}</ThemedText>
              <AppButton
                accessibilityLabel={`Add one ${i.name} to refund`}
                label="+"
                variant="secondary"
                disabled={disabled || (selection[i.itemId] ?? 0) >= i.available}
                onPress={() => setSelection((s) => ({ ...s, [i.itemId]: (s[i.itemId] ?? 0) + 1 }))}
              />
            </View>
          </View>
        ))}
        <ThemedText type="subtitle">Refund total: {money(total, order.currency)}</ThemedText>
        <AppButton
          label="Review refund"
          disabled={disabled || !items.length || total < 1}
          onPress={() =>
            Alert.alert(
              'Refund selected items?',
              `${items.reduce((n, i) => n + i.quantity, 0)} item(s) · ${money(total, order.currency)}\nThe refund completes after the payment provider confirms it.`,
              [
                { text: 'Keep payment', style: 'cancel' },
                {
                  text: 'Confirm refund',
                  style: 'destructive',
                  onPress: () => {
                    close();
                    void onRefund(items);
                  },
                },
              ],
            )
          }
        />
        <AppButton label="Cancel" variant="secondary" onPress={() => close()} />
      </ScrollView>
    </SafeAreaView>
  );
  if (embedded) return panel;
  return (
    <>
      <AppButton
        label="Refund items"
        variant="secondary"
        disabled={disabled || !options?.some((i) => i.available > 0)}
        onPress={() => {
          setSelection({});
          setOpen(true);
        }}
      />
      {options === null && (
        <ThemedText type="small" themeColor="textSecondary">
          A previous refund needs review in the payment dashboard before items can be refunded here.
        </ThemedText>
      )}
      <Modal visible={open} animationType="slide" onRequestClose={close}>
        {panel}
      </Modal>
    </>
  );
}
