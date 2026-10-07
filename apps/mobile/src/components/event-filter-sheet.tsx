import { Pressable, View } from 'react-native';
import { AppIcon as SymbolView } from '@/components/app-icon';
import { useTheme } from '@/hooks/use-theme';
import { AppTextInput } from './app-text-input';
import { MerchantSheet } from './merchant-ui';
import { ThemedText } from './themed-text';

export function EventFilterSheet({
  kind,
  value,
  options,
  query,
  onQueryChange,
  onSelect,
  onClose,
}: {
  kind: 'city' | 'category' | null;
  value: string;
  options: readonly string[];
  query: string;
  onQueryChange: (query: string) => void;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  const c = useTheme();
  const area = kind === 'city';
  const filtered = options.filter((option) =>
    option.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const row = (option: string, label: string, last = false) => {
    const selected = option === value;
    return (
      <Pressable
        key={option}
        accessibilityRole="radio"
        accessibilityLabel={label}
        accessibilityState={{ checked: selected }}
        onPress={() => onSelect(option)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 15,
          paddingHorizontal: 16,
          minHeight: 54,
          borderBottomWidth: last ? 0 : 0.5,
          borderBottomColor: c.divider,
          backgroundColor: selected || pressed ? c.backgroundSelected : 'transparent',
        })}
      >
        <ThemedText style={{ flex: 1 }} type={selected ? 'smallBold' : 'small'}>
          {label}
        </ThemedText>
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            borderWidth: selected ? 0 : 1.5,
            borderColor: c.textSecondary,
            backgroundColor: selected ? c.accent : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {selected && (
            <SymbolView
              name="checkmark"
              tintColor={c.background}
              style={{ width: 13, height: 13 }}
            />
          )}
        </View>
      </Pressable>
    );
  };
  return (
    <MerchantSheet
      visible={kind !== null}
      title={area ? 'Event area' : 'Event category'}
      onClose={onClose}
    >
      <ThemedText type="small" themeColor="textSecondary">
        {area
          ? 'Find something happening near you.'
          : 'Choose the kind of place hosting your event.'}
      </ThemedText>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 12,
          borderRadius: 12,
          backgroundColor: c.backgroundSelected,
        }}
      >
        <SymbolView
          name="magnifyingglass"
          tintColor={c.textSecondary}
          style={{ width: 19, height: 19 }}
        />
        <AppTextInput
          variant="inline"
          accessibilityLabel={area ? 'Search areas' : 'Search categories'}
          placeholder={area ? 'Search cities or areas' : 'Search categories'}
          value={query}
          onChangeText={onQueryChange}
          autoCorrect={false}
          returnKeyType="search"
          style={{
            flex: 1,
            minHeight: 48,
            paddingHorizontal: 0,
            backgroundColor: 'transparent',
            color: c.text,
          }}
        />
      </View>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={area ? 'Event area' : 'Event category'}
        style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: c.backgroundElement }}
      >
        {row('', area ? 'All areas' : 'All categories', !filtered.length)}
        {filtered.map((option, i) => row(option, option, i === filtered.length - 1))}
      </View>
      {!filtered.length && (
        <ThemedText type="small" themeColor="textSecondary">
          No matches. Try another search or choose {area ? 'All areas' : 'All categories'}.
        </ThemedText>
      )}
    </MerchantSheet>
  );
}
