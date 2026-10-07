import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { themeColors } from '@sds/design-tokens';
import { EmailCodeVerification } from './email-code-verification';

const captured = vi.hoisted(() => ({
  inputs: [] as {
    onChangeText: (text: string) => void;
    editable: boolean;
    autoComplete: string;
    textContentType: string;
    accessibilityLabel: string;
  }[],
  actions: [] as { onPress: () => void; disabled: boolean; accessibilityLabel: string }[],
}));
vi.mock('react-native', async () => {
  const web = await vi.importActual<typeof import('react-native-web')>('react-native-web');
  return {
    ...web,
    TextInput: (props: (typeof captured.inputs)[number]) => {
      captured.inputs.push(props);
      return null;
    },
    Pressable: (props: (typeof captured.actions)[number] & { children: ReactNode }) => {
      captured.actions.push(props);
      return createElement(web.View, null, props.children);
    },
  };
});
vi.mock('@/hooks/use-theme', () => ({ useTheme: () => themeColors.light }));
vi.mock('@/components/app-icon', () => ({ AppIcon: () => null }));

it('keeps paste, autofill, and changing the destination on one accessible input', () => {
  captured.inputs.length = 0;
  captured.actions.length = 0;
  const onChange = vi.fn();
  const onChangeEmail = vi.fn();
  renderToStaticMarkup(
    <EmailCodeVerification
      email="kade20413@gmail.com"
      value=""
      onChange={onChange}
      onChangeEmail={onChangeEmail}
      onSubmit={() => {}}
      inputRef={null}
    />,
  );
  expect(captured.inputs).toHaveLength(1);
  const input = captured.inputs[0]!;
  expect(input).toMatchObject({
    editable: true,
    autoComplete: 'one-time-code',
    textContentType: 'oneTimeCode',
    accessibilityLabel: '6-digit sign-in code',
  });
  input.onChangeText('123 456');
  expect(onChange).toHaveBeenLastCalledWith('123456');
  input.onChangeText('12a-34 567');
  expect(onChange).toHaveBeenLastCalledWith('123456');
  input.onChangeText('');
  expect(onChange).toHaveBeenLastCalledWith('');
  captured.actions
    .find((action) => action.accessibilityLabel === 'Change email address')!
    .onPress();
  expect(onChangeEmail).toHaveBeenCalledOnce();
});

it('locks both the code and destination while verification is in progress', () => {
  captured.inputs.length = 0;
  captured.actions.length = 0;
  renderToStaticMarkup(
    <EmailCodeVerification
      email="kade20413@gmail.com"
      value="123456"
      onChange={() => {}}
      onChangeEmail={() => {}}
      onSubmit={() => {}}
      inputRef={null}
      disabled
    />,
  );
  expect(captured.inputs[0]!.editable).toBe(false);
  expect(captured.actions[0]!.disabled).toBe(true);
});
