import type { Ref } from 'react';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { AppTextInput as TextInput, type AppTextInputHandle } from '@/components/app-text-input';
import { AppIcon as SymbolView } from '@/components/app-icon';
import { useTheme } from '@/hooks/use-theme';
import { CustomerAction } from './customer-ui';
import { ThemedText } from './themed-text';

export function EmailCodeVerification({
  email,
  value,
  onChange,
  onChangeEmail,
  onSubmit,
  inputRef,
  disabled = false,
  onResend,
}: {
  email: string;
  value: string;
  onChange: (value: string) => void;
  onChangeEmail: () => void;
  onSubmit: () => void;
  inputRef: Ref<AppTextInputHandle>;
  disabled?: boolean;
  onResend?: () => void;
}) {
  const c = useTheme();
  const [seconds, setSeconds] = useState(60);
  useEffect(() => { const timer = setInterval(() => setSeconds(n => Math.max(0, n - 1)), 1000); return () => clearInterval(timer); }, []);
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 28 }}>
      <View style={{ gap: 16 }}>
        <View
          style={{
            width: 52,
            height: 52,
            backgroundColor: c.backgroundSelected,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SymbolView name="envelope" tintColor={c.accent} style={{ width: 26, height: 26 }} />
        </View>
        <View style={{ gap: 8 }}>
          <ThemedText type="title" style={{ fontSize: 28, lineHeight: 34, letterSpacing: -0.6 }}>
            Verify your email
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            Enter the six-digit code we sent to you.
          </ThemedText>
        </View>
      </View>
      <View
        style={{
          padding: 16,
          borderRadius: 12,
          backgroundColor: c.backgroundElement,
          borderWidth: 1,
          borderColor: c.divider,
          gap: 12,
        }}
      >
        <ThemedText type="caption" themeColor="textSecondary">
          Signing in as
        </ThemedText>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <ThemedText type="smallBold" style={{ flexGrow: 1, flexShrink: 1 }}>
            {email}
          </ThemedText>
          <CustomerAction
            label="Change"
            accessibilityLabel="Change email address"
            onPress={onChangeEmail}
            disabled={disabled}
          />
        </View>
      </View>
      <View style={{ gap: 12 }}>
        <ThemedText type="smallBold">Verification code</ThemedText>
        <View style={{ position: 'relative', minHeight: 60 }}>
          <View
            pointerEvents="none"
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ flexDirection: 'row', gap: 8 }}
          >
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <View
                key={index}
                style={{
                  flex: 1,
                  minWidth: 0,
                  minHeight: 60,
                  borderRadius: 10,
                  borderWidth: 1.5,
                  borderColor:
                    focused && index === Math.min(value.length, 5) ? c.accent : c.divider,
                  backgroundColor: c.backgroundElement,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ThemedText
                  style={{ fontSize: 26, lineHeight: 34, fontWeight: '600', color: c.text }}
                >
                  {value[index] ?? '\u2013'}
                </ThemedText>
              </View>
            ))}
          </View>
          <TextInput
            ref={inputRef}
            accessibilityLabel="6-digit sign-in code"
            accessibilityHint="Enter or paste the verification code from your email"
            value={value}
            editable={!disabled}
            onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            autoCorrect={false}
            caretHidden
            selectionColor="transparent"
            returnKeyType="done"
            onSubmitEditing={onSubmit}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={[
              { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
              { color: 'transparent', backgroundColor: 'transparent', fontSize: 26 },
            ]}
          />
        </View>
        {onResend && <CustomerAction label={seconds ? `Resend in ${seconds}s` : "Resend code"} disabled={disabled || seconds > 0} onPress={() => { setSeconds(60); onResend(); }} />}
        <ThemedText type="small" themeColor="textSecondary">
          You can paste the full code or use autofill.
        </ThemedText>
      </View>
    </View>
  );
}
