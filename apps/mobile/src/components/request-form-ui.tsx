import { AppIcon } from '@/components/app-icon';
import { useState, type ReactNode } from 'react';
import { Pressable, View, type TextInputProps } from 'react-native';
import { AppTextInput as TextInput } from '@/components/app-text-input';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';
import { BusinessLogo } from './business-logo';
import { FlowProgress } from './flow-layout';

export function RequestBusinessHeader({
  name,
  review = false,
}: {
  name: string;
  review?: boolean;
}) {
  const c = useTheme();
  return (
    <View
      style={{
        borderRadius: 20,
        backgroundColor: c.backgroundElement,
        borderWidth: 1,
        borderColor: c.divider,
        padding: 16,
        gap: 18,
      }}
    >
      <View
        style={{
          padding: 0,
          gap: 14,
          backgroundColor: c.backgroundElement,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <BusinessLogo name={name} size={44} decorative />
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
            <ThemedText type="caption" themeColor="textSecondary">
              YOUR REQUEST GOES TO
            </ThemedText>
            <ThemedText type="card">{name}</ThemedText>
          </View>
        </View>
        <FlowProgress labels={['Details', 'Review']} current={review ? 1 : 0} />
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: c.divider,
            paddingTop: 12,
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 8,
          }}
        >
          <AppIcon name="lock" size={17} tintColor={c.textSecondary} />
          <ThemedText type="small" themeColor="textSecondary" style={{ flex: 1, minWidth: 0 }}>
            Private to this business · Replies to your account email
          </ThemedText>
        </View>
      </View>
    </View>
  );
}
export function RequestSection({
  number,
  title,
  detail,
  children,
}: {
  number: string;
  title: string;
  detail?: string;
  children: ReactNode;
}) {
  const c = useTheme();
  return (
    <View
      style={{
        backgroundColor: c.backgroundElement,
        borderWidth: 1,
        borderColor: c.divider,
        borderRadius: 20,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 18,
          borderBottomWidth: 1,
          borderBottomColor: c.divider,
        }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 10,
            backgroundColor: c.backgroundSelected,
          }}
        >
          {number === '✓' ? (
            <AppIcon name="check" size={18} tintColor={c.accent} />
          ) : (
            <ThemedText type="smallBold" themeColor="accent">
              {number}
            </ThemedText>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <ThemedText type="card">{title}</ThemedText>
          {!!detail && (
            <ThemedText type="caption" themeColor="textSecondary">
              {detail}
            </ThemedText>
          )}
        </View>
      </View>
      <View style={{ padding: 18, gap: 20 }}>{children}</View>
    </View>
  );
}
export function RequestFieldLabel({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  const c = useTheme();
  return (
    <View style={{ gap: 9 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <ThemedText type="smallBold" style={{ flex: 1, minWidth: 0 }}>
          {label}
        </ThemedText>
        <View
          style={{
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 5,
            backgroundColor: required ? c.backgroundSelected : 'transparent',
          }}
        >
          <ThemedText
            type="caption"
            themeColor={required ? 'accent' : 'textSecondary'}
            style={{ fontSize: 11, lineHeight: 16 }}
          >
            {required ? 'Required' : 'Optional'}
          </ThemedText>
        </View>
      </View>
      {children}
    </View>
  );
}
export function RequestInput({ style, onFocus, onBlur, ...props }: TextInputProps) {
  const c = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      {...props}
      placeholderTextColor={c.textSecondary}
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
          minHeight: 50,
          borderWidth: 1,
          borderColor: focused ? c.accent : c.divider,
          borderRadius: 12,
          padding: 14,
          fontSize: 16,
          lineHeight: 22,
          backgroundColor: c.background,
          color: c.text,
          textAlignVertical: props.multiline ? 'top' : 'center',
          opacity: props.editable === false ? 0.6 : 1,
        },
        style,
      ]}
    />
  );
}
export function RequestChoiceTiles({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: readonly string[];
  value: string | undefined;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const c = useTheme();
  const compact = options.every((option) => option.length <= 18);
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
    >
      {options.map((option) => {
        const selected = value === option;
        return (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityLabel={`${label}: ${option}`}
            accessibilityState={{ checked: selected, disabled }}
            disabled={disabled}
            onPress={() => onChange(option)}
            style={({ pressed }) => ({
              flexBasis: compact ? '47%' : '100%',
              flexGrow: 1,
              minHeight: 50,
              borderWidth: 1,
              borderColor: selected ? c.accent : c.divider,
              borderRadius: 12,
              backgroundColor: selected ? c.backgroundSelected : c.background,
              flexDirection: 'row',
              alignItems: 'center',
              padding: 12,
              gap: 10,
              opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
            })}
          >
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                borderWidth: selected ? 5 : 1.5,
                borderColor: selected ? c.accent : c.textSecondary,
              }}
            />
            <ThemedText type="smallBold" style={{ flex: 1 }}>
              {option}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}
