import { View, Pressable } from 'react-native';
import { AppTextInput as TextInput } from '@/components/app-text-input';
import { AppIcon as SymbolView } from '@/components/app-icon';
import { useTheme } from '@/hooks/use-theme';
import { CustomerAction } from './customer-ui';
import { ThemedText } from './themed-text';
import type { ReactNode } from 'react';
export function DiscoverySearchBar({
  query,
  onQuery,
  onFilters,
  count,
  summary,
  active = 0,
  onBrandSurface = false,
  placeholder = 'Search local businesses',
  accessibilityLabel = 'Search businesses',
  onFocus,
  onSubmit,
  suggestions,
}: {
  query: string;
  onQuery: (value: string) => void;
  onFilters: () => void;
  count?: string | null | undefined;
  summary?: string | undefined;
  active?: number;
  onBrandSurface?: boolean;
  placeholder?: string;
  accessibilityLabel?: string;
  onFocus?: () => void;
  onSubmit?: () => void;
  suggestions?: ReactNode;
}) {
  const c = useTheme();
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: onBrandSurface ? 52 : 48,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingLeft: 12,
            paddingRight: onBrandSurface || query ? 0 : 12,
            borderRadius: onBrandSurface ? 16 : 12,
            backgroundColor: onBrandSurface ? c.backgroundElement : c.background,
            borderWidth: 1,
            borderColor: c.divider,
          }}
        >
          <SymbolView
            name="magnifyingglass"
            tintColor={c.textSecondary}
            style={{ width: 18, height: 18 }}
          />
          <TextInput
            variant="inline"
            accessibilityLabel={accessibilityLabel}
            value={query}
            onChangeText={onQuery}
            onFocus={onFocus}
            onSubmitEditing={onSubmit}
            placeholder={placeholder}
            placeholderTextColor={c.textSecondary}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: onBrandSurface ? 52 : 48,
              color: c.text,
              fontSize: 16,
              lineHeight: 22,
            }}
          />
          {!!query && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => onQuery('')}
              style={{
                minHeight: 44,
                minWidth: 44,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SymbolView
                name="xmark.circle.fill"
                tintColor={c.textSecondary}
                style={{ width: 18, height: 18 }}
              />
            </Pressable>
          )}
          {onBrandSurface && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={active ? `Filters (${active})` : 'Filters'}
              onPress={onFilters}
              style={({ pressed }) => ({
                minWidth: 72,
                minHeight: 44,
                paddingHorizontal: 10,
                paddingVertical: 10,
                borderLeftWidth: 1,
                borderColor: c.divider,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <ThemedText style={{ fontSize: 14, lineHeight: 20, fontWeight: '600' }}>
                {active ? `Filters (${active})` : 'Filters'}
              </ThemedText>
            </Pressable>
          )}
        </View>
        {!onBrandSurface && (
          <CustomerAction label={active ? `Filters (${active})` : 'Filters'} onPress={onFilters} />
        )}
      </View>
      {suggestions}
      {!!count && !suggestions && (
        <ThemedText type="small" themeColor="textSecondary">
          {count}
          {summary ? ` · ${summary}` : ''}
        </ThemedText>
      )}
    </View>
  );
}
