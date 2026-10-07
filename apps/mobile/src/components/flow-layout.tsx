import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';

/** Shared sections for the deeper editors and status screens. */
export function FlowSection({
  title,
  description,
  children,
  collapsible = false,
  initiallyOpen = false,
  inset = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  collapsible?: boolean;
  initiallyOpen?: boolean;
  inset?: boolean;
}) {
  const c = useTheme();
  const [open, setOpen] = useState(initiallyOpen);
  const heading = (
    <View style={{ flex: 1, gap: 4 }}>
      <ThemedText type="smallBold" style={{ fontSize: 17 }}>
        {title}
      </ThemedText>
      {!!description && (
        <ThemedText type="small" themeColor="textSecondary">
          {description}
        </ThemedText>
      )}
    </View>
  );
  return (
    <View
      style={{
        backgroundColor: inset ? 'transparent' : c.backgroundElement,
        borderColor: c.divider,
        borderWidth: inset ? 0 : 1,
        borderRadius: inset ? 0 : 18,
        padding: inset ? 0 : 18,
        gap: 16,
      }}
    >
      {collapsible ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen(!open)}
          style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 }}
        >
          {heading}
          <ThemedText style={{ color: c.accent, fontSize: 24 }}>{open ? '−' : '+'}</ThemedText>
        </Pressable>
      ) : (
        heading
      )}
      <View
        style={{ gap: 16, display: !collapsible || open ? 'flex' : 'none' }}
        accessibilityElementsHidden={collapsible && !open}
        importantForAccessibility={collapsible && !open ? 'no-hide-descendants' : 'auto'}
      >
        {children}
      </View>
    </View>
  );
}

export function FlowIdentity({ name, detail }: { name: string; detail?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <FlowAvatar name={name} />
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <ThemedText type="smallBold">{name}</ThemedText>
        {!!detail && (
          <ThemedText type="small" themeColor="textSecondary">
            {detail}
          </ThemedText>
        )}
      </View>
    </View>
  );
}

export function FlowAvatar({ name }: { name: string }) {
  const c = useTheme();
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toLocaleUpperCase();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: c.backgroundSelected,
      }}
    >
      <ThemedText type="smallBold" style={{ color: c.accent }}>
        {initials}
      </ThemedText>
    </View>
  );
}

export function FlowProgress({ labels, current }: { labels: readonly string[]; current: number }) {
  const c = useTheme();
  return (
    <View
      accessibilityLabel={`Step ${current + 1} of ${labels.length}: ${labels[current]}`}
      style={{ gap: 10 }}
    >
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {labels.map((label, i) => (
          <View key={label} style={{ flex: 1, gap: 8 }}>
            <View
              style={{
                height: 4,
                borderRadius: 2,
                backgroundColor: i <= current ? c.accent : c.divider,
              }}
            />
            <ThemedText
              type="caption"
              style={{
                color: i === current ? c.text : c.textSecondary,
                fontWeight: i === current ? '700' : '400',
              }}
            >
              {label}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}
