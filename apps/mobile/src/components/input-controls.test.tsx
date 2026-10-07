import { beforeEach, expect, it, vi } from 'vitest';
import { DateField } from './date-field';
import { DatePickerControl } from './date-picker-control.web';
import { EventFilterSheet } from './event-filter-sheet';
import { RequestQuestions } from './request-question-fields';
import { dateInputValue, parseDateInput } from '@/lib/date-input';

const state = vi.hoisted(() => ({ slots: [] as any[], index: 0 }));
vi.mock('react', async () => ({
  ...(await vi.importActual<typeof import('react')>('react')),
  useState: (initial: any) => {
    const i = state.index++;
    if (!(i in state.slots)) state.slots[i] = typeof initial === 'function' ? initial() : initial;
    return [
      state.slots[i],
      (next: any) => {
        state.slots[i] = typeof next === 'function' ? next(state.slots[i]) : next;
      },
    ];
  },
}));
vi.mock('react-native', () => ({ View: 'View', Pressable: 'Pressable' }));
vi.mock('expo-symbols', () => ({ SymbolView: 'SymbolView' }));
vi.mock('./date-picker-control', () => ({ DatePickerControl: 'DatePickerControl' }));
vi.mock('./app-text-input', () => ({ AppTextInput: 'AppTextInput' }));
vi.mock('./merchant-ui', () => ({
  MerchantSheet: 'MerchantSheet',
  MerchantButton: 'MerchantButton',
}));
vi.mock('./themed-text', () => ({ ThemedText: 'ThemedText' }));
vi.mock('./choice-picker', () => ({ ChoicePicker: 'ChoicePicker' }));
vi.mock('./request-form-ui', () => ({
  RequestChoiceTiles: 'RequestChoiceTiles',
  RequestFieldLabel: 'RequestFieldLabel',
  RequestInput: 'RequestInput',
}));
vi.mock('@/hooks/use-theme', () => ({ useTheme: () => ({}) }));
function nodes(n: any): any[] {
  return !n ? [] : Array.isArray(n) ? n.flatMap(nodes) : [n, ...nodes(n.props?.children)];
}
function draw(fn: () => any) {
  state.index = 0;
  return fn();
}
beforeEach(() => {
  state.slots = [];
  state.index = 0;
});

it.each([
  ['email', 'email-address', 'email'],
  ['phone', 'phone-pad', 'tel'],
  ['url', 'url', 'url'],
] as const)(
  'explicit %s questions offer the matching keyboard and autofill without changing the answer',
  (type, keyboardType, autoComplete) => {
    const change = vi.fn();
    const tree = RequestQuestions({
      fields: [{ id: 'contact', type, label: 'Contact', required: false, options: [] }],
      answers: {},
      onChange: change,
    });
    const input = nodes(tree).find((n) => n.type === 'RequestInput');
    expect(input.props).toMatchObject({ keyboardType, autoComplete, autoCorrect: false });
    input.props.onChangeText('0123456789');
    expect(change).toHaveBeenCalledWith({ contact: '0123456789' });
  },
);

it('date selection is a draft until confirmed; dismiss preserves an empty answer', () => {
  const change = vi.fn();
  const render = () =>
    draw(() => DateField({ label: 'Preferred date', value: '', onChange: change }));
  let tree = render();
  nodes(tree)
    .find((n) => n.type === 'Pressable')
    .props.onPress();
  tree = render();
  expect(change).not.toHaveBeenCalled();
  nodes(tree)
    .find((n) => n.type === 'DatePickerControl')
    .props.onChange(parseDateInput('2026-10-03'));
  tree = render();
  const sheet = nodes(tree).find((n) => n.type === 'MerchantSheet');
  sheet.props.onClose();
  tree = render();
  expect(change).not.toHaveBeenCalled();
  nodes(tree)
    .find((n) => n.type === 'Pressable')
    .props.onPress();
  tree = render();
  nodes(tree)
    .find((n) => n.type === 'DatePickerControl')
    .props.onChange(parseDateInput('2026-10-04'));
  tree = render();
  nodes(nodes(tree).find((n) => n.type === 'MerchantSheet').props.footer)
    .find((n) => n.props?.label === 'Use this date')
    .props.onPress();
  expect(change).toHaveBeenCalledExactlyOnceWith('2026-10-04');
});

it('optional dates can be cleared; required dates cannot and disabled controls stay disabled', () => {
  const change = vi.fn();
  let tree = draw(() => DateField({ label: 'Date', value: '2026-10-03', onChange: change }));
  nodes(nodes(tree).find((n) => n.type === 'MerchantSheet').props.footer)
    .find((n) => n.props?.label === 'Clear date')
    .props.onPress();
  expect(change).toHaveBeenCalledWith('');
  tree = draw(() =>
    DateField({
      label: 'Date',
      value: '2026-10-03',
      onChange: change,
      required: true,
      disabled: true,
    }),
  );
  expect(nodes(tree).find((n) => n.type === 'Pressable').props.disabled).toBe(true);
  expect(
    nodes(nodes(tree).find((n) => n.type === 'MerchantSheet').props.footer).some(
      (n) => n.props?.label === 'Clear date',
    ),
  ).toBe(false);
});

it('request date questions use a date field while flexible timing stays outside this conversion', () => {
  const change = vi.fn();
  const tree = RequestQuestions({
    fields: [{ id: 'date', type: 'date', label: 'Preferred date', required: false, options: [] }],
    answers: { notes: 'Keep this' },
    onChange: change,
  });
  const field = nodes(tree).find((n) => n.type === DateField);
  field.props.onChange('2026-10-03');
  expect(change).toHaveBeenCalledWith({ notes: 'Keep this', date: '2026-10-03' });
  expect(nodes(tree).some((n) => n.type === 'RequestInput')).toBe(false);
});

it('web dates use a date input and keep the selected local calendar date', () => {
  const change = vi.fn(),
    node = DatePickerControl({ value: parseDateInput('2026-10-03')!, onChange: change });
  expect(node.props.type).toBe('date');
  node.props.onChange({ target: { value: '2026-12-31' } } as any);
  expect(dateInputValue(change.mock.calls[0]![0])).toBe('2026-12-31');
});

it('filter rows expose selection, trim search and keep All areas available for recovery', () => {
  const select = vi.fn();
  const props = {
    kind: 'city' as const,
    value: 'Hammond',
    options: ['Covington', 'Hammond'],
    query: ' HAM ',
    onQueryChange: vi.fn(),
    onSelect: select,
    onClose: vi.fn(),
  };
  let tree = EventFilterSheet(props);
  const choices = nodes(tree).filter((n) => n.props?.accessibilityRole === 'radio');
  expect(choices.map((n) => n.props.accessibilityLabel)).toEqual(['All areas', 'Hammond']);
  expect(choices[1].props.accessibilityState.checked).toBe(true);
  choices[0].props.onPress();
  expect(select).toHaveBeenCalledWith('');
  tree = EventFilterSheet({ ...props, query: 'no match' });
  expect(nodes(tree).filter((n) => n.props?.accessibilityRole === 'radio')).toHaveLength(1);
});
