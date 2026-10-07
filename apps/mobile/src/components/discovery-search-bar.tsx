import { View, Pressable } from 'react-native';
import { AppTextInput as TextInput } from '@/components/app-text-input';
import { SymbolView } from 'expo-symbols';
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
            minHeight: 48,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingLeft: 12,
            paddingRight: query ? 0 : 12,
            borderRadius: 12,
            backgroundColor: c.background,
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
            style={{ flex: 1, minWidth: 0, minHeight: 48, color: c.text, fontSize: 15 }}
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
        </View>
        <CustomerAction label={active ? `Filters (${active})` : 'Filters'} onPress={onFilters} />
      </View>
      {suggestions}
      {!!count && !suggestions && (
        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={onBrandSurface ? { color: '#F4F2E9' } : undefined}
        >
          {count}
          {summary ? ` · ${summary}` : ''}
        </ThemedText>
      )}
    </View>
  );
}
