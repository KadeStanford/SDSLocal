import { useCallback, useRef, useState } from 'react';
import { View, type StyleProp, type ViewStyle, type TextStyle } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { AppButton } from './app-button';
import { ThemedText } from './themed-text';
import { useSwipeBackGestureBlocker } from './swipe-back-view';

export type PickupDestination = {
  pathname: '/order';
  params: { businessId: string } | { orderId: string };
};

/** Shared native press path for discovery and the public business page. */
export function PickupNavigationButton({
  label,
  destination,
  variant = 'primary',
  style,
  labelStyle,
}: {
  readonly label: string;
  readonly destination: PickupDestination;
  readonly variant?: 'primary' | 'secondary';
  readonly style?: StyleProp<ViewStyle>;
  readonly labelStyle?: StyleProp<TextStyle>;
}) {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { beginControlGesture, endControlGesture } = useSwipeBackGestureBlocker();
  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    pending.current = false;
  }, []);
  useFocusEffect(
    useCallback(() => {
      reset();
      setOpening(false);
      return reset;
    }, [reset]),
  );
  const id =
    'businessId' in destination.params ? destination.params.businessId : destination.params.orderId;
  return (
    <View style={{ gap: 8 }}>
      <AppButton
        variant={variant}
        label={opening ? 'Opening pickup…' : label}
        loading={opening}
        style={style}
        labelStyle={labelStyle}
        disabled={!id.trim()}
        onPressIn={beginControlGesture}
        onPressOut={endControlGesture}
        onPress={() => {
          if (pending.current || !id.trim()) return;
          pending.current = true;
          setOpening(true);
          setError('');
          // A successful push blurs this screen and clears the watchdog. A rejected
          // or unhandled route must recover visibly instead of spinning forever.
          timer.current = setTimeout(() => {
            reset();
            setOpening(false);
            setError('Pickup could not open. Please try again.');
          }, 2500);
          try {
            router.push(destination);
          } catch {
            reset();
            setOpening(false);
            setError('Pickup could not open. Please try again.');
          }
        }}
      />
      {!!error && (
        <ThemedText accessibilityLiveRegion="polite" type="small">
          {error}
        </ThemedText>
      )}
    </View>
  );
}
