import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, Dimensions, PanResponder, Platform, StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { shouldClaimEdgeBackGesture, shouldCompleteEdgeBackGesture } from '@/lib/gesture-policy';

interface SwipeBackGestureContextValue {
  readonly setControlGestureActive: (token: object, active: boolean) => void;
}

const SwipeBackGestureContext = createContext<SwipeBackGestureContextValue>({
  setControlGestureActive: () => undefined,
});

/** Reserves a touch sequence for a child control so it can never become a back swipe. */
export function useSwipeBackGestureBlocker() {
  const context = useContext(SwipeBackGestureContext);
  const token = useRef<object>({}).current;
  const beginControlGesture = useCallback(
    () => context.setControlGestureActive(token, true),
    [context, token],
  );
  const endControlGesture = useCallback(
    () => context.setControlGestureActive(token, false),
    [context, token],
  );

  useEffect(() => endControlGesture, [endControlGesture]);

  return { beginControlGesture, endControlGesture } as const;
}

/**
 * Adds the familiar iOS edge-swipe back gesture to screens that manage their
 * own nested view state instead of pushing a new router screen.
 */
export function SwipeBackView({
  children,
  onSwipeBack,
  enabled = true,
  underlay,
}: {
  readonly children: React.ReactNode;
  readonly onSwipeBack: () => void;
  readonly enabled?: boolean;
  /** The destination screen shown beneath the animated outgoing screen. */
  readonly underlay?: React.ReactNode;
}) {
  const [translateX] = useState(() => new Animated.Value(0));
  const screenWidth = Dimensions.get('window').width;
  const scheme = useColorScheme();
  const backgroundColor = Colors[scheme === 'dark' ? 'dark' : 'light'].background;
  const [retainedUnderlay, setRetainedUnderlay] = useState<React.ReactNode>(null);
  const visibleUnderlay = underlay ?? retainedUnderlay;
  const [controlGestureState] = useState(() => ({ activeTokens: new Set<object>() }));
  const setControlGestureActive = useCallback(
    (token: object, active: boolean) => {
      if (active) controlGestureState.activeTokens.add(token);
      else controlGestureState.activeTokens.delete(token);
    },
    [controlGestureState],
  );
  const gestureContext = useMemo(() => ({ setControlGestureActive }), [setControlGestureActive]);

  const panResponder = useMemo(() => {
    const settleBack = () => {
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        damping: 24,
        stiffness: 260,
        mass: 0.8,
      }).start(({ finished }) => {
        if (finished) setRetainedUnderlay(null);
      });
    };
    const completeBack = () => {
      if (!underlay) {
        // Router-backed screens do not always have their previous React tree
        // available here. Keep the current screen intact instead of exposing
        // a fabricated or empty destination during the gesture.
        onSwipeBack();
        translateX.setValue(0);
        return;
      }
      Animated.timing(translateX, {
        toValue: screenWidth,
        duration: 170,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) return;
        onSwipeBack();
        // Let the destination commit before the reusable wrapper is reset.
        // Some state-driven screens need a second frame; resetting sooner can
        // briefly reveal the outgoing page after the swipe completes.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            translateX.setValue(0);
            // Keep the loaded destination behind the outgoing layer until
            // the real destination has painted at its resting position.
            requestAnimationFrame(() => setRetainedUnderlay(null));
          });
        });
      });
    };
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => {
        // Deliberately do not use the capture phase. Native horizontal
        // controls and child gestures get first refusal; this wrapper only
        // claims an unhandled, intentional iOS gesture from the screen edge.
        return shouldClaimEdgeBackGesture({
          platform: Platform.OS,
          enabled,
          startX: gesture.x0,
          dx: gesture.dx,
          dy: gesture.dy,
          activeTouches: gesture.numberActiveTouches,
          blockedByControl: controlGestureState.activeTokens.size > 0,
        });
      },
      onPanResponderGrant: () => {
        translateX.stopAnimation();
        translateX.setValue(0);
        setRetainedUnderlay(underlay ?? null);
      },
      onPanResponderMove: (_, gesture) => {
        if (!enabled) return;
        if (underlay) translateX.setValue(Math.max(0, gesture.dx));
      },
      onPanResponderRelease: (_, gesture) => {
        const shouldComplete = shouldCompleteEdgeBackGesture({
          platform: Platform.OS,
          enabled,
          startX: gesture.x0,
          dx: gesture.dx,
          dy: gesture.dy,
          activeTouches: gesture.numberActiveTouches,
          velocityX: gesture.vx,
        });
        if (shouldComplete) completeBack();
        else settleBack();
      },
      onPanResponderTerminate: settleBack,
      onPanResponderTerminationRequest: () => false,
    });
  }, [controlGestureState, enabled, onSwipeBack, screenWidth, translateX, underlay]);

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {visibleUnderlay ? (
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          aria-hidden
          style={styles.underlay}
        >
          {visibleUnderlay}
        </View>
      ) : null}
      <Animated.View
        style={[styles.container, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <SwipeBackGestureContext.Provider value={gestureContext}>
          {children}
        </SwipeBackGestureContext.Provider>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  underlay: StyleSheet.absoluteFill,
});
