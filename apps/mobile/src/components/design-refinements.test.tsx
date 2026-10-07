import { EventsViewSwitch } from './events-view-switch';
import { beforeEach, expect, it, vi } from 'vitest';
import { themeColors } from '@sds/design-tokens';
import { AppTextInput } from './app-text-input';
import { CustomerCalendar } from './customer-calendar';
import { EventDetailHeading } from './event-detail-heading';

const h = vi.hoisted(() => ({ slots: [] as any[], index: 0 }));
vi.mock('react', async () => ({
  ...(await vi.importActual<typeof import('react')>('react')),
  useState: (initial: any) => {
    const i = h.index++;
    if (!(i in h.slots)) h.slots[i] = typeof initial === 'function' ? initial() : initial;
    return [
      h.slots[i],
      (next: any) => {
        h.slots[i] = typeof next === 'function' ? next(h.slots[i]) : next;
      },
    ];
  },
}));
vi.mock('react-native', () => ({
  TextInput: 'TextInput',
  View: 'View',
  Pressable: 'Pressable',
  StyleSheet: {
    create: (v: any) => v,
    hairlineWidth: 1,
    flatten: (v: any): any =>
      Array.isArray(v)
        ? Object.assign(
            {},
            ...v.filter(Boolean).map((x: any) => (Array.isArray(x) ? Object.assign({}, ...x) : x)),
          )
        : v,
  },
}));
vi.mock('@/hooks/use-theme', () => ({ useTheme: () => themeColors.dark }));
vi.mock('@/hooks/use-merchant-theme', () => ({
  useMerchantTheme: () => ({
    surface: '#1b2b22',
    border: '#35493d',
    text: '#fff',
    secondary: '#aec0b4',
  }),
}));
vi.mock('./horizontal-scroll-row', () => ({ HorizontalScrollRow: 'HorizontalScrollRow' }));
vi.mock('./themed-text', () => ({ ThemedText: 'ThemedText' }));
vi.mock('./business-identity-row', () => ({ BusinessIdentityRow: 'BusinessIdentityRow' }));
vi.mock('expo-image', () => ({ Image: 'Image' }));
function nodes(n: any): any[] {
  return !n ? [] : Array.isArray(n) ? n.flatMap(nodes) : [n, ...nodes(n.props?.children)];
}
function draw(fn: () => any) {
  h.index = 0;
  return fn();
}
beforeEach(() => {
  h.slots = [];
  h.index = 0;
});

