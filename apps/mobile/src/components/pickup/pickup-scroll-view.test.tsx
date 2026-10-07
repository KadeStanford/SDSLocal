import { createElement, type RefObject } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ScrollViewProps } from 'react-native';
import { beforeEach, expect, it, vi } from 'vitest';
import { PickupScrollView } from './pickup-scroll-view';

const native = vi.hoisted(() => ({
  props: {} as ScrollViewProps,
  scrollTo: vi.fn(),
}));
vi.mock('react-native', () => ({
  ScrollView: (props: ScrollViewProps & { ref: RefObject<unknown> }) => {
    native.props = props;
    props.ref.current = { scrollTo: native.scrollTo };
    return null;
  },
}));

beforeEach(() => native.scrollTo.mockClear());

function render(initialOffset: number) {
  const onOffsetChange = vi.fn();
  renderToStaticMarkup(
    createElement(PickupScrollView, { getSavedOffset: () => initialOffset, onOffsetChange }),
  );
  return onOffsetChange;
}
function resize(height: number) {
  native.props.onContentSizeChange?.(390, height);
}
function scrollToOffset(y: number) {
  native.props.onScroll?.({ nativeEvent: { contentOffset: { x: 0, y } } } as never);
}

it.each(['Request cancellation', 'Contact the business'])(
  'keeps a scrolled order in place when %s expands and closes',
  () => {
    const save = render(0);
    resize(1800);
    scrollToOffset(950);
    resize(2050); // Help form opens.
    resize(2200); // Multiline message grows.
    resize(1800); // Help form closes.
    expect(save).toHaveBeenLastCalledWith(950);
    expect(native.scrollTo).not.toHaveBeenCalled();
  },
);

it('restores a revisited checkout page once, without overriding later scrolling or refreshes', () => {
  const save = render(420);
  resize(1500);
  expect(native.scrollTo).toHaveBeenCalledExactlyOnceWith({ y: 420, animated: false });
  scrollToOffset(780);
  resize(1700);
  resize(1500);
  expect(save).toHaveBeenLastCalledWith(780);
  expect(native.scrollTo).toHaveBeenCalledTimes(1);
});

it('lets a user gesture take priority over delayed initial layout', () => {
  render(420);
  native.props.onScrollBeginDrag?.({} as never);
  resize(1800);
  expect(native.scrollTo).not.toHaveBeenCalled();
});
