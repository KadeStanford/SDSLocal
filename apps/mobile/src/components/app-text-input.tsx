import { forwardRef, useState } from 'react';
import { TextInput as NativeTextInput, type TextInputProps, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

export type AppTextInputHandle = NativeTextInput;
export type AppTextInputProps = TextInputProps & {
  variant?: 'field' | 'inline';
  invalid?: boolean;
};

/** Outlined fields and unboxed inline text; forwards native refs, keyboard options and events. */
export const AppTextInput = forwardRef<NativeTextInput, AppTextInputProps>(function AppTextInput(
  { style, variant = 'field', invalid = false, onFocus, onBlur, editable, multiline, ...props },
  ref,
) {
  const c = useTheme();
  const [focused, setFocused] = useState(false);
  const inline = variant === 'inline';
  const existing = StyleSheet.flatten(style);
  const hasError =
    invalid || existing?.borderColor === c.destructive || existing?.borderColor === c.errorText;
  return (
    <NativeTextInput
      {...props}
      ref={ref}
      editable={editable}
      multiline={multiline}
      selectionColor={c.accent}
      placeholderTextColor={c.textMuted}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={[
        {
          fontSize: 16,
          minHeight: multiline ? 108 : 52,
          padding: 14,
          textAlignVertical: multiline ? 'top' : 'center',
        },
        style,
        {
          color: c.text,
          backgroundColor: inline ? 'transparent' : c.inputSurface,
          borderWidth: inline ? 0 : 1,
          borderColor: hasError ? c.errorText : focused ? c.accent : c.inputBorder,
          borderRadius: inline ? 0 : 12,
          opacity: editable === false ? 0.6 : (existing?.opacity ?? 1),
          ...(inline ? { padding: 0, paddingHorizontal: 0, paddingVertical: 0 } : {}),
        },
      ]}
    />
  );
});