it('filled inputs preserve native refs, editing callbacks, keyboard options and focus handlers', () => {
  const ref = { current: null },
    change = vi.fn(),
    focus = vi.fn(),
    blur = vi.fn();
  const props = {
    value: '12',
    onChangeText: change,
    onFocus: focus,
    onBlur: blur,
    keyboardType: 'decimal-pad',
    autoComplete: 'off',
  };
  const render = () => draw(() => (AppTextInput as any).render(props, ref));
  let tree = render();
  expect(tree.props.ref).toBe(ref);
  expect(tree.props.keyboardType).toBe('decimal-pad');
  expect(tree.props.autoComplete).toBe('off');
  tree.props.onChangeText('15');
  expect(change).toHaveBeenCalledWith('15');
  tree.props.onFocus({ nativeEvent: {} });
  tree = render();
  expect(tree.props.style.at(-1).borderBottomColor).toBe(themeColors.dark.accent);
  expect(tree.props.style.at(-1).backgroundColor).toBe(themeColors.dark.inputSurface);
  expect(focus).toHaveBeenCalledOnce();
  tree.props.onBlur({ nativeEvent: {} });
  tree = render();
  expect(tree.props.style.at(-1).borderBottomColor).toBe('transparent');
  expect(blur).toHaveBeenCalledOnce();
});
it('keeps existing field errors visible and preserves disabled and multiline behavior', () => {
  const tree = draw(() =>
    (AppTextInput as any).render(
      {
        editable: false,
        multiline: true,
        style: { borderColor: themeColors.dark.destructive, minHeight: 140 },
      },
      null,
    ),
  );
  expect(tree.props.editable).toBe(false);
  expect(tree.props.multiline).toBe(true);
  expect(tree.props.style.at(-1)).toMatchObject({
    borderBottomColor: themeColors.dark.errorText,
    opacity: 0.6,
  });
  expect(tree.props.style[1].minHeight).toBe(140);
});
it('inline search text does not add a second filled box inside its search control', () => {
  const tree = draw(() => (AppTextInput as any).render({ variant: 'inline' }, null));
  expect(tree.props.style.at(-1)).toMatchObject({
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
    padding: 0,
  });
});
it('scrolling date bar keeps selected dates visible and uses accessible event counts', () => {
  const select = vi.fn(),
    move = vi.fn(),
    today = vi.fn();
  const tree = CustomerCalendar({
    month: new Date(2026, 8, 1),
    selectedDay: '2026-09-28',
    counts: new Map([['2026-09-28', 12]]),
    onSelectDay: select,
    onChangeMonth: move,
    onToday: today,
  });
  const dates = nodes(tree).filter(
    (n) => n.props?.testID?.startsWith('event-date-') && n.props.testID !== 'event-date-bar',
  );
  expect(dates).toHaveLength(30);
  expect(dates.every((n) => n.props.style.width >= 44 && n.props.style.minHeight >= 44)).toBe(true);
  const selected = dates.find((n) => n.props.accessibilityState.selected);
  expect(selected.props.accessibilityLabel).toContain('12 events');
  dates[28].props.onPress();
  expect(select).toHaveBeenCalledWith('2026-09-29');
  const strip = nodes(tree).find((n) => n.props?.testID === 'event-date-bar');
  expect(strip.props.contentOffset.x).toBeGreaterThan(0);
  nodes(tree)
    .find((n) => n.props?.accessibilityLabel === 'Today')
    .props.onPress();
  expect(today).toHaveBeenCalledOnce();
  nodes(tree)
    .find((n) => n.props?.accessibilityLabel === 'Next month')
    .props.onPress();
  expect(move).toHaveBeenCalledWith(1);
});
it('Events view switch exposes both views and selected state', () => {
  const change = vi.fn();
  let tree = EventsViewSwitch({ all: false, onChange: change });
  const tabs = nodes(tree).filter((n) => n.props?.accessibilityRole === 'tab');
  expect(tabs[0].props.accessibilityState.selected).toBe(true);
  tabs[1].props.onPress();
  expect(change).toHaveBeenCalledWith(true);
  tree = EventsViewSwitch({ all: true, onChange: change });
  const allTabs = nodes(tree).filter((n) => n.props?.accessibilityRole === 'tab');
  expect(allTabs[1].props.accessibilityState.selected).toBe(true);
  allTabs[0].props.onPress();
  expect(change).toHaveBeenLastCalledWith(false);
});
it('event heading fills the cover frame and exposes directions with the full address', () => {
  const directions = vi.fn(),
    open = vi.fn();
  const tree = draw(() =>
    EventDetailHeading({
      title: 'Coffee tasting',
      businessName: 'Juniper',
      color: '#17684f',
      image: 'file:///photo.jpg',
      when: 'Oct 3',
      where: '420 Cypress Street, Hammond',
      onDirections: directions,
      onOpenPhoto: open,
    }),
  );
  expect(nodes(tree).find((n) => n.type === 'Image').props.contentFit).toBe('cover');
  nodes(tree)
    .find((n) => n.props?.accessibilityLabel === 'Directions to 420 Cypress Street, Hammond')
    .props.onPress();
  nodes(tree)
    .find((n) => n.props?.accessibilityLabel === 'View event photo for Coffee tasting')
    .props.onPress();
  expect(directions).toHaveBeenCalledOnce();
  expect(open).toHaveBeenCalledOnce();
});
it('online events do not show a directions action without a destination', () => {
  const tree = draw(() =>
    EventDetailHeading({
      title: 'Workshop',
      businessName: 'Juniper',
      color: '#17684f',
      when: 'Oct 3',
      where: 'Online event',
    }),
  );
  expect(nodes(tree).some((n) => n.props?.accessibilityLabel?.startsWith('Directions'))).toBe(
    false,
  );
});
