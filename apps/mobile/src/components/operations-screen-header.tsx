import { PageHeader } from '@/components/page-header';
import { AppChrome } from './app-chrome';
import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { AppIcon as SymbolView } from '@/components/app-icon';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

import { MerchantSheet } from './merchant-ui';
export function OperationsScreenHeader({
  title,
  subtitle,
  businesses,
  selected,
  onChange,
  action,
}: {
  title: string;
  subtitle: string;
  businesses: readonly { id: string; name: string }[];
  selected: string | undefined;
  onChange: (id: string) => void;
  action?: ReactNode;
}) {
  const c = useTheme(),
    [open, setOpen] = useState(false),
    business = businesses.find((b) => b.id === selected);
  const many = businesses.length > 1;
  const context = (
    <>
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 13,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: c.backgroundSelected,
        }}
      >
        <ThemedText type="smallBold" themeColor="accent">
          {business?.name
            .split(/\s+/)
            .filter((w) => /^[a-z]/i.test(w))
            .slice(0, 2)
            .map((w) => w[0])
            .join('')}
        </ThemedText>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <ThemedText
          style={{ fontSize: 10, lineHeight: 14, letterSpacing: 1, color: c.textSecondary }}
        >
          {many ? 'SELECTED BUSINESS' : 'YOUR BUSINESS'}
        </ThemedText>
        <ThemedText type="smallBold">{business?.name}</ThemedText>
      </View>
      {many && (
        <SymbolView
          name="chevron.right"
          tintColor={c.textSecondary}
          style={{ width: 16, height: 16 }}
        />
      )}
    </>
  );
  return (
    <View style={{ gap: 20 }}>
      <PageHeader />
      <AppChrome inline showModeSwitch={false} />
      <View style={{ gap: 7 }}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <ThemedText type="title" style={{ flex: 1, fontSize: 28, lineHeight: 34 }}>
            {title}
          </ThemedText>
          {action}
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {subtitle}
        </ThemedText>
      </View>
      {business &&
        (many ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Change business: ${business.name}`}
            onPress={() => setOpen(true)}
            style={{
              flexDirection: 'row',
              gap: 12,
              alignItems: 'center',
              padding: 15,
              borderWidth: 1,
              borderColor: c.divider,
              borderRadius: 17,
              backgroundColor: c.backgroundElement,
            }}
          >
            {context}
          </Pressable>
        ) : (
          <View
            style={{
              flexDirection: 'row',
              gap: 12,
              alignItems: 'center',
              padding: 15,
              borderWidth: 1,
              borderColor: c.divider,
              borderRadius: 17,
              backgroundColor: c.backgroundElement,
            }}
          >
            {context}
          </View>
        ))}
      <MerchantSheet visible={open} title="Choose business" onClose={() => setOpen(false)}>
        {businesses.map((b) => (
          <Pressable
            key={b.id}
            accessibilityRole="radio"
            accessibilityState={{ checked: b.id === selected }}
            onPress={() => {
              setOpen(false);
              onChange(b.id);
            }}
            style={{ paddingVertical: 16, borderBottomWidth: 1, borderColor: c.divider }}
          >
            <ThemedText type="smallBold">{b.name}</ThemedText>
          </Pressable>
        ))}
      </MerchantSheet>
    </View>
  );
}
