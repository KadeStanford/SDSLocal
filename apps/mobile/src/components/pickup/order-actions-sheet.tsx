import { AppIcon } from '@/components/app-icon';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { money, type PickupOrder } from '@/lib/square-commerce-core';
import { ItemRefundPicker } from './item-refund-picker';

export function OrderActionsSheet({
  visible,
  onClose,
  order,
  canRefund,
  disabled,
  onRefund,
  onReview,
  initialMode = 'actions',
}: {
  visible: boolean;
  onClose: () => void;
  order: PickupOrder;
  canRefund: boolean;
  disabled: boolean;
  onRefund: (items?: { itemId: string; quantity: number }[]) => Promise<void>;
  onReview: () => Promise<void>;
  initialMode?: 'actions' | 'full';
}) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'actions' | 'items' | 'full' | 'review'>(initialMode);
  const [previous, setPrevious] = useState({ visible, initialMode });
  if (previous.visible !== visible || previous.initialMode !== initialMode) {
    setPrevious({ visible, initialMode });
    if (visible) setMode(initialMode);
  }
  const allowed =
    canRefund &&
    !!order.paidAt &&
    [
      'placed',
      'accepted',
      'preparing',
      'ready',
      'completed',
      'refund_failed',
      'payment_review',
    ].includes(order.status) &&
    (!order.disputeState || ['WON', 'RESOLVED'].includes(order.disputeState));
  const pending = canRefund && order.status === 'refund_pending';
  const canContinue =
    allowed && order.status === 'payment_review' && order.providerStatus === 'PARTIAL_REFUND';
  const submit = (items?: { itemId: string; quantity: number }[]) => {
    onClose();
    void onRefund(items);
  };
  const row = (label: string, detail: string, onPress: () => void, blocked = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: blocked || disabled }}
      disabled={blocked || disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: 16,
        minHeight: 64,
        borderBottomWidth: 1,
        borderBottomColor: c.divider,
        opacity: blocked || disabled ? 0.5 : pressed ? 0.7 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <View style={{ flex: 1, gap: 4 }}>
          <ThemedText type="smallBold">{label}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {detail}
          </ThemedText>
        </View>
        <AppIcon name="chevron-right" size={18} />
      </View>
    </Pressable>
  );
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close order actions"
          onPress={onClose}
          style={{ flex: 1 }}
        />
        <View
          accessibilityViewIsModal
          style={{
            backgroundColor: c.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            overflow: 'hidden',
            ...(mode === 'items' ? { height: '90%' } : { maxHeight: '85%' }),
          }}
        >
          {mode === 'items' ? (
            <ItemRefundPicker
              key={order.version}
              embedded
              order={order}
              disabled={disabled || !allowed}
              onClose={onClose}
              onRefund={(items) => onRefund(items)}
            />
          ) : (
            <ScrollView
              contentContainerStyle={{
                padding: 20,
                paddingBottom: Math.max(20, insets.bottom),
                gap: 16,
              }}
            >
              <ThemedText type="subtitle">
                {mode === 'full'
                  ? order.total === 0
                    ? 'Cancel reward order'
                    : 'Refund remaining payment'
                  : mode === 'review'
                    ? 'Continue this order?'
                    : 'Order actions'}
              </ThemedText>
              {mode === 'actions' ? (
                <>
                  <ThemedText type="small" themeColor="textSecondary">
                    Choose an action for this order.
                  </ThemedText>
                  {allowed && (
                    <>
                      {order.total > 0 &&
                        row(
                          'Refund items',
                          'Select items and quantities. We calculate the total.',
                          () => setMode('items'),
                          !order.refundItems?.some((i) => i.available > 0),
                        )}
                      {order.total > 0 && order.refundItems === null && (
                        <ThemedText type="small" themeColor="textSecondary">
                          An earlier refund needs review in the payment dashboard before items can
                          be refunded here.
                        </ThemedText>
                      )}
                      {row(
                        order.total === 0 ? 'Cancel & restore reward' : 'Refund remaining payment',
                        order.total === 0
                          ? 'No payment was collected.'
                          : money(order.remainingMinor ?? order.total, order.currency) +
                              ' remaining',
                        () => setMode('full'),
                      )}
                    </>
                  )}
                  {pending &&
                    row(
                      'Check pending refund',
                      'Check the existing refund with the payment provider.',
                      () => submit(),
                    )}
                  {canContinue &&
                    row(
                      'Continue order after partial refund',
                      'Review the agreed order before resuming preparation.',
                      () => setMode('review'),
                    )}
                  {!allowed && !pending && (
                    <ThemedText themeColor="textSecondary">
                      No payment actions are available for this order.
                    </ThemedText>
                  )}
                </>
              ) : mode === 'full' ? (
                <>
                  <ThemedText type="title">
                    {money(order.remainingMinor ?? order.total, order.currency)}
                  </ThemedText>
                  <ThemedText themeColor="textSecondary">
                    {order.total === 0
                      ? 'Cancel this order and return the reward to the customer. No card refund is needed.'
                      : `Return the remaining payment through ${order.provider === 'stripe' ? 'Stripe' : 'Square'}. This cancels any remaining fulfillment. The refund completes when the payment provider confirms it.`}
                  </ThemedText>
                  <AppButton
                    label={order.total === 0 ? 'Cancel & restore reward' : 'Confirm refund'}
                    variant="destructive"
                    disabled={disabled || !allowed}
                    onPress={() => submit()}
                  />
                </>
              ) : (
                <>
                  <ThemedText themeColor="textSecondary">
                    Confirm the remaining payment covers the agreed items. Preparation resumes from
                    its previous stage.
                  </ThemedText>
                  <AppButton
                    label="Continue order"
                    disabled={disabled || !canContinue}
                    onPress={() => {
                      onClose();
                      void onReview();
                    }}
                  />
                </>
              )}
              <AppButton
                label={mode === 'actions' ? 'Close' : 'Back to actions'}
                variant="secondary"
                onPress={() => (mode === 'actions' ? onClose() : setMode('actions'))}
              />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
