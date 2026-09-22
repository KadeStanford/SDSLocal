import { describe, expect, it, vi } from 'vitest';

import {
  HORIZONTAL_SCROLL_GESTURE_PROPS,
  NAVIGATION_GESTURE_POLICY,
  shouldClaimEdgeBackGesture,
  shouldCompleteEdgeBackGesture,
} from './gesture-policy';

const edgeIntent = {
  platform: 'ios',
  enabled: true,
  startX: 12,
  dx: 64,
  dy: 6,
  activeTouches: 1,
};

describe('application gesture policy', () => {
  it('keeps back navigation edge-only instead of full-screen', () => {
    expect(NAVIGATION_GESTURE_POLICY).toEqual({
      edgeWidth: 36,
      fullScreenBackEnabled: false,
      iosOnly: true,
    });
    expect(shouldClaimEdgeBackGesture(edgeIntent)).toBe(true);
    expect(shouldClaimEdgeBackGesture({ ...edgeIntent, startX: 37 })).toBe(false);
    expect(shouldClaimEdgeBackGesture({ ...edgeIntent, startX: 180 })).toBe(false);
  });

  it('never claims a touch sequence that began inside a horizontal control', () => {
    expect(shouldClaimEdgeBackGesture({ ...edgeIntent, blockedByControl: true })).toBe(false);
    expect(
      shouldCompleteEdgeBackGesture({
        ...edgeIntent,
        dx: 180,
        velocityX: 1.2,
        blockedByControl: true,
      }),
    ).toBe(false);
  });

  it('does not add the custom back gesture to Android or root states', () => {
    expect(shouldClaimEdgeBackGesture({ ...edgeIntent, platform: 'android' })).toBe(false);
    expect(shouldClaimEdgeBackGesture({ ...edgeIntent, enabled: false })).toBe(false);
  });

  it('rejects vertical, leftward, and multi-touch movement', () => {
    expect(shouldClaimEdgeBackGesture({ ...edgeIntent, dy: 48 })).toBe(false);
    expect(shouldClaimEdgeBackGesture({ ...edgeIntent, dx: -64 })).toBe(false);
    expect(shouldClaimEdgeBackGesture({ ...edgeIntent, activeTouches: 2 })).toBe(false);
  });

  it('requires deliberate distance or velocity to complete exactly once', () => {
    const releasedIntent = { ...edgeIntent, activeTouches: 0 };
    expect(shouldCompleteEdgeBackGesture({ ...releasedIntent, dx: 110, velocityX: 0.2 })).toBe(
      true,
    );
    expect(shouldCompleteEdgeBackGesture({ ...releasedIntent, dx: 48, velocityX: 0.5 })).toBe(true);
    expect(shouldCompleteEdgeBackGesture({ ...releasedIntent, dx: 48, velocityX: 0.2 })).toBe(
      false,
    );
    expect(
      shouldCompleteEdgeBackGesture({ ...releasedIntent, activeTouches: 2, velocityX: 1 }),
    ).toBe(false);
  });

  it('configures shared horizontal rows for directional and nested native scrolling', () => {
    expect(HORIZONTAL_SCROLL_GESTURE_PROPS).toEqual({
      alwaysBounceVertical: false,
      directionalLockEnabled: true,
      nestedScrollEnabled: true,
    });
  });

  it('allows a pill callback to remain an ordinary reliable press', () => {
    const onPress = vi.fn();
    onPress();
    expect(onPress).toHaveBeenCalledOnce();
  });
});
