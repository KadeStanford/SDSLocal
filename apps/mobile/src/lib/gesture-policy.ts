export const NAVIGATION_GESTURE_POLICY = {
  edgeWidth: 36,
  fullScreenBackEnabled: false,
  iosOnly: true,
} as const;

export const HORIZONTAL_SCROLL_GESTURE_PROPS = {
  alwaysBounceVertical: false,
  directionalLockEnabled: true,
  nestedScrollEnabled: true,
} as const;

interface EdgeBackIntent {
  readonly platform: string;
  readonly enabled: boolean;
  readonly startX: number;
  readonly dx: number;
  readonly dy: number;
  readonly activeTouches: number;
  readonly blockedByControl?: boolean;
}

export function shouldClaimEdgeBackGesture(intent: EdgeBackIntent): boolean {
  if (intent.blockedByControl) return false;
  if (intent.platform !== 'ios' || !intent.enabled || intent.activeTouches !== 1) return false;
  if (intent.startX < 0 || intent.startX > NAVIGATION_GESTURE_POLICY.edgeWidth) return false;
  if (intent.dx <= 4) return false;
  return Math.abs(intent.dy) <= Math.max(12, intent.dx * 0.65);
}

export function shouldCompleteEdgeBackGesture(
  intent: EdgeBackIntent & { readonly velocityX: number },
): boolean {
  // PanResponder reports zero active touches after the finger has lifted.
  // Re-running the start-phase `activeTouches === 1` check here would reject
  // every otherwise valid release and make all back swipes spring closed.
  if (intent.blockedByControl) return false;
  if (intent.platform !== 'ios' || !intent.enabled || intent.activeTouches > 1) return false;
  if (intent.startX < 0 || intent.startX > NAVIGATION_GESTURE_POLICY.edgeWidth) return false;
  if (intent.dx <= 4) return false;
  return (
    (intent.dx >= 64 || intent.velocityX >= 0.4) &&
    Math.abs(intent.dy) <= Math.max(40, intent.dx * 0.65)
  );
}
