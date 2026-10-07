import { beforeEach, expect, it, vi } from 'vitest';
import { FlowSection } from './flow-layout';
import { HoursEditor } from './business-workspace-panels';
import { RewardProgramCard } from './reward-program-card';
import { Colors } from '@/constants/theme';

it('presents the points target during enrollment without inventing a customer balance', () => {
  const tree = RewardProgramCard({
    name: 'Points club',
    description: 'Earn with each order',
    type: 'points',
    target: 100,
    enrollment: true,
  });
  const labels = nodes(tree)
    .map((n) => n.props?.children)
    .filter((v) => typeof v === 'string');
  expect(labels).toContain('points to unlock a reward');
  expect(labels).not.toContain('available points');
  expect(nodes(tree).some((n) => n.props?.accessibilityRole === 'progressbar')).toBe(false);
});

const h = vi.hoisted(() => ({ slots: [] as any[], index: 0 }));
vi.mock('react', async () => ({
  ...(await vi.importActual<typeof import('react')>('react')),
  useMemo: (fn: () => unknown) => fn(),
  useEffect: vi.fn(),
  useState: (initial: any) => {
    const i = h.index++;
    const slot = (h.slots[i] ??= { value: typeof initial === 'function' ? initial() : initial });
    return [
      slot.value,
      (next: any) => {
        slot.value = typeof next === 'function' ? next(slot.value) : next;
      },
    ];
  },
}));
vi.mock('react-native', () => ({
  View: 'View',
  Pressable: 'Pressable',
  Switch: 'Switch',
  Platform: { OS: 'ios', select: (v: any) => v.ios ?? v.default },
  StyleSheet: { create: (v: any) => v, hairlineWidth: 1 },
}));
vi.mock('@expo/ui/community/datetime-picker', () => ({ DateTimePicker: 'DateTimePicker' }));
vi.mock('@/components/app-icon', () => ({ AppIcon: 'SymbolView' }));
vi.mock('./business-logo', () => ({ BusinessLogo: 'BusinessLogo' }));
vi.mock('./business-workspace-sheet', () => ({ BusinessWorkspaceSheet: 'BusinessWorkspaceSheet' }));
vi.mock('./themed-text', () => ({ ThemedText: 'ThemedText' }));
vi.mock('@/hooks/use-theme', () => ({ useTheme: () => ({}) }));
vi.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => 'dark' }));
vi.mock('@/lib/haptics', () => ({ haptics: { selection: vi.fn() } }));
function nodes(n: any): any[] {
  return !n ? [] : Array.isArray(n) ? n.flatMap(nodes) : [n, ...nodes(n.props?.children)];
}
function render(fn: () => any) {
  h.index = 0;
  return fn();
}
beforeEach(() => {
  h.slots = [];
  h.index = 0;
});

it.each([
  [6, 6],
  [8, 4],
  [13, 5],
  [30, 6],
])('keeps a %i-stamp card in stable rows of %i without waiting for layout', (target, columns) => {
  const tree = RewardProgramCard({
    name: 'Visit rewards',
    description: 'A reward for returning',
    type: 'visits',
    target,
    enrollment: true,
  });
  const grid = nodes(tree).find(
    (n) => n.props?.accessibilityLabel === `0 of ${target} visits toward your next reward`,
  );
  const rows = grid.props.children;
  expect(rows).toHaveLength(Math.ceil(target / columns));
  expect(rows.every((row: any) => row.props.children.length === columns)).toBe(true);
  const stamps = nodes(grid).filter((n) => n.props?.style?.aspectRatio === 1);
  expect(stamps).toHaveLength(target);
  expect(stamps.every((n) => n.props.style.flex === 1)).toBe(true);
  expect(
    nodes(tree).some(
      (n) => typeof n.props?.children === 'string' && n.props.children.includes('more visits'),
    ),
  ).toBe(false);
});

it('keeps editor children present across collapse and hides them from accessibility while closed', () => {
  const draft = <input defaultValue="Unsaved caption" />;
  const draw = () =>
    render(() => FlowSection({ title: 'Photos', collapsible: true, children: draft }));
  let tree = draw();
  const toggle = () => nodes(tree).find((n) => n.type === 'Pressable');
  expect(toggle().props.accessibilityState.expanded).toBe(false);
  expect(nodes(tree)).toContain(draft);
  expect(nodes(tree).find((n) => n.props?.children === draft).props.importantForAccessibility).toBe(
    'no-hide-descendants',
  );
  toggle().props.onPress();
  tree = draw();
  expect(toggle().props.accessibilityState.expanded).toBe(true);
  expect(nodes(tree).find((n) => n.props?.children === draft).props.style.display).toBe('flex');
  toggle().props.onPress();
  tree = draw();
  expect(nodes(tree)).toContain(draft);
  expect(toggle().props.accessibilityState.expanded).toBe(false);
});

it('shows a weekly summary and reveals only the selected day’s time controls', () => {
  const hours = [1, 2].map((day) => ({
    day_of_week: day,
    interval_number: 1,
    opens_at: '09:00:00',
    closes_at: '17:00:00',
    is_closed: false,
  }));
  const draw = () =>
    render(() =>
      HoursEditor({
        colors: Colors.dark,
        accent: '#89C9A2',
        hours,
        canEdit: true,
        saving: false,
        onSave: vi.fn(),
      }),
    );
  let tree = draw();
  const day = (name: string) =>
    nodes(tree).find((n) => n.props?.accessibilityLabel === `Edit ${name} hours`);
  expect(day('Monday').props.accessibilityState.expanded).toBe(false);
  day('Monday').props.onPress();
  tree = draw();
  expect(day('Monday').props.accessibilityState.expanded).toBe(true);
  day('Tuesday').props.onPress();
  tree = draw();
  expect(day('Monday').props.accessibilityState.expanded).toBe(false);
  expect(day('Tuesday').props.accessibilityState.expanded).toBe(true);
});

it('opening a closed day reveals its time controls and preserves the permission lock', () => {
  const draw = (canEdit = true) =>
    render(() =>
      HoursEditor({
        colors: Colors.dark,
        accent: '#89C9A2',
        hours: [],
        canEdit,
        saving: false,
        onSave: vi.fn(),
      }),
    );
  let tree = draw();
  const toggle = () => nodes(tree).find((n) => n.props?.accessibilityLabel === 'Monday open');
  toggle().props.onValueChange(true);
  tree = draw();
  expect(toggle().props.value).toBe(true);
  expect(
    nodes(tree).find((n) => n.props?.accessibilityLabel === 'Edit Monday hours').props
      .accessibilityState.expanded,
  ).toBe(true);
  tree = draw(false);
  expect(toggle().props.disabled).toBe(true);
});

it('never labels a synthetic unsaved week as saved', () => {
  const tree = render(() => HoursEditor({ colors: Colors.dark, accent: '#89C9A2', hours: [], canEdit: true, saving: false, onSave: vi.fn() }));
  expect(nodes(tree).some(n => n.props?.children === 'Hours saved')).toBe(false);
  expect(nodes(tree).some(n => n.props?.children === 'Save hours')).toBe(true);
});
