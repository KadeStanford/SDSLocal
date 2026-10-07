import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';
import { scheduleOnRN } from 'react-native-worklets';
import { useReducedMotionPreference } from '@/hooks/use-reduced-motion';
import { ParishMark, ParishPalette } from './parish-brand';
import { ThemedText } from './themed-text';

const SPLASH_DURATION = 1500;
const backdropExit = new Keyframe({ 0: { opacity: 1 }, 78: { opacity: 1 }, 100: { opacity: 0 } });
const emblemEntrance = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.82 }, { translateY: 8 }] },
  72: {
    opacity: 1,
    transform: [{ scale: 1.035 }, { translateY: 0 }],
    easing: Easing.out(Easing.cubic),
  },
  100: {
    opacity: 1,
    transform: [{ scale: 1 }, { translateY: 0 }],
    easing: Easing.out(Easing.cubic),
  },
});
const wordEntrance = () =>
  new Keyframe({
    0: { opacity: 0, transform: [{ translateY: 10 }] },
    100: { opacity: 1, transform: [{ translateY: 0 }], easing: Easing.out(Easing.cubic) },
  });

/** Runs once per application mount; never gates navigation or data loading. */
export function ParishSplash() {
  const reduced = useReducedMotionPreference();
  const [nativeHidden, setNativeHidden] = useState(false);
  const [finished, setFinished] = useState(false);
  const hiding = useRef(false);
  const mounted = useRef(true);
  const animate = nativeHidden && reduced === false;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!nativeHidden) return;
    // Accessibility resolution and interrupted native animations must not trap
    // a foreground overlay. Unknown preference falls back to no animation.
    const timeout = setTimeout(
      () => setFinished(true),
      reduced === false ? SPLASH_DURATION + 150 : 200,
    );
    return () => clearTimeout(timeout);
  }, [nativeHidden, reduced]);

  const hideNative = () => {
    if (hiding.current) return;
    hiding.current = true;
    void SplashScreen.hideAsync()
      .catch(() => {})
      .finally(() => {
        if (mounted.current) setNativeHidden(true);
      });
  };
  if (finished || (nativeHidden && reduced === true)) return null;
  const content = (
    <View style={styles.composition}>
      <Animated.View
        {...(animate ? { entering: emblemEntrance.duration(650) } : {})}
        style={!animate ? styles.hidden : undefined}
      >
        <ParishMark size={106} dark />
      </Animated.View>
      <Animated.View
        {...(animate ? { entering: wordEntrance().duration(450).delay(220) } : {})}
        style={!animate ? styles.hidden : undefined}
      >
        <ThemedText style={styles.wordmark}>Parish Pass</ThemedText>
      </Animated.View>
      <Animated.View
        {...(animate ? { entering: wordEntrance().duration(400).delay(380) } : {})}
        style={!animate ? styles.hidden : undefined}
      >
        <ThemedText style={styles.tagline}>Your next local favorite.</ThemedText>
      </Animated.View>
    </View>
  );
  return animate ? (
    <Animated.View
      key="parish-entrance"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      entering={backdropExit.duration(SPLASH_DURATION).withCallback((done) => {
        'worklet';
        if (done) scheduleOnRN(setFinished, true);
      })}
      style={styles.overlay}
    >
      {content}
    </Animated.View>
  ) : (
    <View pointerEvents="none" onLayout={hideNative} style={styles.overlay}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: ParishPalette.evergreen,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  composition: { alignItems: 'center', gap: 18, padding: 24 },
  hidden: { opacity: 0 },
  wordmark: {
    color: ParishPalette.ivory,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -1,
  },
  tagline: { color: ParishPalette.mint, fontSize: 14, lineHeight: 21, fontWeight: '500' },
});
